"""Model download API routes — start, progress, cancel."""

from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from scan2text.services.model_downloader_service import ModelDownloaderService

router = APIRouter()

# Module-level singleton so the same instance serves all requests.
_download_svc = ModelDownloaderService()


@router.post("/api/download/start")
def start_download() -> Dict[str, Any]:
    """Trigger a model download in the background."""
    try:
        _download_svc.start_download()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return _download_svc.get_progress()


@router.get("/api/download/progress")
def get_download_progress() -> Dict[str, Any]:
    """Return current download state."""
    return _download_svc.get_progress()


@router.post("/api/download/cancel")
def cancel_download() -> Dict[str, Any]:
    """Cancel an in-progress download."""
    _download_svc.cancel()
    return _download_svc.get_progress()
