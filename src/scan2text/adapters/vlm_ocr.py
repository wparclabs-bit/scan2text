"""VLM OCR adapter — uses llama-cpp-python Llama models for image-to-Markdown OCR."""

from __future__ import annotations

import logging
import queue
from multiprocessing import Process, Queue
from typing import Any

import psutil

from scan2text.models.settings import AppSettings
from scan2text.services.settings_service import SettingsService

logger = logging.getLogger(__name__)

_VLM_PROMPT = (
    "Analyze this image and extract all text, tables, and layout into clean, structured Markdown. "
    "Do not add conversational filler."
)
_OCR_TIMEOUT_SECONDS = 180
OCR_TIMEOUT = "OCR_TIMEOUT"


def _vlm_worker(model_path: str, input_queue: Queue, output_queue: Queue) -> None:
    """Persistent worker process: loop forever, reading tasks from input_queue.

    Each task is a dict with ``action`` and ``path`` keys.
    After inference the result string is placed on output_queue.

    Must be defined at module level for multiprocessing spawn compatibility on Windows.
    """
    from llama_cpp import Llama

    llm = Llama(
        model_path=model_path,
        n_ctx=4096,
        verbose=False,
    )

    while True:
        task = input_queue.get()
        if task.get("action") == "ocr":
            image_path = task["path"]
            with open(image_path, "rb") as f:
                image_bytes = f.read()
            output = llm.create_chat_completion(
                messages=[
                    {"role": "user", "content": [_VLM_PROMPT, image_bytes]},
                ],
                max_tokens=4096,
            )
            text = output["choices"][0]["message"]["content"]
            output_queue.put(text)


class VlmOcrAdapter:
    """OCR adapter backed by a local persistent VLM worker (llama-cpp-python)."""

    def __init__(self) -> None:
        self._settings_service = SettingsService()
        self._model_path = self._load_model_path()
        self._input_queue: Queue = Queue()
        self._output_queue: Queue = Queue()
        self._worker_process = Process(
            target=_vlm_worker,
            args=(self._model_path, self._input_queue, self._output_queue),
        )
        self._worker_process.start()
        psutil.Process(self._worker_process.pid).nice(psutil.BELOW_NORMAL_PRIORITY_CLASS)

    def _load_model_path(self) -> str:
        settings: AppSettings = self._settings_service.load()
        return settings.model_path

    @property
    def model_path(self) -> str:
        return self._model_path

    def ocr(self, image_path: str) -> str | dict[str, Any]:
        """Submit an OCR task to the persistent worker and wait for the result.

        Returns Markdown string on success, or ``{"error": "OCR_TIMEOUT", ...}``
        dict if the worker does not respond within 180 seconds. The worker is
        never killed on timeout — it remains available for subsequent calls.
        """
        self._input_queue.put({"action": "ocr", "path": image_path})
        try:
            return self._output_queue.get(timeout=_OCR_TIMEOUT_SECONDS)
        except queue.Empty:
            logger.warning(
                "OCR_TIMEOUT: worker did not return result within %ss for %s",
                _OCR_TIMEOUT_SECONDS,
                image_path,
            )
            return {
                "error": OCR_TIMEOUT,
                "message": f"OCR exceeded {_OCR_TIMEOUT_SECONDS}s timeout for {image_path}",
                "image_path": image_path,
            }
