from __future__ import annotations

import logging
from typing import Dict, Any

from fastapi import APIRouter, HTTPException

from scan2text.models.errors import ErrorCode, ErrorDetail
from scan2text.services.path_service import get_paths
from scan2text.services.logging_service import setup_logging
from scan2text.adapters.ocr_engine import OCREngine

logger = logging.getLogger("scan2text.routes.health")

router = APIRouter()


@router.get("/api/health")
def health() -> Dict[str, Any]:
    paths = get_paths()
    model_path = paths.models_dir / "ovisocr2-q8.gguf"
    return {
        "status": "ok",
        "model_found": model_path.exists(),
        "output_dir": str(paths.output_dir.resolve()),
        "settings_file": str(paths.settings_file.resolve()),
    }


def create_app(ocr_engine: OCREngine) -> FastAPI: ...  # stub — implemented in main.py
