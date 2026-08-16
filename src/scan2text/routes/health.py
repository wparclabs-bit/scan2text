from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import psutil
from fastapi import APIRouter, Request

from scan2text.services.path_service import PathService
from scan2text.services.settings_service import SettingsService

logger = logging.getLogger("scan2text.routes.health")

router = APIRouter()

BACKEND_VERSION = "0.1.0"
MODEL_NAME = "OvisOCR2 0.9B"


def _ram() -> Dict[str, Any]:
    vm = psutil.virtual_memory()
    return {
        "total_mb": int(vm.total // (1024 * 1024)),
        "used_mb": int(vm.used // (1024 * 1024)),
        "percent": float(vm.percent),
    }


def _cpu() -> Dict[str, Any]:
    return {
        "percent": float(psutil.cpu_percent()),
    }


def _get_adapter_state(request: Request) -> Dict[str, bool]:
    """Return the adapter's loaded state, or defaults if adapter is unavailable."""
    queue_svc = getattr(request.app.state, "queue_service", None)
    adapter = getattr(queue_svc, "_vlm_adapter", None) if queue_svc else None
    if adapter is not None:
        return {"loaded": bool(adapter.loaded)}
    paths = PathService()
    settings = SettingsService(path_service=paths).load()
    model_rel = settings.model_path or "models/vlm.gguf"
    mmproj_rel = settings.mmproj_path or "models/mmproj.gguf"
    files_present = paths.resolve_model_path(model_rel).is_file() and paths.resolve_model_path(mmproj_rel).is_file()
    return {"loaded": files_present}


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

    adapter_state = _get_adapter_state(request)

    return {
        "status": "ok",
        "worker": worker,
        "ram": _ram(),
        "cpu": _cpu(),
        "model": {
            "name": MODEL_NAME,
            "loaded": adapter_state["loaded"],
            "files_present": files_present,
        },
        "version": BACKEND_VERSION,
    }
