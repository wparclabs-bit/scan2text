"""No-text guard: digits-only OCR output gets bilingual notice, not garbage."""

from __future__ import annotations

import tempfile
from pathlib import Path

import pytest

from scan2text.models.job import JobStatus, OCRJob
from scan2text.models.ocr_result import OCRPage, OCRResult
from scan2text.services.output_service import OutputService, has_no_text
from scan2text.services.path_service import PathService


# --- Pure detector unit tests ----------------------------------------------

class TestHasNoText:
    def test_empty_string(self):
        assert has_no_text("") is True

    def test_whitespace_only(self):
        assert has_no_text(" ") is True
        assert has_no_text("   ") is True
        assert has_no_text("\n\t") is True

    def test_digits_only(self):
        assert has_no_text("91\n92 102") is True

    def test_mixed_text_and_digits(self):
        assert has_no_text("UNIT 1") is False
        assert has_no_text("Halo dunia 123") is False
        assert has_no_text("Page 1 of 10") is False

    def test_single_letter(self):
        assert has_no_text("A") is False
        assert has_no_text("a") is False

    def test_punctuation_only(self):
        assert has_no_text("...") is True
        assert has_no_text("---") is True


# --- Integration: digits-only writes notice, status stays completed ---------

class TestNoTextGuardIntegration:
    def test_digits_only_ocr_writes_bilingual_notice(self, tmp_path):
        paths = PathService(base_dir=str(tmp_path))
        svc = OutputService(path_service=paths)
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)

        job = OCRJob(
            job_id="j1",
            file_name="watch.png",
            file_path=str(tmp_path / "watch.png"),
            status=JobStatus.DONE,
        )
        result = OCRResult(
            job_id="j1",
            source_file="watch.png",
            pages=[OCRPage(page_number=1, text="91\n92\n102")],
            full_text="91\n92\n102",
        )
        output_path = svc.write(job, result)
        content = output_path.read_text(encoding="utf-8")
        assert "No text detected" in content
        assert "Tidak ada teks terdeteksi" in content

    def test_real_text_ocr_unaffected(self, tmp_path):
        paths = PathService(base_dir=str(tmp_path))
        svc = OutputService(path_service=paths)
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)

        job = OCRJob(
            job_id="j2",
            file_name="doc.png",
            file_path=str(tmp_path / "doc.png"),
            status=JobStatus.DONE,
        )
        result = OCRResult(
            job_id="j2",
            source_file="doc.png",
            pages=[OCRPage(page_number=1, text="# Hello World\n\nSome text here.")],
            full_text="# Hello World\n\nSome text here.",
        )
        output_path = svc.write(job, result)
        content = output_path.read_text(encoding="utf-8")
        assert "# Hello World" in content
        assert "No text detected" not in content

    def test_empty_ocr_writes_bilingual_notice(self, tmp_path):
        paths = PathService(base_dir=str(tmp_path))
        svc = OutputService(path_service=paths)
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)

        job = OCRJob(
            job_id="j3",
            file_name="blank.png",
            file_path=str(tmp_path / "blank.png"),
            status=JobStatus.DONE,
        )
        result = OCRResult(
            job_id="j3",
            source_file="blank.png",
            pages=[],
            full_text="",
        )
        output_path = svc.write(job, result)
        content = output_path.read_text(encoding="utf-8")
        assert "No text detected" in content
        assert "Tidak ada teks terdeteksi" in content
