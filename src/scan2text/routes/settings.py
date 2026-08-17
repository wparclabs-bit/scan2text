from __future__ import annotations

import logging
from typing import Any, Dict

from fastapi import APIRouter, HTTPException
from pydantic import ValidationError

from scan2text.models.errors import ErrorCode, ErrorDetail, ErrorEnvelope
from scan2text.models.settings import AppSettings
from scan2text.services.path_service import PathService
from scan2text.services.settings_service import SettingsService

logger = logging.getLogger("scan2text.routes.settings")
router = APIRouter()


@router.get("/api/settings")
def get_settings() -> AppSettings:
    svc = SettingsService()
    try:
        settings = svc.load()
        if not settings.output_dir.strip():
            path_service = PathService()
            settings = settings.model_copy(update={"output_dir": str(path_service.output_dir)})
        return settings
    except Exception as exc:
        logger.error("Failed to load settings: %s", exc)
        raise HTTPException(status_code=500, detail="SETTINGS_INVALID")


@router.put("/api/settings")
def update_settings(payload: AppSettings) -> AppSettings:
    svc = SettingsService()
    try:
        svc.save(payload)
    except ValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail=ErrorEnvelope(error=ErrorDetail(code=ErrorCode.SETTINGS_INVALID, message=str(exc))).model_dump(),
        )
    return payload
