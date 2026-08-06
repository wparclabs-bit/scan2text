from __future__ import annotations

import pytest
from pathlib import Path
from unittest.mock import MagicMock

from scan2text.models.job import JobStatus, OCRJob
from scan2text.models.ocr_result import OCRPage
from scan2text.adapters.ocr_engine import FakeOCR


class TestFakeOCRAPI:
    """Verify that FakeOCR satisfies the OCREngine ABC."""

    def test_load_returns_true(self):
        fake = FakeOCR()
        assert fake.load("/fake/model.gguf") is True

    def test_is_loaded(self):
        assert FakeOCR().is_loaded() is True

    def test_process_image(self):
        result = FakeOCR().process_image(b"fake bytes")
        assert "[fake ocr output]" in result

    def test_to_ocr_result(self):
        pages = [OCRPage(page_number=1, text="hello")]
        result = FakeOCR().to_ocr_result("job-1", "img.png", pages)
        assert result.job_id == "job-1"
        assert result.source_file == "img.png"
