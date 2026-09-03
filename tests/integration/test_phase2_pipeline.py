"""Integration test — full Phase 2 batch pipeline with FakeOCR.

Scenarios (T1–T5):
  T1 Privacy: sentinel in output, not in logs
  T2 Continuation: one failure does not abort the batch
  T3 Skip: unsupported files recorded with structured reason
  T4 Duplicate stems: same filename in different dirs → two .md files
  T5 BatchSummary math: succeeded + failed + skipped == inputs; job_results length == accepted jobs
"""

from __future__ import annotations

import logging
from pathlib import Path

import pytest

from scan2text.adapters.ocr_engine import OCREngine
from scan2text.models.job import JobStatus
from scan2text.models.errors import ErrorCode
from scan2text.services.file_service import FileService, SkippedFile
from scan2text.services.path_service import PathService
from scan2text.services.queue_service import QueueService

# Sentinel string used to verify privacy-safe logging.
_SENTINEL = "SCAN2TEXT_OCR_SENTINEL_DO_NOT_LOG"


class SentinelOCR(OCREngine):
    """Fake OCR that returns a known sentinel string for easy log verification."""

    def load(self, model_path: str, mmproj_path=None) -> bool:
        return True

    def is_loaded(self) -> bool:
        return True

    def unload(self) -> None:
        pass

    def process_image(self, image_bytes: bytes, name=None) -> str:
        return _SENTINEL

    def process_pdf(self, pdf_path: Path, max_pages: int):
        from scan2text.models.ocr_result import OCRPage
        return [OCRPage(page_number=1, text=_SENTINEL)]

    def to_ocr_result(self, job_id: str, source_file: str, pages):
        from scan2text.models.ocr_result import OCRResult
        return OCRResult(
            job_id=job_id,
            source_file=source_file,
            pages=pages,
            full_text="".join(p.text for p in pages),
        )


class FailingOCR(OCREngine):
    """Fake OCR that fails on one configured filename, succeeds otherwise."""

    def __init__(self, fail_on_filename: str = "bad.png") -> None:
        self._fail_on = fail_on_filename.lower()
        self._fail_once = True
        self.call_count = 0

    def load(self, model_path: str, mmproj_path=None) -> bool:
        return True

    def is_loaded(self) -> bool:
        return True

    def unload(self) -> None:
        pass

    def process_image(self, image_bytes: bytes, name=None) -> str:
        self.call_count += 1
        current = name or ""
        if self._fail_once and current.lower() == self._fail_on:
            self._fail_once = False
            raise RuntimeError(f"OCR failed for {current}")
        return f"[ok-{current}]"

    def process_pdf(self, pdf_path: Path, max_pages: int):
        from scan2text.models.ocr_result import OCRPage
        text = self.process_image(b"")
        return [OCRPage(page_number=1, text=text)]

    def to_ocr_result(self, job_id: str, source_file: str, pages):
        from scan2text.models.ocr_result import OCRResult
        return OCRResult(
            job_id=job_id,
            source_file=source_file,
            pages=pages,
            full_text="".join(p.text for p in pages),
        )


def _make_queue(tmp_path, ocr_engine=None, base_dir_suffix="scan2text"):
    """Helper to construct a QueueService wired to tmp_path."""
    base_dir = tmp_path / base_dir_suffix
    input_dir = tmp_path / "input"
    input_dir.mkdir(parents=True, exist_ok=True)
    (base_dir / "output").mkdir(parents=True, exist_ok=True)

    paths = PathService(base_dir=str(base_dir))
    if ocr_engine is None:
        ocr_engine = SentinelOCR()
    file_svc = FileService()
    queue = QueueService(
        ocr_engine=ocr_engine,
        path_service=paths,
        file_service=file_svc,
    )
    return queue, input_dir, paths


# ====================================================================
# T1 — Privacy: sentinel in output but NOT in logs
# ====================================================================

class TestT1Privacy:
    def test_sentinel_in_output_not_in_logs(self, tmp_path, caplog):
        caplog.set_level(logging.INFO)

        queue, input_dir, paths = _make_queue(tmp_path)

        img = input_dir / "test.png"
        img.touch()
        summary = queue.process_batch([img])

        # Sentinel must be in the markdown content
        assert summary.succeeded == 1
        job_result = summary.job_results[0]
        assert "markdown_content" in job_result
        assert _SENTINEL in job_result["markdown_content"]

        # Sentinel must NOT appear in captured log text
        assert _SENTINEL not in caplog.text


# ====================================================================
# T2 — Continuation: one failure does not abort the batch
# ====================================================================

class TestT2Continuation:
    def test_failed_job_continues_batch(self, tmp_path):
        ocr = FailingOCR(fail_on_filename="bad.png")
        queue, input_dir, paths = _make_queue(tmp_path, ocr_engine=ocr)

        f_good = input_dir / "good.png"
        f_bad = input_dir / "bad.png"
        f_good2 = input_dir / "good2.png"
        f_good.touch()
        f_bad.touch()
        f_good2.touch()

        summary = queue.process_batch([f_good, f_bad, f_good2])

        # bad.png should have failed; good.png and good2.png succeeded
        assert summary.failed == 1
        assert summary.succeeded == 2
        assert summary.total_processed == 3

        # Verify job_results contains a failed entry for bad.png
        failed_entries = [
            j for j in summary.job_results if j["status"] == JobStatus.FAILED.value
        ]
        assert len(failed_entries) >= 1
        assert any("bad.png" in str(j.get("source_file", "")) for j in failed_entries)


# ====================================================================
# T3 — Skip: unsupported files recorded with structured reason
# ====================================================================

class TestT3Skip:
    def test_unsupported_not_processed(self, tmp_path):
        queue, input_dir, paths = _make_queue(tmp_path)

        supported = input_dir / "good.png"
        unsupported = input_dir / "notes.xyz"
        supported.touch()
        unsupported.touch()

        summary = queue.process_batch([supported, unsupported])

        assert summary.skipped == 1
        assert summary.succeeded == 1
        assert summary.accepted == 1

        # Verify skip records have structured reason codes
        assert len(summary.skipped_files) == 1
        record = summary.skipped_files[0]
        assert isinstance(record, SkippedFile)
        assert record.reason_code == "UNSUPPORTED_FILE"
        assert record.path.name == "notes.xyz"


# ====================================================================
# T4 — Duplicate stems: same filename in different dirs → separate results
# ====================================================================

class TestT4DuplicateStems:
    def test_duplicate_stems_separate_outputs(self, tmp_path):
        base_dir = tmp_path / "scan2text"
        (base_dir / "output").mkdir(parents=True, exist_ok=True)

        paths = PathService(base_dir=str(base_dir))
        engine = SentinelOCR()
        file_svc = FileService()
        queue = QueueService(
            ocr_engine=engine,
            path_service=paths,
            file_service=file_svc,
        )

        # Two files with the SAME stem but different parent directories
        a_report = tmp_path / "a" / "report.png"
        b_report = tmp_path / "b" / "report.png"
        a_report.parent.mkdir(exist_ok=True)
        b_report.parent.mkdir(exist_ok=True)
        a_report.touch()
        b_report.touch()

        summary = queue.process_batch([a_report, b_report])

        assert summary.succeeded == 2
        # Each job result should have markdown_content with the sentinel
        assert len(summary.job_results) == 2
        for job_result in summary.job_results:
            assert "markdown_content" in job_result
            assert _SENTINEL in job_result["markdown_content"]
        # No files should have been written to disk
        output_files = list(paths.output_dir.glob("*.md"))
        assert len(output_files) == 0


# ====================================================================
# T5 — BatchSummary math
# ====================================================================

class TestT5BatchSummaryMath:
    def test_succeeded_failed_skipped_equals_inputs(self, tmp_path):
        ocr = FailingOCR(fail_on_filename="bad.png")
        queue, input_dir, paths = _make_queue(tmp_path, ocr_engine=ocr)

        good1 = input_dir / "good.png"
        bad = input_dir / "bad.png"
        good2 = input_dir / "good2.jpg"
        unsupported = input_dir / "notes.xyz"
        good1.touch()
        bad.touch()
        good2.touch()
        unsupported.touch()

        summary = queue.process_batch([good1, bad, good2, unsupported])

        # succeeded + failed + skipped == total_inputs
        assert summary.succeeded + summary.failed + summary.skipped == summary.total_inputs
        # job_results length == accepted jobs (succeeded + failed)
        assert len(summary.job_results) == summary.accepted
        # total_processed consistent with individual counts
        assert summary.total_processed == summary.succeeded + summary.failed + summary.skipped


# ====================================================================
# Additional: one-to-one output verification
# ====================================================================

class TestOneToOneOutput:
    def test_one_input_one_output(self, tmp_path):
        queue, input_dir, paths = _make_queue(tmp_path)

        files = [input_dir / f"file_{i}.png" for i in range(5)]
        for f in files:
            f.touch()

        summary = queue.process_batch(files)

        assert summary.total_inputs == 5
        assert summary.accepted == 5
        assert summary.succeeded == 5
        # Each job has markdown_content; no files written to disk
        assert len(summary.job_results) == 5
        for job_result in summary.job_results:
            assert "markdown_content" in job_result
        output_files = list(paths.output_dir.glob("*.md"))
        assert len(output_files) == 0
