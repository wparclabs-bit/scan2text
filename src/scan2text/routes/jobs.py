from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from scan2text.models.errors import ErrorCode, ErrorDetail, ErrorEnvelope
from scan2text.models.job import JobStatus, OCRJob
from scan2text.services.settings_service import SettingsService
from scan2text.services.output_service import save_markdown
from scan2text.adapters.ocr_engine import OCREngine

logger = logging.getLogger("scan2text.routes.jobs")
router = APIRouter()


class ProcessRequest(BaseModel):
    """Payload for POST /api/jobs/process — list of file paths."""
    file_paths: List[str]


# In-memory queue (replace with persistent store later)
_job_queue: List[OCRJob] = []


def _add_job(file_name: str, file_path: str) -> OCRJob:
    job = OCRJob(file_name=file_name, file_path=file_path, status=JobStatus.QUEUED)
    _job_queue.append(job)
    return job


@router.post("/api/jobs", status_code=201)
def create_job(payload: Dict[str, Any]) -> OCRJob:
    """Register a single file as an OCR job."""
    job = _add_job(
        file_name=payload["file_name"],
        file_path=payload["file_path"],
    )
    logger.info("Job created: %s (%s)", job.id, job.file_name)
    return job


@router.get("/api/jobs")
def list_jobs() -> List[OCRJob]:
    return _job_queue


@router.get("/api/jobs/{job_id}")
def get_job(job_id: str) -> Optional[OCRJob]:
    for j in _job_queue:
        if j.id == job_id:
            return j
    return None


@router.post("/api/jobs/process")
async def process_jobs(ocr_engine: OCREngine = Depends(lambda: _get_ocr_engine())) -> List[Dict[str, Any]]:
    """Start processing all queued jobs (in FIFO order)."""
    pending = [j for j in _job_queue if j.status == JobStatus.QUEUED]
    results = []

    for job in pending:
        try:
            job.status = JobStatus.PROCESSING
            # ... call ocr_engine to process the file ...
            full_text = "[placeholder]"
            pages = []  # OCRPage instances
            output_path = save_markdown(job, full_text=full_text, pages=pages)
            job.output_path = output_path
            job.status = JobStatus.DONE
        except Exception as exc:
            job.status = JobStatus.FAILED
            job.error_code = ErrorCode.UNKNOWN_ERROR
            job.error_message = str(exc)

        results.append({
            "id": job.id,
            "status": job.status.value,
            "output_path": job.output_path,
            "error_code": job.error_code,
        })

    return results


def _get_ocr_engine() -> OCREngine:
    from scan2text.main import get_app_ocr_engine
    return get_app_ocr_engine()


@router.post("/api/jobs/{job_id}/open-output")
def open_output(job_id: str) -> Dict[str, str]:
    """Return the path of a completed job's Markdown file."""
    for j in _job_queue:
        if j.id == job_id and j.output_path:
            return {"path": j.output_path}
    raise HTTPException(status_code=404, detail="Job not found or no output yet.")


@router.post("/api/output/open")
def open_output_folder() -> Dict[str, str]:
    from scan2text.services.path_service import get_paths
    out_dir = get_paths().output_dir.resolve()
    return {"path": str(out_dir)}
