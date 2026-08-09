"""VLM OCR adapter — GLM-OCR 0.9B via llama-cpp-python (CPU-only, offline).

Spawns one persistent low-priority worker process that keeps the model and
vision projector (mmproj) loaded. Parents send image bytes (or rendered PDF
pages) over a queue; the worker returns Markdown strings.
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

_VLM_PROMPT = (
    "Analyze this image and extract all text, tables, and layout into clean, structured Markdown. "
    "Do not add conversational filler."
)
OCR_TIMEOUT = "OCR_TIMEOUT"
MODEL_NOT_FOUND = "MODEL_NOT_FOUND"
PDF_TOO_MANY_PAGES = "PDF_TOO_MANY_PAGES"

_PRIORITY_ATTR = {
    "below_normal": "BELOW_NORMAL_PRIORITY_CLASS",
    "normal": "NORMAL_PRIORITY_CLASS",
    "idle": "IDLE_PRIORITY_CLASS",
}


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
            )
            texts.append(output["choices"][0]["message"]["content"])
        if len(texts) == 1:
            output_queue.put(texts[0])
        else:
            output_queue.put("\n\n---\n\n".join(texts))


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
            images = [path.read_bytes()]

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
        """Render PDF pages to PNG bytes (FR-06: pixels, not raw PDF bytes)."""
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
            bitmap = pdf[index].render(scale=2.0)
            pil_image = bitmap.to_pil()
            buf = BytesIO()
            pil_image.save(buf, format="PNG")
            pages.append(buf.getvalue())
        return pages
