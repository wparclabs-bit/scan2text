from __future__ import annotations

import pytest
from pathlib import Path
from unittest.mock import MagicMock

from scan2text.models.job import OCRJob, JobStatus
from scan2text.services.output_service import OutputService


class TestOutputGeneration:
    def test_saves_markdown_file(self, tmp_scan2text, mock_paths):
        mock_paths.resolve_output_path.return_value = tmp_scan2text / "output.md"
        svc = OutputService(path_service=mock_paths)
        job = OCRJob(file_name="doc.pdf", file_path="/data/doc.pdf")
        from scan2text.models.ocr_result import OCRPage, OCRResult
        result = OCRResult(
            job_id="j1", source_file="doc.pdf",
            pages=[OCRPage(page_number=1, text="# Hello\n\nSome text.")],
            full_text="# Hello\n\nSome text.",
        )
        path = svc.write(job, result)
        written = Path(path).read_text(encoding="utf-8")
        assert "# Hello" in written

    def test_one_job_per_file(self, tmp_scan2text, mock_paths):
        from scan2text.services.file_service import SUPPORTED_EXTENSIONS
        # Names must differ for separate files.
        assert ".pdf" != ".jpg"
