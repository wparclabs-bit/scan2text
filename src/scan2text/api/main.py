"""FastAPI bridge — HTTP endpoints for the Scan2Text OCR pipeline."""

from __future__ import annotations

import asyncio
import logging
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Request, UploadFile, Form, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from scan2text.api.websocket_manager import ConnectionManager
from scan2text.routes import health as health_routes
from scan2text.routes import settings as settings_routes
from scan2text.routes import feedback as feedback_routes
from scan2text.routes import download as download_routes
from scan2text.services.queue_service import QueueService
from scan2text.services.path_service import PathService
from scan2text.adapters.vlm_ocr import VlmOcrAdapter

logger = logging.getLogger(__name__)


# In-memory store: task_id -> {status, processed, total, result_markdown}
_task_store: Dict[str, Dict[str, Any]] = {}
_ws_manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup; clean up on shutdown."""
    adapter = VlmOcrAdapter()
    queue_svc = QueueService(ocr_engine=adapter)
    queue_svc._vlm_adapter = adapter
    app.state.queue_service = queue_svc
    app.state.ws_manager = _ws_manager
    app.state.worker_busy = False
    logger.info("Scan2Text API started")
    yield
    logger.info("Scan2Text API shut down")


app = FastAPI(
    title="Scan2Text OCR API",
    description="Portable offline OCR — converts images & PDFs to Markdown locally.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_routes.router)
app.include_router(settings_routes.router)
app.include_router(feedback_routes.router)
app.include_router(download_routes.router)


UPLOADS_DIR = Path(__file__).resolve().parents[3] / "uploads"


def _ensure_uploads_dir() -> Path:
    """Create the uploads directory if it does not exist."""
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    return UPLOADS_DIR


async def _save_uploaded_file(file: UploadFile) -> tuple[Path, str]:
    """Save an uploaded file to the uploads/ directory with a UUID filename.

    Returns:
        (target_path, desired_stem) — the UUID-named path on disk and the
        sanitized original filename stem for output naming.
    """
    uploads_dir = _ensure_uploads_dir()
    ext = Path(file.filename).suffix if file.filename else ""
    unique_name = f"{uuid.uuid4().hex}{ext}"
    target_path = uploads_dir / unique_name
    content = await file.read()
    target_path.write_bytes(content)

    if file.filename:
        desired_stem = PathService.sanitize_filename(Path(file.filename).stem)
    else:
        desired_stem = PathService.sanitize_filename(Path(unique_name).stem)

    return target_path, desired_stem


async def _run_processing(
    task_id: str,
    queue: QueueService,
    paths: List[Path],
    path_to_stem: Dict[Path, str],
) -> None:
    """Background coroutine that processes files and broadcasts progress."""
    app.state.worker_busy = True
    task = _task_store[task_id]
    total = len(paths)
    task["status"] = "processing"
    await _ws_manager.broadcast({
        "task_id": task_id,
        "status": "processing",
        "processed": 0,
        "total": total,
    })

    try:
        summary = await asyncio.to_thread(
            queue.process_image_paths, paths, queue._vlm_adapter, path_to_stem
        )
        processed = summary.succeeded + summary.failed
        task["processed"] = processed
        task["total"] = summary.total_inputs
        if summary.succeeded == 0 and summary.failed > 0:
            task["status"] = "failed"
            task["error_code"] = "OCR_FAILED"
        elif summary.succeeded > 0 and summary.failed > 0:
            task["status"] = "completed"
            task["error_code"] = "PARTIAL_FAILURE"
        else:
            task["status"] = "completed"

        # Collect result markdown from successful jobs
        result_parts: List[str] = []
        for jr in summary.job_results:
            if jr.get("output_path"):
                try:
                    result_parts.append(Path(jr["output_path"]).read_text(encoding="utf-8"))
                except Exception:
                    pass
        task["result_markdown"] = "\n---\n".join(result_parts) or None

        await _ws_manager.broadcast({
            "task_id": task_id,
            "status": "completed",
            "processed": processed,
            "total": summary.total_inputs,
        })
        app.state.worker_busy = False
    except Exception as exc:
        logger.error("Batch processing failed: %s", exc)
        task["status"] = "failed"
        task["error_code"] = "UNKNOWN_ERROR"
        await _ws_manager.broadcast({
            "task_id": task_id,
            "status": "failed",
            "processed": task["processed"],
            "total": total,
        })
        app.state.worker_busy = False


@app.post("/process", status_code=202)
async def process_files(files: List[UploadFile] = Form(default=[])) -> JSONResponse:
    """Trigger batch OCR processing for uploaded files.

    Accepts multipart/form-data with one or more files. Each file is saved
    to a local uploads/ directory and then processed by the background worker.

    Returns a task ID immediately (async fire-and-forget style).
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    queue: QueueService = app.state.queue_service
    saved_paths: List[Path] = []
    path_to_stem: Dict[Path, str] = {}
    for f in files:
        path, desired_stem = await _save_uploaded_file(f)
        saved_paths.append(path)
        path_to_stem[path] = desired_stem
    task_id = str(uuid.uuid4())

    _task_store[task_id] = {
        "status": "queued",
        "processed": 0,
        "total": len(saved_paths),
        "result_markdown": None,
    }

    asyncio.create_task(_run_processing(task_id, queue, saved_paths, path_to_stem))

    return JSONResponse(content={"task_id": task_id}, status_code=202)


@app.get("/status/{task_id}")
def get_status(task_id: str) -> Any:
    """Return the current state of a specific task."""
    if task_id not in _task_store:
        raise HTTPException(status_code=404, detail="Task not found")

    task = _task_store[task_id]
    result: Dict[str, Any] = {
        "task_id": task_id,
        "status": task["status"],
        "processed": task["processed"],
        "total": task["total"],
    }
    if task.get("error_code"):
        result["error_code"] = task["error_code"]
    if task["status"] == "completed" and task.get("result_markdown"):
        result["result_markdown"] = task["result_markdown"]
    return result




@app.websocket("/ws/progress")
async def websocket_progress(websocket: WebSocket) -> None:
    """WebSocket endpoint for real-time task progress updates."""
    await websocket.accept()
    await _ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        logger.debug("WebSocket client disconnected")
    except Exception as exc:
        logger.warning("WebSocket error: %s", exc)
    finally:
        await _ws_manager.disconnect(websocket)
