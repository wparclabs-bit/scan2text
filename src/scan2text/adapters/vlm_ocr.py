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

import pypdfium2 as pdfium

from scan2text.models.settings import AppSettings
from scan2text.services.path_service import PathService
from scan2text.utils.cpu_budget import calculate_auto_threads
from scan2text.services.postprocess_service import (
    convert_html_tables_to_gfm,
    extract_and_save_image_crops,
    filter_noise_lines,
)
from scan2text.services.settings_service import SettingsService
from scan2text.services.pdf_service import detect_file_type

logger = logging.getLogger(__name__)

_VLM_PROMPT = '''\nExtract all readable content from the image in natural human reading order and output the result as a single Markdown document. For charts or images, represent them using an HTML image tag: <img src="images/bbox_{left}_{top}_{right}_{bottom}.jpg" />, where left, top, right, bottom are bounding box coordinates scaled to [0, 1000). Format formulas as LaTeX. Format tables as HTML: <table>...</table>. Transcribe all other text as standard Markdown. Preserve the original text without translation or paraphrasing.'''
OCR_TIMEOUT = "OCR_TIMEOUT"
MODEL_NOT_FOUND = "MODEL_NOT_FOUND"
OCR_FAILED = "OCR_FAILED"
FILE_TOO_COMPLEX = "FILE_TOO_COMPLEX"

_MAX_IMAGE_EDGE = 2880
_MAX_PIXELS = 4_000_000   # context budget: image tokens ≈ px/1024; keep image + 4096 output within n_ctx 8192
_PDF_RENDER_SCALE = 2.0
_PAGES_PER_SECOND = 30    # S11-FIX51: autoscale budget per rasterized page

_PRIORITY_ATTR = {
    "below_normal": "BELOW_NORMAL_PRIORITY_CLASS",
    "normal": "NORMAL_PRIORITY_CLASS",
    "idle": "IDLE_PRIORITY_CLASS",
}


def effective_ocr_timeout(base_seconds: int, pages: int) -> int:
    """Return the effective timeout: max(base, pages × 30s).

    Short docs keep the base cap; long PDFs automatically get the hours they need.
    """
    return max(base_seconds, pages * _PAGES_PER_SECOND)


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
        self._n_threads = calculate_auto_threads(settings.n_threads or settings.cpu_threads)
        logger.info(
            "Auto-calculated %d threads for %d logical cores",
            self._n_threads,
            os.cpu_count() or 1,
        )
        self._timeout = settings.ocr_timeout_seconds
        self._max_pdf_pages = settings.max_pdf_pages

        self._loaded = self._check_model_files()
        if not self._loaded:
            logger.warning("Model files not found. Awaiting download.")
            self._input_queue: Queue = Queue()
            self._output_queue: Queue = Queue()
            return

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

    def _check_model_files(self) -> bool:
        """Return True only when both model and mmproj files exist on disk."""
        return Path(self._model_path).is_file() and Path(self._mmproj_path).is_file()

    @property
    def loaded(self) -> bool:
        return self._loaded

    @property
    def model_path(self) -> str:
        return self._model_path

    def ocr(self, image_path: str) -> str | dict[str, Any]:
        """Submit one file (image or PDF). Returns Markdown or an error dict."""
        if not self._loaded:
            return {
                "error": MODEL_NOT_FOUND,
                "message": "Model files not loaded. Awaiting download.",
                "image_path": image_path,
            }
        path = Path(image_path)
        file_type = detect_file_type(path)
        page_views: List[tuple[bytes, "Image.Image"]] | None = None
        if file_type == "pdf":
            page_views_result = self._render_pdf(path)
            if isinstance(page_views_result, dict):
                return page_views_result
            page_views = page_views_result
            images = [pv[0] for pv in page_views]
        else:
            from PIL import Image

            with Image.open(path) as pil_img:
                images = _prepare_views(pil_img.convert("RGB"))

        self._input_queue.put({"action": "ocr", "images": images, "max_tokens": 4096})
        effective_timeout = effective_ocr_timeout(self._timeout, len(images))
        try:
            raw = self._output_queue.get(timeout=effective_timeout)
        except queue.Empty:
            logger.warning(
                "OCR_TIMEOUT: worker did not return result within %ss for %s",
                effective_timeout,
                image_path,
            )
            return {
                "error": OCR_TIMEOUT,
                "message": f"OCR exceeded {effective_timeout}s timeout for {image_path}",
                "image_path": image_path,
            }

        if isinstance(raw, dict):
            return raw

        # Post-process: HTML tables → GFM → noise filter → extract chart crops
        text = convert_html_tables_to_gfm(raw)
        text = "\n".join(filter_noise_lines(text.splitlines()))
        source_path = Path(image_path)
        output_md_path = source_path.parent / f"{source_path.stem}.md"
        if file_type == "pdf" and page_views is not None:
            # Per-page crop extraction using the exact rasterized page image.
            page_texts = text.split("\n\n---\n\n")
            processed_pages: list[str] = []
            for i, page_text in enumerate(page_texts):
                if i < len(page_views):
                    _, pil_img = page_views[i]
                    page_text = extract_and_save_image_crops(
                        page_text, pil_img, output_md_path,
                    )
                processed_pages.append(page_text)
            text = "\n\n---\n\n".join(processed_pages)
        else:
            text = extract_and_save_image_crops(text, source_path, output_md_path)
        return text

    def _render_pdf(
        self, path: Path,
    ) -> List[tuple[bytes, "Image.Image"]] | dict[str, Any]:
        """Render PDF pages to PNG bytes, returning (bytes, pil_image) pairs.

        The pil_image is the exact image fed to the model so bbox geometry
        matches the rasterized page (L9: rasterize-then-crop).
        """
        from PIL import Image
        from scan2text.services.pdf_service import (
            MAX_PDF_SIZE_BYTES,
            check_page_limit,
            check_pdf_size,
        )

        # Read live settings so user-raised max_pdf_pages (FIX33) is respected.
        live_settings = self._settings_service.load()
        ok, err = check_page_limit(path, live_settings.max_pdf_pages)
        if not ok:
            return {
                "error": FILE_TOO_COMPLEX,
                "message": err,
            }
        ok, err = check_pdf_size(path)
        if not ok:
            return {
                "error": FILE_TOO_COMPLEX,
                "message": err,
            }
        pages: List[tuple[bytes, Image.Image]] = []
        with pdfium.PdfDocument(str(path)) as pdf:
            for index in range(len(pdf)):
                bitmap = pdf[index].render(scale=_PDF_RENDER_SCALE)
                pil_img = bitmap.to_pil().convert("RGB")
                for png_bytes in _prepare_views(pil_img):
                    pages.append((png_bytes, pil_img))
        return pages
