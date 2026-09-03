"""FastAPI bridge — HTTP endpoints for the Scan2Text OCR pipeline.

Updated for U2-FILE-PATH-MEDIATION: multipart upload replaced with JSON file path payload.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List
from fastapi import Form

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect, Body
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

# In-memory store: task_id -> {status, processed, total, result_markdown, file_paths}
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

# UPLOADS_DIR is retired — no longer used for incoming file data
UPLOADS_DIR = Path(__file__).resolve().parents[3] / "uploads"

def _ensure_uploads_dir() -> Path:
    """Legacy directory maintenance (kept for existing file cleanup)."""
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    return UPLOADS_DIR

async def _save_uploaded_file(file: UploadFile) -> tuple[Path, str]:
    """Legacy file saving for backward compatibility (unused in JSON flow)."""
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
    enhance: bool = False,
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
            queue.process_image_paths,
            paths,
            queue._vlm_adapter,
            path_to_stem,
            enhance=enhance,
        )
        processed = summary.succeeded + summary.failed
        task["processed"] = processed
        task["total"] = summary.total_inputs
        if summary.succeeded == 0 and summary.failed > 0:
            task["status"] = "failed"
            if not task.get("error_code"):
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

# NEW ENDPOINT: JSON file path mediation (replaces multipart upload)
@app.post("/process", status_code=202)
async def process_files_json(
    payload: Dict[str, List[str]] = Body(..., description="JSON payload with file_paths"),
    enhance: bool = Form(default=False),
) -> JSONResponse:
    """Trigger batch OCR processing via JSON file paths.

    Payload format: {"file_paths": ["C:/path/to/file.png", "D:/another.jpg"]}
    Tauri provides absolute paths; backend validates and processes directly from disk.
    """
    file_paths = payload.get("file_paths", [])
    if not file_paths:
        raise HTTPException(status_code=400, detail="No files provided")
    # Validate paths are absolute Windows paths
    for p in file_paths:
        if not isinstance(p, str):
            raise HTTPException(status_code=422, detail="Invalid path format")
        if not p.startswith(('C:/', 'D:/', 'E:/', 'F:/')):
            raise HTTPException(status_code=422, detail="Path must be absolute Windows path")
        if not Path(p).exists():
            raise HTTPException(status_code=422, detail=f"File not found: {p}")
    queue: QueueService = app.state.queue_service
    paths: List[Path] = []
    path_to_stem: Dict[Path, str] = {}
    for p in file_paths:
        path = Path(p)
        paths.append(path)
        path_to_stem[path] = PathService.sanitize_filename(path.stem)
    task_id = str(uuid.uuid4())
    _task_store[task_id] = {
        "status": "queued",
        "processed": 0,
        "total": len(paths),
        "result_markdown": None,
        "file_paths": file_paths,
    }
    asyncio.create_task(
        _run_processing(task_id, queue, paths, path_to_stem, enhance=enhance)
    )
    return JSONResponse(content={"task_id": task_id}, status_code=202)

# LEGACY ENDPOINT (kept for backward compatibility, will be removed in next release)
@app.post("/process_multipart", status_code=202)
async def process_files_multipart(
    files: List[UploadFile] = Form(default=[]),
    enhance: bool = Form(default=False),
) -> JSONResponse:
    """Legacy multipart endpoint — retained temporarily for migration period."""
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
    asyncio.create_task(
        _run_processing(task_id, queue, saved_paths, path_to_stem, enhance=enhance)
    )
    return JSONResponse(content={"task_id": task_id}, status_code=202)

@app.get("/status/{task_id}")
async def get_status(task_id: str) -> Any:
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
