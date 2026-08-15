"""Unit tests for QueueService."""

from __future__ import annotations

import os
import tempfile
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from scan2text.adapters.ocr_engine import FakeOCR
from scan2text.models.job import JobStatus, OCRJob
from scan2text.services.file_service import FileService
from scan2text.services.output_service import OutputService
from scan2text.services.path_service import PathService
from scan2text.services.queue_service import BatchSummary, QueueService


class TestQueueProcessesSupportedFiles:
    def test_processes_supported_files(self, tmp_path):
        paths = PathService(base_dir=str(tmp_path))
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)
        engine = FakeOCR()
        svc = QueueService(
            ocr_engine=engine,
            path_service=paths,
            file_service=FileService(),
            output_service=OutputService(path_service=paths),
        )

        src = tmp_path / "doc.png"
        src.touch()
        summary = svc.process_batch([src])

        assert summary.succeeded == 1
        assert summary.failed == 0
        assert summary.skipped == 0


class TestQueueSkipsUnsupported:
    def test_skips_unsupported_without_calling_ocr(self, tmp_path):
        paths = PathService(base_dir=str(tmp_path))
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)
        engine = FakeOCR()
        svc = QueueService(
            ocr_engine=engine,
            path_service=paths,
            file_service=FileService(),
            output_service=OutputService(path_service=paths),
        )

        unsupported = tmp_path / "file.xyz"
        unsupported.touch()
        summary = svc.process_batch([unsupported])

        assert summary.skipped == 1
        assert summary.succeeded == 0


class TestQueueContinuesAfterFailure:
    def test_continues_after_ocr_failure(self, tmp_path):
        """A failing job does not abort the batch."""
        paths = PathService(base_dir=str(tmp_path))
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)

        class FailingEngine(FakeOCR):
            call_count = 0

            def process_image(self, image_bytes: bytes, name=None) -> str:
                self.call_count += 1
                if self.call_count == 1:
                    raise RuntimeError("Simulated OCR failure")
                return "[fake ocr output]"

        engine = FailingEngine()
        svc = QueueService(
            ocr_engine=engine,
            path_service=paths,
            file_service=FileService(),
            output_service=OutputService(path_service=paths),
        )

        f1 = tmp_path / "fail.png"
        f2 = tmp_path / "ok.png"
        f1.touch()
        f2.touch()
        summary = svc.process_batch([f1, f2])

        assert summary.failed >= 1
        assert summary.succeeded >= 1


class TestBatchSummaryCounts:
    def test_summary_counts_are_correct(self, tmp_path):
        paths = PathService(base_dir=str(tmp_path))
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)
        engine = FakeOCR()
        svc = QueueService(
            ocr_engine=engine,
            path_service=paths,
            file_service=FileService(),
            output_service=OutputService(path_service=paths),
        )

        supported = tmp_path / "a.png"
        unsupported = tmp_path / "b.xyz"
        missing = tmp_path / "c.missing"
        supported.touch()
        unsupported.touch()

        summary = svc.process_batch([supported, unsupported, missing])
        assert summary.total_inputs == 3
        assert summary.accepted == 1
        assert summary.skipped == 2
        assert summary.succeeded == 1
        assert summary.failed == 0


class TestQueueWriteFailure:
    def test_continues_after_write_failure(self, tmp_path):
        """A write failure marks the job failed but batch continues."""
        paths = PathService(base_dir=str(tmp_path))
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)
        engine = FakeOCR()
        svc = QueueService(
            ocr_engine=engine,
            path_service=paths,
            file_service=FileService(),
            output_service=OutputService(path_service=paths),
        )

        # Make the second write fail by patching OutputService.write
        original_write = svc._output_svc.write

        call_count = [0]

        def failing_write(job, ocr_result, desired_stem=None):
            call_count[0] += 1
            if call_count[0] == 2:
                raise OSError("Disk full")
            return original_write(job, ocr_result, desired_stem)

        svc._output_svc.write = failing_write

        f1 = tmp_path / "ok.png"
        f2 = tmp_path / "fail_write.png"
        f3 = tmp_path / "also_ok.png"
        f1.touch()
        f2.touch()
        f3.touch()

        summary = svc.process_batch([f1, f2, f3])

        assert summary.succeeded >= 2
        assert summary.failed >= 1


class TestQueueNoOcrTextInLogs:
    def test_ocr_text_not_logged(self, tmp_path, caplog):
        """Sentinel string appears in output file but never in log output."""
        caplog.set_level(0)

        SENTINEL = "___OCR_SENTINEL_TEXT___"

        class SentinelEngine(FakeOCR):
            def process_image(self, image_bytes: bytes, name=None) -> str:
                return SENTINEL

            def to_ocr_result(self, job_id, source_file, pages):
                from scan2text.models.ocr_result import OCRResult
                return OCRResult(
                    job_id=job_id,
                    source_file=source_file,
                    pages=pages,
                    full_text=SENTINEL,
                )

        paths = PathService(base_dir=str(tmp_path))
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)
        engine = SentinelEngine()
        svc = QueueService(
            ocr_engine=engine,
            path_service=paths,
            file_service=FileService(),
            output_service=OutputService(path_service=paths),
        )

        src = tmp_path / "doc.png"
        src.touch()
        summary = svc.process_batch([src])

        assert summary.succeeded == 1

        # Verify sentinel is in the output file
        output_files = list((tmp_path / "output").glob("*.md"))
        assert len(output_files) >= 1
        content = output_files[0].read_text(encoding="utf-8")
        assert SENTINEL in content

        # Verify sentinel does NOT appear in any log record
        for record in caplog.records:
            assert SENTINEL not in record.getMessage()


class TestQueuePdfProcessing:
    def test_pdf_uses_process_pdf(self, tmp_path):
        """PDF files go through process_pdf instead of process_image."""
        paths = PathService(base_dir=str(tmp_path))
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)

        class TrackingEngine(FakeOCR):
            pdf_called = False
            image_called = False

            def process_image(self, image_bytes: bytes, name=None) -> str:
                self.image_called = True
                return "[fake ocr output]"

            def process_pdf(self, pdf_path, max_pages):
                self.pdf_called = True
                from scan2text.models.ocr_result import OCRPage
                return [OCRPage(page_number=1, text="[fake ocr output]")]

        engine = TrackingEngine()
        svc = QueueService(
            ocr_engine=engine,
            path_service=paths,
            file_service=FileService(),
            output_service=OutputService(path_service=paths),
        )

        pdf = tmp_path / "doc.pdf"
        pdf.touch()
        summary = svc.process_batch([pdf])

        assert summary.succeeded == 1
        assert engine.pdf_called
        assert not engine.image_called


class TestQueueBatchSummaryStructure:
    def test_job_results_have_required_keys(self, tmp_path):
        """Each job result dict has the expected keys."""
        paths = PathService(base_dir=str(tmp_path))
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)
        engine = FakeOCR()
        svc = QueueService(
            ocr_engine=engine,
            path_service=paths,
            file_service=FileService(),
            output_service=OutputService(path_service=paths),
        )

        supported = tmp_path / "a.png"
        unsupported = tmp_path / "b.xyz"
        missing = tmp_path / "c.missing"
        supported.touch()
        unsupported.touch()

        summary = svc.process_batch([supported, unsupported, missing])

        required_keys = {"job_id", "source_file", "status", "error_code", "output_path"}
        for job_result in summary.job_results:
            assert required_keys.issubset(set(job_result.keys()))

    def test_skipped_files_recorded(self, tmp_path):
        """Skipped files appear in skipped_files list with reason codes."""
        paths = PathService(base_dir=str(tmp_path))
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)
        engine = FakeOCR()
        svc = QueueService(
            ocr_engine=engine,
            path_service=paths,
            file_service=FileService(),
            output_service=OutputService(path_service=paths),
        )

        unsupported = tmp_path / "bad.xyz"
        missing = tmp_path / "missing.txt"
        unsupported.touch()

        summary = svc.process_batch([unsupported, missing])

        assert len(summary.skipped_files) == 2
        reasons = {sf.reason_code for sf in summary.skipped_files}
        assert "UNSUPPORTED_FILE" in reasons
        assert "MISSING_INPUT" in reasons


class TestQueueAcceptsPathsAndDiscoveryResult:
    def test_accepts_string_paths(self, tmp_path):
        """process_batch accepts string paths as well as Path objects."""
        paths = PathService(base_dir=str(tmp_path))
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)
        engine = FakeOCR()
        svc = QueueService(
            ocr_engine=engine,
            path_service=paths,
            file_service=FileService(),
            output_service=OutputService(path_service=paths),
        )

        src = tmp_path / "doc.png"
        src.touch()
        summary = svc.process_batch([str(src)])

        assert summary.succeeded == 1

    def test_accepts_directory_path(self, tmp_path):
        """Directories are expanded into files for processing."""
        paths = PathService(base_dir=str(tmp_path))
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)
        engine = FakeOCR()
        svc = QueueService(
            ocr_engine=engine,
            path_service=paths,
            file_service=FileService(),
            output_service=OutputService(path_service=paths),
        )

        d = tmp_path / "input_dir"
        d.mkdir()
        (d / "a.png").touch()
        (d / "b.jpg").touch()
        (d / "c.xyz").touch()

        summary = svc.process_batch([d])

        assert summary.accepted == 2
        assert summary.skipped == 1


class TestQueueTotalProcessed:
    def test_total_processed_property(self, tmp_path):
        """total_processed = succeeded + failed + skipped."""
        paths = PathService(base_dir=str(tmp_path))
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)
        engine = FakeOCR()
        svc = QueueService(
            ocr_engine=engine,
            path_service=paths,
            file_service=FileService(),
            output_service=OutputService(path_service=paths),
        )

        supported = tmp_path / "ok.png"
        unsupported = tmp_path / "bad.xyz"
        missing = tmp_path / "no.txt"
        supported.touch()
        unsupported.touch()

        summary = svc.process_batch([supported, unsupported, missing])

        assert summary.total_processed == summary.succeeded + summary.failed + summary.skipped


class TestQueueServiceQuarantine:
    """Tests for VlmOcrAdapter integration — quarantine on error."""

    def _make_svc(self, tmp_path):
        paths = PathService(base_dir=str(tmp_path))
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)
        quarantine_dir = tmp_path / "quarantine" / "failed"
        return QueueService(
            ocr_engine=MagicMock(),
            path_service=paths,
            quarantine_dir=quarantine_dir,
        )

    def test_ocr_timeout_moves_file_to_quarantine(self, tmp_path):
        """When VlmOcrAdapter returns an error dict, the source file is moved to quarantine."""
        svc = self._make_svc(tmp_path)

        mock_adapter = MagicMock()
        src = tmp_path / "bad.png"
        src.write_bytes(b"fake image")
        mock_adapter.ocr.return_value = {
            "error": "OCR_TIMEOUT",
            "message": "timeout",
            "image_path": str(src),
        }

        summary = svc.process_image_paths([src], mock_adapter)

        assert summary.failed == 1
        assert summary.succeeded == 0
        quarantined = tmp_path / "quarantine" / "failed" / "bad.png"
        assert quarantined.exists()
        assert not src.exists()

    def test_cleanup_old_failures_deletes_files_older_than_seven_days(self, tmp_path):
        """Files in the quarantine folder older than 7 days are deleted on cleanup."""
        svc = self._make_svc(tmp_path)
        failed_dir = tmp_path / "quarantine" / "failed"
        failed_dir.mkdir(parents=True)

        old_file = failed_dir / "ancient.png"
        old_file.write_bytes(b"old")
        # Set mtime to 8 days ago
        old_time = (datetime.now() - timedelta(days=8)).timestamp()
        os.utime(old_file, (old_time, old_time))

        recent_file = failed_dir / "recent.png"
        recent_file.write_bytes(b"recent")

        deleted_count = svc.cleanup_old_failures(max_age_days=7)

        assert deleted_count == 1
        assert not old_file.exists()
        assert recent_file.exists()

    def test_cleanup_old_failures_boundary_at_exactly_seven_days(self, tmp_path):
        """A file just under 7 days old is NOT deleted (threshold is strictly greater)."""
        svc = self._make_svc(tmp_path)
        failed_dir = tmp_path / "quarantine" / "failed"
        failed_dir.mkdir(parents=True)

        boundary_file = failed_dir / "boundary.png"
        boundary_file.write_bytes(b"boundary")
        # Set mtime to 6 days 23 hours ago — safely within the 7-day threshold
        boundary_time = (datetime.now() - timedelta(days=6, hours=23)).timestamp()
        os.utime(boundary_file, (boundary_time, boundary_time))

        deleted_count = svc.cleanup_old_failures(max_age_days=7)

        assert deleted_count == 0
        assert boundary_file.exists()

    def test_cleanup_old_failures_rejects_negative_days(self, tmp_path):
        """Negative max_age_days raises ValueError."""
        svc = self._make_svc(tmp_path)
        with pytest.raises(ValueError, match="non-negative"):
            svc.cleanup_old_failures(max_age_days=-1)

    def test_quarantine_uses_unique_names_on_collision(self, tmp_path):
        """Two files with the same basename from different dirs get unique quarantine names."""
        svc = self._make_svc(tmp_path)

        dir1 = tmp_path / "dir1"
        dir2 = tmp_path / "dir2"
        dir1.mkdir()
        dir2.mkdir()
        f1 = dir1 / "same.png"
        f2 = dir2 / "same.png"
        f1.write_bytes(b"from dir1")
        f2.write_bytes(b"from dir2")

        mock_adapter = MagicMock()
        mock_adapter.ocr.side_effect = [
            {"error": "OCR_TIMEOUT", "message": "t1", "image_path": str(f1)},
            {"error": "OCR_TIMEOUT", "message": "t2", "image_path": str(f2)},
        ]

        summary = svc.process_image_paths([f1, f2], mock_adapter)

        assert summary.failed == 2
        quarantined = list((tmp_path / "quarantine" / "failed").glob("same*.png"))
        assert len(quarantined) == 2
        # Both originals should be gone
        assert not f1.exists()
        assert not f2.exists()

    def test_success_saves_markdown_using_path_service_naming(self, tmp_path):
        """Successful OCR results are saved as Markdown using path_service naming convention."""
        svc = self._make_svc(tmp_path)

        mock_adapter = MagicMock()
        src = tmp_path / "document.png"
        src.write_bytes(b"fake image")
        mock_adapter.ocr.return_value = "# Extracted Text\n\nSome content here."

        summary = svc.process_image_paths([src], mock_adapter)

        assert summary.succeeded == 1
        assert summary.failed == 0

        output_files = list((tmp_path / "output").glob("*.md"))
        assert len(output_files) >= 1

        md_content = output_files[0].read_text(encoding="utf-8")
        assert "Extracted Text" in md_content
        assert "Some content here." in md_content

        # Verify naming convention: {stem}_{HHmm}_{yyyyMMdd}.md
        name = output_files[0].name
        assert name.startswith("document_")
        assert name.endswith(".md")

    def test_process_image_paths_uses_original_stem_from_mapping(self, tmp_path):
        """When path_to_stem is provided, output uses original stem not uuid."""
        svc = self._make_svc(tmp_path)

        mock_adapter = MagicMock()
        # Simulate a UUID-named temp file on disk
        uuid_path = tmp_path / "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6.png"
        uuid_path.write_bytes(b"fake image")
        mock_adapter.ocr.return_value = "# QRIS Content\n\nStruktur QRIS test."

        # Map the uuid path to the original stem
        path_to_stem = {uuid_path: "strutur_qris"}
        summary = svc.process_image_paths([uuid_path], mock_adapter, path_to_stem=path_to_stem)

        assert summary.succeeded == 1
        assert summary.failed == 0

        output_files = list((tmp_path / "output").glob("*.md"))
        assert len(output_files) == 1

        # Output stem must be the original, NOT 32-hex chars
        name = output_files[0].name
        assert name.startswith("strutur_qris_")
        assert name.endswith(".md")
        # Must NOT be a 32-hex uuid stem
        stem = Path(name).stem.split("_")[0]
        assert len(stem) != 32 or not all(c in "0123456789abcdef" for c in stem)

    def test_process_image_paths_fallback_when_no_mapping(self, tmp_path):
        """Without path_to_stem, falls back to source_path.stem (uuid hex)."""
        svc = self._make_svc(tmp_path)

        mock_adapter = MagicMock()
        uuid_path = tmp_path / "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6.png"
        uuid_path.write_bytes(b"fake image")
        mock_adapter.ocr.return_value = "# Content"

        # No path_to_stem provided
        summary = svc.process_image_paths([uuid_path], mock_adapter)

        assert summary.succeeded == 1

        output_files = list((tmp_path / "output").glob("*.md"))
        assert len(output_files) == 1

        # Should use the uuid stem as fallback
        name = output_files[0].name
        assert name.startswith("a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6_")
