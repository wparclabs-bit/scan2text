from __future__ import annotations

import logging
import sys
from pathlib import Path

import click
import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from scan2text.adapters.ocr_engine import OCREngine, FakeOCR
from scan2text.routes import health as health_routes
from scan2text.routes import settings as settings_routes
from scan2text.routes import jobs as jobs_routes
from scan2text.services.logging_service import setup_logging

logger = logging.getLogger("scan2text.engine")

# Module-level singleton reference (set by create_app).
_ocr_engine: OCREngine | None = None


def get_app_ocr_engine() -> OCREngine:
    if _ocr_engine is None:
        raise RuntimeError("App not initialised — call create_app() first.")
    return _ocr_engine


def create_app(ocr_engine: OCREngine | None = None) -> FastAPI:
    """Create and configure the FastAPI application."""
    global _ocr_engine
    _ocr_engine = ocr_engine or OCREngine()  # type: ignore[assignment]

    app = FastAPI(title="Scan2Text", version="0.1.0")

    # Mount static assets
    ui_static = Path(__file__).parent / "ui" / "static"
    app.mount("/static", StaticFiles(directory=str(ui_static)), name="static")

    # Register routes
    app.include_router(health_routes.router)
    app.include_router(settings_routes.router)
    app.include_router(jobs_routes.router)

    @app.on_event("startup")
    async def startup():
        from scan2text.services.path_service import get_paths
        paths = get_paths()
        paths.ensure_dirs()
        setup_logging(paths.log_file)
        logger.info("Scan2Text starting (root=%s)", paths.exe_root)

        # Pre-load model in background if configured
        if isinstance(_ocr_engine, OCREngine):
            model_path = paths.models_dir / "vlm.gguf"
            mmproj = paths.models_dir / "mmproj.gguf"
            if not model_path.exists():
                logger.warning("Model not found at %s — OCR will fail until provided.", model_path)

    return app


def launch_app(port: int = 8765) -> None:
    """Start the FastAPI server in headless mode."""
    app = create_app(FakeOCR())  # default to FakeOCR; swap for real engine later.
    uvicorn.run(app, host="0.0.0.0", port=port)


@click.command()
@click.option("--port", default=8765, help="HTTP port for the local server.")
def cli(port: int) -> None:
    launch_app(port=port)


if __name__ == "__main__":
    sys.exit(cli())
