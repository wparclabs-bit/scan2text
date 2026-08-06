"""Test-only OCR engines that match the OCREngine ABC."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import List, Optional

from scan2text.adapters.ocr_engine import OCREngine
from scan2text.models.ocr_result import OCRPage, OCRResult

logger = logging.getLogger(__name__)

_SENTINEL = "SCAN2TEXT_OCR_SENTINEL_DO_NOT_LOG"


class SentinelOCR(OCREngine):
    """Fake OCR that returns a known sentinel string for easy log verification.

    The sentinel appears in Markdown output but must NOT appear in logs.
    """

    def load(self, model_path: str, mmproj_path: Optional[str] = None) -> bool:
        return True

    def is_loaded(self) -> bool:
        return True

    def unload(self) -> None:
        pass

    def process_image(self, image_bytes: bytes) -> str:
        return _SENTINEL

    def process_pdf(self, pdf_path: Path, max_pages: int) -> List[OCRPage]:
        return [OCRPage(page_number=1, text=_SENTINEL)]

    def to_ocr_result(
        self, job_id: str, source_file: str, pages: List[OCRPage]
    ) -> OCRResult:
        return OCRResult(
            job_id=job_id,
            source_file=source_file,
            pages=pages,
            full_text="".join(p.text for p in pages),
        )


class FailingOCR(OCREngine):
    """Fake OCR that fails on one configured filename, succeeds otherwise.

    Args:
        fail_on_filename: If set, the first call whose discovered name matches
            this string will raise RuntimeError; subsequent calls succeed.
    """

    def __init__(self, fail_on_filename: str = "bad.png") -> None:
        self._fail_on = fail_on_filename.lower()
        self._fail_once = True
        self.call_count = 0

    def load(self, model_path: str, mmproj_path: Optional[str] = None) -> bool:
        return True

    def is_loaded(self) -> bool:
        return True

    def unload(self) -> None:
        pass

    def process_image(self, image_bytes: bytes) -> str:
        self.call_count += 1
        if self._fail_once and self._current_name and self._current_name.lower() == self._fail_on:
            self._fail_once = False
            raise RuntimeError(f"OCR failed for {self._current_name}")
        return f"[ok-{self._current_name}]"

    def process_pdf(self, pdf_path: Path, max_pages: int) -> List[OCRPage]:
        from scan2text.models.ocr_result import OCRResult as _R
        text = self.process_image(b"")
        return [OCRPage(page_number=1, text=text)]

    def to_ocr_result(
        self, job_id: str, source_file: str, pages: List[OCRPage]
    ) -> OCRResult:
        return OCRResult(
            job_id=job_id,
            source_file=source_file,
            pages=pages,
            full_text="".join(p.text for p in pages),
        )
