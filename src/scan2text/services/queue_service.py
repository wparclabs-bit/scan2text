"""Queue service — sequential batch orchestrator for file-to-Markdown processing."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from scan2text.adapters.ocr_engine import OCREngine
from scan2text.models.errors import ErrorCode
from scan2text.models.job import JobStatus, OCRJob
from scan2text.models.ocr_result import OCRPage, OCRResult
from scan2text.services.file_service import (
    DiscoveredFile,
    FileService,
    SkippedFile,
)
from scan2text.models.settings import AppSettings
from scan2text.services.output_service import OutputService
from scan2text.services.path_service import PathService
from scan2text.services.pdf_service import detect_file_type
from scan2text.services.settings_service import SettingsError, SettingsService

logger = logging.getLogger(__name__)


class BatchSummary:
    """Structured summary of a completed batch run."""

    def __init__(self) -> None:
        self.total_inputs: int = 0
        self.accepted: int = 0
        self.skipped: int = 0
        self.succeeded: int = 0
        self.failed: int = 0
        self.job_results: list[dict] = []
        self.skipped_files: list[SkippedFile] = []

    @property
    def total_processed(self) -> int:
        return self.succeeded + self.failed + self.skipped


class QueueService:
    """Sequential in-memory queue that orchestrates the batch pipeline.

    Constructor injection — depends on OCREngine ABC, not concrete engines.
    Uses simple sequential processing (no threads/multiprocessing/async).
    One failed file does not abort the whole batch.
    """

    def __init__(
        self,
        ocr_engine: OCREngine,
        path_service: Optional[PathService] = None,
        settings_service: Optional[SettingsService] = None,
        file_service: Optional[FileService] = None,
        output_service: Optional[OutputService] = None,
        quarantine_dir: Optional[Path] = None,
    ) -> None:
        self._ocr_engine = ocr_engine
        self._paths = path_service or PathService()
        self._settings_svc = settings_service or SettingsService(path_service=self._paths)
        self._file_svc = file_service or FileService()
        self._output_svc = output_service or OutputService(path_service=self._paths)
        self._quarantine_dir = (
            quarantine_dir
            if quarantine_dir is not None
            else Path.home() / "AppData" / "Local" / "scan2text" / "failed"
        )

    # --- Public API ---------------------------------------------------------

    def process_batch(
        self,
        input_paths: List[str | Path],
        max_pdf_pages: int = 20,
    ) -> BatchSummary:
        """Process a batch of files through the full pipeline.

        Args:
            input_paths: Files and/or directories to process.
            max_pdf_pages: Maximum pages per PDF (from settings).

        Returns:
            A BatchSummary with counts and per-job results.
        """
        summary = BatchSummary()
        summary.total_inputs = len(input_paths)

        # Discover files
        discovery = self._file_svc.discover(input_paths)
        summary.accepted = len(discovery.accepted)
        summary.skipped += len(discovery.skipped)
        summary.skipped_files.extend(discovery.skipped)

        for skipped in discovery.skipped:
            logger.info("Skipped %s (%s): %s", skipped.path.name, skipped.reason_code, skipped.reason_message)

        # Process accepted files sequentially
        for discovered in discovery.accepted:
            try:
                self._process_one_job(discovered, max_pdf_pages, summary)
            except Exception as exc:
                # Catch broad exception at queue boundary — batch continues.
                error_code = ErrorCode.UNKNOWN_ERROR.value
                error_msg = str(exc) if exc else "Unknown error"
                logger.error(
                    "Job failed for %s: %s [%s]",
                    discovered.name,
                    error_msg,
                    error_code,
                )
                summary.failed += 1
                summary.job_results.append({
                    "job_id": str(uuid.uuid4()),
                    "source_file": discovered.name,
                    "status": JobStatus.FAILED.value,
                    "error_code": error_code,
                    "output_path": None,
                })

        return summary

    def _process_one_job(
        self,
        discovered: DiscoveredFile,
        max_pdf_pages: int,
        summary: BatchSummary,
    ) -> None:
        """Process a single file through OCR and output."""
        job = OCRJob(file_name=discovered.name, file_path=str(discovered.path))
        job.status = JobStatus.PROCESSING
        job.updated_at = datetime.now()

        try:
            # Read file bytes
            image_bytes = discovered.path.read_bytes()

            # Determine if PDF or image — suffix primary, magic-byte tie-breaker.
            file_type = detect_file_type(discovered.path)

            if file_type == "pdf":
                pages = self._ocr_engine.process_pdf(discovered.path, max_pdf_pages)
            else:
                text = self._ocr_engine.process_image(image_bytes, name=discovered.name)
                pages = [OCRPage(page_number=1, text=text)]

            ocr_result = self._ocr_engine.to_ocr_result(
                job_id=job.id,
                source_file=discovered.name,
                pages=pages,
            )

            # Write output
            output_path = self._output_svc.write(job, ocr_result)
            ocr_result.output_path = str(output_path)
            job.output_path = str(output_path)
            job.status = JobStatus.DONE
            summary.succeeded += 1
            summary.job_results.append({
                "job_id": job.id,
                "source_file": discovered.name,
                "status": JobStatus.DONE.value,
                "error_code": None,
                "output_path": str(output_path),
            })

            logger.info(
                "Job done: %s -> %s (%d pages)",
                discovered.name,
                output_path.name,
                len(pages),
            )

        except Exception as exc:
            error_code = ErrorCode.OCR_FAILED.value
            error_msg = str(exc) if exc else "OCR failed"
            # Ensure error message does not contain OCR text (it's a short exception).
            logger.error("OCR failed for %s: %s [%s]", discovered.name, error_msg, error_code)
            job.status = JobStatus.FAILED
            job.error_code = error_code
            job.error_message = error_msg
            summary.failed += 1
            summary.job_results.append({
                "job_id": job.id,
                "source_file": discovered.name,
                "status": JobStatus.FAILED.value,
                "error_code": error_code,
                "output_path": None,
            })

    # --- VlmOcrAdapter integration ------------------------------------------

    def process_image_paths(
        self,
        image_paths: List[str | Path],
        vlm_adapter,
        path_to_stem: Optional[Dict[Path, str]] = None,
    ) -> BatchSummary:
        """Process a list of image paths using a VlmOcrAdapter instance.

        On success the adapter returns a Markdown string which is saved via
        ``path_service.resolve_output_path``.  On error (a dict with an
        ``"error"`` key) the original file is moved to the quarantine folder.

        Args:
            path_to_stem: Optional mapping from uploaded path to the desired
                output stem (e.g. sanitized original filename). When provided
                and the path is present, ``resolve_output_path`` receives the
                original stem instead of the UUID temp name.
        """
        import shutil

        summary = BatchSummary()
        summary.total_inputs = len(image_paths)

        self._quarantine_dir.mkdir(parents=True, exist_ok=True)

        for path in image_paths:
            try:
                path = Path(path)
                result = vlm_adapter.ocr(str(path))

                if isinstance(result, dict) and "error" in result:
                    dest_name = self._resolve_unique_quarantine_name(path.name)
                    dest = self._quarantine_dir / dest_name
                    shutil.move(str(path), str(dest))
                    logger.warning(
                        "OCR error for %s (%s) — moved to quarantine",
                        path.name,
                        result["error"],
                    )
                    summary.failed += 1
                    summary.job_results.append({
                        "job_id": str(uuid.uuid4()),
                        "source_file": path.name,
                        "status": JobStatus.FAILED.value,
                        "error_code": result.get("error", "UNKNOWN"),
                        "output_path": None,
                    })
                else:
                    desired_stem = (
                        path_to_stem.get(path) if path_to_stem else None
                    )
                    output_path = self._paths.resolve_output_path(path, desired_stem)
                    output_path.parent.mkdir(parents=True, exist_ok=True)
                    output_path.write_text(result, encoding="utf-8")
                    logger.info("OCR success: %s -> %s", path.name, output_path.name)
                    summary.succeeded += 1
                    summary.job_results.append({
                        "job_id": str(uuid.uuid4()),
                        "source_file": path.name,
                        "status": JobStatus.DONE.value,
                        "error_code": None,
                        "output_path": str(output_path),
                    })
            except Exception as exc:
                error_code = ErrorCode.UNKNOWN_ERROR.value
                error_msg = str(exc) if exc else "Unknown error"
                logger.error(
                    "Job failed for %s: %s [%s]",
                    Path(path).name if not isinstance(path, Path) else path.name,
                    error_msg,
                    error_code,
                )
                summary.failed += 1
                summary.job_results.append({
                    "job_id": str(uuid.uuid4()),
                    "source_file": str(path),
                    "status": JobStatus.FAILED.value,
                    "error_code": error_code,
                    "output_path": None,
                })

        return summary

    def _resolve_unique_quarantine_name(self, original_name: str) -> str:
        """Return a unique filename for the quarantine directory.

        If ``original_name`` already exists in the quarantine dir, appends a
        UUID suffix to guarantee uniqueness and prevent silent overwrites.
        """
        dest = self._quarantine_dir / original_name
        if not dest.exists():
            return original_name
        stem = Path(original_name).stem
        suffix = Path(original_name).suffix
        return f"{stem}_{uuid.uuid4().hex[:8]}{suffix}"

    def cleanup_old_failures(self, max_age_days: int = 7) -> int:
        """Delete files older than ``max_age_days`` from the quarantine folder.

        Returns the number of files deleted.
        """
        if max_age_days < 0:
            raise ValueError("max_age_days must be non-negative")

        if not self._quarantine_dir.exists():
            return 0

        now = datetime.now()
        threshold_seconds = max_age_days * 86400
        deleted = 0
        for f in self._quarantine_dir.iterdir():
            if f.is_file():
                try:
                    age = now - datetime.fromtimestamp(f.stat().st_mtime)
                    if age.total_seconds() > threshold_seconds:
                        f.unlink()
                        deleted += 1
                        logger.info(
                            "Deleted old quarantine file: %s (%d days old)",
                            f.name,
                            age.days,
                        )
                except OSError as exc:
                    logger.warning("Failed to delete quarantine file %s: %s", f.name, exc)

        return deleted
