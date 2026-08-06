from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import BinaryIO, List, Optional

from scan2text.models.ocr_result import OCRPage, OCRResult


class OCREngine(ABC):
    """Abstract interface for OCR engines. Enables swapping LlamaCPP for FakeOCR in CI."""

    @abstractmethod
    def load(self, model_path: str, mmproj_path: Optional[str] = None) -> bool: ...

    @abstractmethod
    def is_loaded(self) -> bool: ...

    @abstractmethod
    def unload(self) -> None: ...

    @abstractmethod
    def process_image(self, image_bytes: bytes, name: Optional[str] = None) -> str: ...

    @abstractmethod
    def process_pdf(self, pdf_path: Path, max_pages: int) -> List[OCRPage]: ...

    @abstractmethod
    def to_ocr_result(self, job_id: str, source_file: str, pages: List[OCRPage]) -> OCRResult: ...


class FakeOCR(OCREngine):
    """Deterministic fake OCR for tests — returns structured text without model weights."""

    def load(self, model_path: str, mmproj_path: Optional[str] = None) -> bool:
        return True

    def is_loaded(self) -> bool:
        return True

    def unload(self) -> None:
        pass

    def process_image(self, image_bytes: bytes, name: Optional[str] = None) -> str:
        return "[fake ocr output]"

    def process_pdf(self, pdf_path: Path, max_pages: int) -> List[OCRPage]:
        return [OCRPage(page_number=1, text="[fake ocr output]")]

    def to_ocr_result(self, job_id: str, source_file: str, pages: List[OCRPage]) -> OCRResult:
        from scan2text.models.ocr_result import OCRResult
        return OCRResult(
            job_id=job_id,
            source_file=source_file,
            pages=pages,
            full_text="".join(p.text for p in pages),
        )
