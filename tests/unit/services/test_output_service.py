"""Unit tests for OutputService."""

from __future__ import annotations

import tempfile
from pathlib import Path

import pytest

from scan2text.models.job import JobStatus, OCRJob
from scan2text.models.ocr_result import OCRPage, OCRResult
from scan2text.services.output_service import OutputService
from scan2text.services.path_service import PathService


class TestOutputWritesMarkdown:
    def test_writes_utf8_markdown(self, tmp_path):
        paths = PathService(base_dir=str(tmp_path))
        svc = OutputService(path_service=paths)
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)

        job = OCRJob(file_name="doc.png", file_path=str(tmp_path / "doc.png"))
        result = OCRResult(
            job_id="j1",
            source_file="doc.png",
            pages=[OCRPage(page_number=1, text="# Hello\nWorld")],
            full_text="# Hello\nWorld",
        )
        output_path = svc.write(job, result)
        content = output_path.read_text(encoding="utf-8")
        assert "# Hello" in content

    def test_one_output_per_ocr_result(self, tmp_path):
        paths = PathService(base_dir=str(tmp_path))
        svc = OutputService(path_service=paths)
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)

        job = OCRJob(file_name="a.png", file_path=str(tmp_path / "a.png"))
        result = OCRResult(
            job_id="j1",
            source_file="a.png",
            pages=[OCRPage(page_number=1, text="text")],
            full_text="text",
        )
        path = svc.write(job, result)
        assert path.exists()


class TestOutputFilename:
    def test_safe_filename(self, tmp_path):
        paths = PathService(base_dir=str(tmp_path))
        svc = OutputService(path_service=paths)
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)

        job = OCRJob(file_name="doc.png", file_path=str(tmp_path / "doc.png"))
        result = OCRResult(
            job_id="j1",
            source_file="doc.png",
            pages=[OCRPage(page_number=1, text="x")],
            full_text="x",
        )
        output_path = svc.write(job, result)
        # Should be a valid filename with timestamp format
        assert output_path.suffix == ".md"
        # Format: stem_HHmm_yyyyMMdd.md
        import re
        pattern = r'^doc_\d{4}_\d{8}\.md$'
        assert re.match(pattern, output_path.name), f"Got: {output_path.name}"


class TestDuplicateStems:
    def test_duplicate_stems_produce_unique_names(self, tmp_path):
        paths = PathService(base_dir=str(tmp_path))
        svc = OutputService(path_service=paths)
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)

        # Create two jobs with same stem
        src_a = tmp_path / "a.png"
        src_b = tmp_path / "b.png"
        src_a.touch()
        src_b.touch()

        job_a = OCRJob(file_name="a.png", file_path=str(src_a))
        job_b = OCRJob(file_name="b.png", file_path=str(src_b))

        result_a = OCRResult(
            job_id="j1", source_file="a.png",
            pages=[OCRPage(page_number=1, text="A")], full_text="A",
        )
        result_b = OCRResult(
            job_id="j2", source_file="b.png",
            pages=[OCRPage(page_number=1, text="B")], full_text="B",
        )

        path_a = svc.write(job_a, result_a)
        path_b = svc.write(job_b, result_b)
        assert path_a != path_b


class TestOutputCollisionHandling:
    def test_collision_suffix_2(self, tmp_path):
        paths = PathService(base_dir=str(tmp_path))
        svc = OutputService(path_service=paths)
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)

        src = tmp_path / "report.pdf"
        src.touch()
        job = OCRJob(file_name="report.pdf", file_path=str(src))
        result = OCRResult(
            job_id="j1", source_file="report.pdf",
            pages=[OCRPage(page_number=1, text="X")], full_text="X",
        )

        # Pre-create the target file to force collision
        import re
        from datetime import datetime
        now = datetime.now()
        ts = f"{now.strftime('%H%M')}_{now.strftime('%Y%m%d')}"
        (tmp_path / "output" / f"report_{ts}.md").touch()

        path = svc.write(job, result)
        assert path.name == f"report_{ts}_2.md"

    def test_no_overwrite_preserves_existing(self, tmp_path):
        paths = PathService(base_dir=str(tmp_path))
        svc = OutputService(path_service=paths)
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)

        src = tmp_path / "report.pdf"
        src.touch()
        job = OCRJob(file_name="report.pdf", file_path=str(src))
        result = OCRResult(
            job_id="j1", source_file="report.pdf",
            pages=[OCRPage(page_number=1, text="X")], full_text="X",
        )

        import re
        from datetime import datetime
        now = datetime.now()
        ts = f"{now.strftime('%H%M')}_{now.strftime('%Y%m%d')}"
        existing = tmp_path / "output" / f"report_{ts}.md"
        existing.write_text("original content", encoding="utf-8")

        path = svc.write(job, result)
        # Should write to collision path, not overwrite
        assert path != existing
        assert existing.read_text(encoding="utf-8") == "original content"


class TestEmptyOcrResult:
    def test_empty_result_does_not_crash(self, tmp_path):
        paths = PathService(base_dir=str(tmp_path))
        svc = OutputService(path_service=paths)
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)

        job = OCRJob(file_name="empty.png", file_path=str(tmp_path / "empty.png"))
        result = OCRResult(
            job_id="j1",
            source_file="empty.png",
            pages=[],
            full_text="",
        )
        output_path = svc.write(job, result)
        assert output_path.exists()
