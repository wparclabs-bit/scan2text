"""VLM OCR adapter — OvisOCR2 0.9B (ADR-006) via llama-cpp-python (CPU-only, offline).

Spawns one persistent low-priority worker process that keeps the model and
vision projector (mmproj) loaded. Parents send ONE normalized full-page PNG
per page (no tiling; ADR-006) over a queue; the worker returns Markdown
strings.
"""

from __future__ import annotations

import base64
import logging
import os
import queue
from io import BytesIO
from multiprocessing import Process, Queue
from pathlib import Path
from typing import Any, List

import psutil

from scan2text.models.settings import AppSettings
from scan2text.services.path_service import PathService
from scan2text.services.settings_service import SettingsService

logger = logging.getLogger(__name__)

_VLM_PROMPT = '''\nExtract all readable content from the image in natural human reading order and output the result as a single Markdown document. For charts or images, represent them using an HTML image tag: <img src="images/bbox_{left}_{top}_{right}_{bottom}.jpg" />, where left, top, right, bottom are bounding box coordinates scaled to [0, 1000). Format formulas as LaTeX. Format tables as HTML: <table>...</table>. Transcribe all other text as standard Markdown. Preserve the original text without translation or paraphrasing.'''
OCR_TIMEOUT = "OCR_TIMEOUT"
MODEL_NOT_FOUND = "MODEL_NOT_FOUND"
OCR_FAILED = "OCR_FAILED"
PDF_TOO_MANY_PAGES = "PDF_TOO_MANY_PAGES"

_MAX_IMAGE_EDGE = 2880
_MAX_PIXELS = 4_000_000   # context budget: image tokens ≈ px/1024; keep image + 4096 output within n_ctx 8192
_PDF_RENDER_SCALE = 2.0

_PRIORITY_ATTR = {
    "below_normal": "BELOW_NORMAL_PRIORITY_CLASS",
    "normal": "NORMAL_PRIORITY_CLASS",
    "idle": "IDLE_PRIORITY_CLASS",
}


def _prepare_views(img) -> List[bytes]:
    """Normalize a single-page image to one PNG view respecting ADR-006 caps."""
    from PIL import Image

    w, h = img.size
    longest = max(w, h)
    area = w * h
    scale = 1.0
    if longest > _MAX_IMAGE_EDGE:
        scale = min(scale, _MAX_IMAGE_EDGE / longest)
    if area > _MAX_PIXELS:
        scale = min(scale, (_MAX_PIXELS / area) ** 0.5)
    if scale < 1.0:
        new_w = max(1, int(w * scale))
        new_h = max(1, int(h * scale))
        img = img.resize((new_w, new_h), Image.LANCZOS)
    buf = BytesIO()
    img.save(buf, format="PNG")
    return [buf.getvalue()]


def _shrink_to_png(image_bytes: bytes) -> bytes:
    from PIL import Image

    pil_img = Image.open(BytesIO(image_bytes)).convert("RGB")
    return _prepare_views(pil_img)[0]


def _vlm_worker(
    model_path: str,
    mmproj_path: str,
    n_ctx: int,
    n_threads: int,
    input_queue: Queue,
    output_queue: Queue,
) -> None:
    """Persistent worker: load model + vision projector once, serve OCR tasks.

    Must stay at module level for Windows multiprocessing spawn.
    A failing task is reported as an error dict; the worker keeps living (NFR-05).
    """
    from llama_cpp import Llama
    from llama_cpp.llama_chat_format import MTMDChatHandler

    try:
        handler = MTMDChatHandler(clip_model_path=mmproj_path, verbose=False, use_gpu=False)
        llm = Llama(
            model_path=model_path,
            chat_handler=handler,
            n_ctx=n_ctx,
            n_threads=n_threads,
            n_gpu_layers=0,
            verbose=False,
        )
    except Exception as exc:
        logger.error("VLM load failed: %s", exc)
        while True:
            input_queue.get()
            output_queue.put({
                "error": MODEL_NOT_FOUND,
                "message": f"Model load failed: {exc}",
            })

    while True:
        task = input_queue.get()
        if task.get("action") != "ocr":
            continue
        try:
            texts: List[str] = []
            for raw in task["images"]:
                b64 = base64.b64encode(raw).decode("ascii")
                output = llm.create_chat_completion(
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": _VLM_PROMPT},
                                {
                                    "type": "image_url",
                                    "image_url": {"url": f"data:image/png;base64,{b64}"},
                                },
                            ],
                        }
                    ],
                    max_tokens=task.get("max_tokens", 4096),
                    temperature=0.1,
                    repeat_penalty=1.0,
                )
                texts.append(output["choices"][0]["message"]["content"])
            if len(texts) == 1:
                output_queue.put(texts[0])
            else:
                output_queue.put("\n\n---\n\n".join(texts))
        except Exception as exc:
            logger.error("OCR task failed: %s", exc)
            output_queue.put({
                "error": OCR_FAILED,
                "message": f"OCR failed: {exc}",
            })


class VlmOcrAdapter:
    """OCR adapter backed by a local persistent VLM worker (llama-cpp-python)."""

    def __init__(self) -> None:
        self._settings_service = SettingsService()
        settings: AppSettings = self._settings_service.load()
        paths = PathService()

        self._model_path = str(paths.resolve_model_path(settings.model_path or "models/vlm.gguf"))
        self._mmproj_path = str(paths.resolve_model_path(settings.mmproj_path or "models/mmproj.gguf"))
        self._n_ctx = settings.n_ctx
        self._n_threads = settings.n_threads or settings.cpu_threads or (os.cpu_count() or 1)
        self._timeout = settings.ocr_timeout_seconds
        self._max_pdf_pages = settings.max_pdf_pages

        self._input_queue: Queue = Queue()
        self._output_queue: Queue = Queue()
        self._worker_process = Process(
            target=_vlm_worker,
            args=(
                self._model_path,
                self._mmproj_path,
                self._n_ctx,
                self._n_threads,
                self._input_queue,
                self._output_queue,
            ),
        )
        self._worker_process.daemon = True
        self._worker_process.start()
        prio_attr = _PRIORITY_ATTR.get(settings.worker_priority, "BELOW_NORMAL_PRIORITY_CLASS")
        psutil.Process(self._worker_process.pid).nice(getattr(psutil, prio_attr))

    @property
    def model_path(self) -> str:
        return self._model_path

    def ocr(self, image_path: str) -> str | dict[str, Any]:
        """Submit one file (image or PDF). Returns Markdown or an error dict."""
        path = Path(image_path)
        if path.suffix.lower() == ".pdf":
            images = self._render_pdf(path)
            if isinstance(images, dict):
                return images
        else:
            from PIL import Image

            with Image.open(path) as pil_img:
                images = _prepare_views(pil_img.convert("RGB"))

        self._input_queue.put({"action": "ocr", "images": images, "max_tokens": 4096})
        try:
            return self._output_queue.get(timeout=self._timeout)
        except queue.Empty:
            logger.warning(
                "OCR_TIMEOUT: worker did not return result within %ss for %s",
                self._timeout,
                image_path,
            )
            return {
                "error": OCR_TIMEOUT,
                "message": f"OCR exceeded {self._timeout}s timeout for {image_path}",
                "image_path": image_path,
            }

    def _render_pdf(self, path: Path) -> List[bytes] | dict[str, Any]:
        """Render PDF pages to auto-tiled PNG bytes (FR-06: pixels, not raw PDF)."""
        import pypdfium2 as pdfium

        pdf = pdfium.PdfDocument(str(path))
        page_count = len(pdf)
        if page_count > self._max_pdf_pages:
            return {
                "error": PDF_TOO_MANY_PAGES,
                "message": f"{path.name} has {page_count} pages (max {self._max_pdf_pages}).",
            }
        pages: List[bytes] = []
        for index in range(page_count):
            bitmap = pdf[index].render(scale=_PDF_RENDER_SCALE)
            pages.extend(_prepare_views(bitmap.to_pil().convert("RGB")))
        return pages
