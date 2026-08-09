from __future__ import annotations

import logging
from typing import Any, Dict

import psutil
from fastapi import APIRouter, Request

from scan2text.services.path_service import PathService
from scan2text.services.settings_service import SettingsService

logger = logging.getLogger("scan2text.routes.health")

router = APIRouter()

BACKEND_VERSION = "0.1.0"
MODEL_NAME = "GLM-OCR 0.9B"


def _ram() -> Dict[str, Any]:
    vm = psutil.virtual_memory()
    return {
        "total_mb": int(vm.total // (1024 * 1024)),
        "used_mb": int(vm.used // (1024 * 1024)),
        "percent": float(vm.percent),
    }


@router.get("/api/health")
def health(request: Request) -> Dict[str, Any]:
    paths = PathService()
    settings = SettingsService(path_service=paths).load()

    model_rel = settings.model_path or "models/vlm.gguf"
    mmproj_rel = settings.mmproj_path or "models/mmproj.gguf"
    files_present = paths.resolve_model_path(model_rel).is_file() and paths.resolve_model_path(mmproj_rel).is_file()

    worker = "idle"
    if getattr(request.app.state, "worker_busy", False):
        worker = "busy"

    return {
        "status": "ok",
        "worker": worker,
        "ram": _ram(),
        "model": {
            "name": MODEL_NAME,
            "loaded": False,
            "files_present": files_present,
        },
        "version": BACKEND_VERSION,
    }
