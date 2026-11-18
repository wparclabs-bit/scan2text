"""Queue service — sequential batch orchestrator for file-to-Markdown processing."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from scan2text.adapters.ocr_engine import OCREngine
from scan2text.cloud.cancellation import JobCancelledError, cancellation_registry
from scan2text.cloud.conversion import CloudConversionError, CloudConsentRequiredError
from scan2text.cloud.failure import ProviderFailure, ProviderParkedError
from scan2text.cloud.route_decision import Engine, decide_route
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
        quarantine_dir: Optional[Path] = None,
        cloud_conversion_service=None,
    ) -> None:
        self._ocr_engine = ocr_engine
        self._paths = path_service or PathService()
        self._settings_svc = settings_service or SettingsService(path_service=self._paths)
        self._file_svc = file_service or FileService()
        self._cloud_conversion_service = cloud_conversion_service
        self._quarantine_dir = (
            quarantine_dir
            if quarantine_dir is not None
            else Path.home() / "AppData" / "Local" / "scan2text" / "failed"
        )

    # --- Public API ---------------------------------------------------------

    def process_batch(
        self,
        input_paths: List[str | Path],
        max_pdf_pages: int = 50,
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

            # Render output — now returns markdown content instead of writing to disk
            markdown = OutputService.render_markdown(ocr_result)
            if not OutputService._has_raw_text(ocr_result):
                from scan2text.services.output_service import _NO_TEXT_NOTICE
                markdown = _NO_TEXT_NOTICE
            job.status = JobStatus.DONE
            summary.succeeded += 1
            summary.job_results.append({
                "job_id": job.id,
                "source_file": discovered.name,
                "status": JobStatus.DONE.value,
                "error_code": None,
                "output_path": None,
                "markdown_content": markdown,
            })

            logger.info(
                "Job done: %s (%d pages)",
                discovered.name,
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

    def _convert_pdf_text_layer(
        self,
        path: Path,
        vlm_adapter,
        enhance: bool = False,
    ) -> Optional[str]:
        """Convert a PDF from the text layer it already contains (D-26).

        Returns None when the file is not a PDF or when no page carries a text
        layer, so the caller keeps the OCR path. A page with a text layer is
        rebuilt from its words, font sizes, and positions: no page is
        rasterised and no model is called for it. A page without a text layer
        is rasterised and sent to OCR, exactly as before.
        """
        from scan2text.services.text_layer import (
            build_page_markdown,
            extract_text_pages,
        )

        if detect_file_type(path) != "pdf":
            return None
        try:
            pages = extract_text_pages(path)
        except Exception as exc:
            logger.warning(
                "Text layer unavailable for %s: %s",
                path.name,
                type(exc).__name__,
            )
            return None
        if not pages or not any(page.has_text for page in pages):
            return None

        blocks: List[str] = []
        for page in pages:
            if page.has_text:
                blocks.append(build_page_markdown(page).strip())
            else:
                blocks.append(
                    self._ocr_scanned_page(path, page.page_number, vlm_adapter, enhance)
                )
        return "\n\n---\n\n".join(block for block in blocks if block)

    def _ocr_scanned_page(
        self,
        path: Path,
        page_number: int,
        vlm_adapter,
        enhance: bool,
    ) -> str:
        """Rasterise one page without a text layer and send it to OCR."""
        import tempfile

        from scan2text.services.pdf_service import render_pdf_page_to_png

        with tempfile.TemporaryDirectory() as folder:
            image_path = render_pdf_page_to_png(path, page_number, Path(folder))
            result = vlm_adapter.ocr(str(image_path), enhance=enhance)
        if isinstance(result, dict) and "error" in result:
            logger.warning(
                "OCR failed for scanned page %s of %s: %s",
                page_number,
                path.name,
                result["error"],
            )
            return ""
        return result


    def process_image_paths(
        self,
        image_paths: List[str | Path],
        vlm_adapter,
        path_to_stem: Optional[Dict[Path, str]] = None,
        enhance: bool = False,
        consent_granted: bool = False,
        task_id: Optional[str] = None,
    ) -> BatchSummary:
        """Process a list of image paths using a VlmOcrAdapter instance.

        Each file is routed per file by :func:`decide_route`: a file above the
        local threshold goes through the Cloud conversion service, a file at or
        below it keeps the existing local path untouched. The batch stays
        sequential, so the one-active-job FIFO order is preserved.

        On success the adapter returns a Markdown string which is saved via
        ``path_service.resolve_output_path``.  On error (a dict with an
        ``"error"`` key) the original file is moved to the quarantine folder.

        Args:
            path_to_stem: Optional mapping from uploaded path to the desired
                output stem (e.g. sanitized original filename). When provided
                and the path is present, ``resolve_output_path`` receives the
                original stem instead of the UUID temp name.
            enhance: When True, images are PIL contrast + color enhanced (4.0x)
                before OCR inference. Defaults to False.
            consent_granted: The consent gate's decision for this batch. A
                Cloud-routed file is never sent when this is False.
            task_id: The task that owns this batch. Its cancellation stops the
                Cloud work and discards the result (D-22).
        """
        import shutil

        summary = BatchSummary()
        summary.total_inputs = len(image_paths)

        self._quarantine_dir.mkdir(parents=True, exist_ok=True)

        cancellation = cancellation_registry.get(task_id) if task_id else None

        for path in image_paths:
            if cancellation is not None and cancellation.cancelled:
                # D-22: a cancelled job stops the batch; the file is recorded
                # as cancelled and nothing more is sent.
                self._record_cancelled(summary, Path(path))
                break
            try:
                path = Path(path)
                if decide_route(path).route is Engine.CLOUD:
                    self._process_cloud_job(
                        path,
                        summary,
                        consent_granted=consent_granted,
                        cancellation=cancellation,
                    )
                    continue
                result = self._convert_pdf_text_layer(path, vlm_adapter, enhance)
                if result is None:
                    result = vlm_adapter.ocr(str(path), enhance=enhance)
                if cancellation is not None and cancellation.cancelled:
                    # The work finished after the cancel: the result is discarded.
                    self._record_cancelled(summary, path)
                    break

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
                    summary.succeeded += 1
                    summary.job_results.append({
                        "job_id": str(uuid.uuid4()),
                        "source_file": path.name,
                        "status": JobStatus.DONE.value,
                        "error_code": None,
                        "output_path": None,
                        "markdown_content": result,
                    })
                    logger.info("OCR success: %s", path.name)
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

    @staticmethod
    def _record_cancelled(
        summary: BatchSummary, path: Path, engine: str | None = None
    ) -> None:
        """Record a cancelled job: no result, no output file, no retry (D-22)."""
        logger.info("Job cancelled: %s", path.name)
        result = {
            "job_id": str(uuid.uuid4()),
            "source_file": path.name,
            "status": JobStatus.CANCELLED.value,
            "error_code": None,
            "output_path": None,
        }
        if engine is not None:
            result["engine"] = engine
        summary.job_results.append(result)

    def _process_cloud_job(
        self,
        path: Path,
        summary: BatchSummary,
        *,
        consent_granted: bool,
        cancellation=None,
    ) -> None:
        """Route one over-threshold file through the Cloud conversion service.

        A missing consent grant is recorded, never sent: the whole batch keeps
        its FIFO order and the file stays awaiting the gate. A cancelled job
        records ``cancelled``, never ``waiting`` and never ``done`` (D-22).
        """
        service = self._cloud_conversion_service
        if service is None or not consent_granted:
            logger.info("Cloud conversion awaiting consent: %s", path.name)
            summary.job_results.append({
                "job_id": str(uuid.uuid4()),
                "source_file": path.name,
                "status": JobStatus.QUEUED.value,
                "error_code": None,
                "output_path": None,
                "awaiting_consent": True,
            })
            return
        try:
            result = service.convert(
                path,
                consent_granted=consent_granted,
                cancellation=cancellation,
            )
        except CloudConsentRequiredError:
            summary.job_results.append({
                "job_id": str(uuid.uuid4()),
                "source_file": path.name,
                "status": JobStatus.QUEUED.value,
                "error_code": None,
                "output_path": None,
                "awaiting_consent": True,
            })
            return
        except JobCancelledError:
            # D-22: the local wait stopped; the result is discarded.
            self._record_cancelled(summary, path, engine="cloud")
            return
        except ProviderParkedError as exc:
            if cancellation is not None and cancellation.cancelled:
                # D-22: a cancelled job never turns into a parked job.
                self._record_cancelled(summary, path, engine="cloud")
                return
            # D-20: the provider is unavailable or exhausted — park the job with
            # a reason and a retry action. No engine switch, no second job.
            logger.warning("Cloud job parked for %s: %s", path.name, exc.reason)
            summary.job_results.append({
                "job_id": str(uuid.uuid4()),
                "source_file": path.name,
                "status": JobStatus.WAITING.value,
                "reason": exc.reason_key,
                "error_code": exc.error_code,
                "engine": "cloud",
                "output_path": None,
            })
            return
        except ProviderFailure as exc:
            if cancellation is not None and cancellation.cancelled:
                self._record_cancelled(summary, path, engine="cloud")
                return
            # D-20: a key/quota problem fails at once with a specific message.
            logger.error("Cloud job fast-failed for %s: %s", path.name, exc.reason)
            summary.failed += 1
            summary.job_results.append({
                "job_id": str(uuid.uuid4()),
                "source_file": path.name,
                "status": JobStatus.FAILED.value,
                "error_code": exc.error_code,
                "error": exc.reason,
                "fix_key": exc.fix_key,
                "engine": "cloud",
                "output_path": None,
            })
            return
        except CloudConversionError as exc:
            logger.error("Cloud conversion failed for %s: %s", path.name, exc)
            summary.failed += 1
            summary.job_results.append({
                "job_id": str(uuid.uuid4()),
                "source_file": path.name,
                "status": JobStatus.FAILED.value,
                "error_code": "CLOUD_CONVERSION_FAILED",
                "output_path": None,
            })
            return
        summary.succeeded += 1
        output_path = result.output_path
        summary.job_results.append({
            "job_id": str(uuid.uuid4()),
            "source_file": path.name,
            "status": JobStatus.DONE.value,
            "error_code": None,
            "output_path": str(output_path) if output_path is not None else None,
            "markdown_content": result.markdown,
            "engine": result.metadata.get("engine", "cloud"),
            "cloud_model_id": result.metadata.get("model"),
            "awaiting_geometry": list(result.awaiting_geometry),
        })
        logger.info(
            "Cloud job done: %s (%d pages, %d awaiting geometry)",
            path.name,
            result.pages,
            len(result.awaiting_geometry),
        )

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
