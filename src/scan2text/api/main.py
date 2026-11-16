"""FastAPI bridge — HTTP endpoints for the Scan2Text OCR pipeline.

Updated for U2-FILE-PATH-MEDIATION: multipart upload replaced with JSON file path payload.
"""

from __future__ import annotations

import asyncio
import logging
import time
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
from scan2text.cloud import routes as cloud_routes
from scan2text.cloud.conversion import CloudConversionService
from scan2text.cloud.route_decision import router as cloud_routing_routes
from scan2text.cloud.routes_convert import build_convert_router
from scan2text.cloud.service import build_production_cloud_service
from scan2text.services.queue_service import QueueService
from scan2text.services.path_service import PathService
from scan2text.adapters.vlm_ocr import VlmOcrAdapter
from scan2text.models.job import JobStatus, TaskStatus

logger = logging.getLogger(__name__)

# D-21: one document has a thirty-minute ceiling; hitting it parks the job with
# a retry button instead of polling forever.
DOCUMENT_CEILING_SECONDS: int = 30 * 60

# In-memory store: task_id -> {status, processed, total, result_markdown, file_paths}
_task_store: Dict[str, Dict[str, Any]] = {}
_ws_manager = ConnectionManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup; clean up on shutdown."""
    adapter = VlmOcrAdapter()
    path_service = PathService()
    cloud_service = build_production_cloud_service(path_service)
    # T05 cleanup — consume the public accessors, never the private attributes.
    cloud_conversion_service = CloudConversionService(
        profile_loader=cloud_service.profile_service.load,
        client_factory=lambda profile, secret: cloud_service.provider_factory(
            profile, secret
        ),
        credential_reader=cloud_service.credential_store.read,
        path_service=path_service,
    )
    queue_svc = QueueService(
        ocr_engine=adapter,
        path_service=path_service,
        cloud_conversion_service=cloud_conversion_service,
    )
    queue_svc._vlm_adapter = adapter
    app.state.queue_service = queue_svc
    app.state.ws_manager = _ws_manager
    app.state.worker_busy = False
    app.state.cloud_service = cloud_service
    app.state.path_service = path_service
    app.state.cloud_profile_service = cloud_service.profile_service
    app.state.cloud_credential_store = cloud_service.credential_store
    app.state.cloud_conversion_service = cloud_conversion_service
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
app.include_router(cloud_routes.router)
app.include_router(cloud_routing_routes)
app.include_router(build_convert_router())

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
    consent_granted: bool = False,
) -> None:
    """Background coroutine that processes files and broadcasts progress."""
    app.state.worker_busy = True
    task = _task_store[task_id]
    total = len(paths)
    task["status"] = TaskStatus.PROCESSING.value
    await _ws_manager.broadcast({
        "task_id": task_id,
        "status": TaskStatus.PROCESSING.value,
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
            consent_granted=consent_granted,
        )
        processed = summary.succeeded + summary.failed
        task["processed"] = processed
        task["total"] = summary.total_inputs
        cloud_jobs = [
            jr for jr in summary.job_results if jr.get("engine") == "cloud"
        ]
        if cloud_jobs:
            task["engine"] = "cloud"
            task["cloud_model_id"] = cloud_jobs[0].get("cloud_model_id")
        elif summary.job_results:
            task["engine"] = "local"
        waiting_jobs = [
            jr for jr in summary.job_results
            if jr.get("status") == JobStatus.WAITING.value
        ]
        if waiting_jobs:
            # D-20/D-34: a parked job is a waiting task, never a completed one.
            first = waiting_jobs[0]
            task["status"] = TaskStatus.WAITING.value
            task["reason"] = first.get("reason")
            task["error_code"] = first.get("error_code")
        elif summary.succeeded == 0 and summary.failed > 0:
            task["status"] = TaskStatus.FAILED.value
            propagated = next(
                (
                    jr.get("error_code")
                    for jr in summary.job_results
                    if jr.get("error_code")
                ),
                None,
            )
            task["error_code"] = propagated or "OCR_FAILED"
        elif summary.succeeded > 0 and summary.failed > 0:
            task["status"] = TaskStatus.COMPLETED.value
            task["error_code"] = "PARTIAL_FAILURE"
        else:
            task["status"] = TaskStatus.COMPLETED.value
        # Collect result markdown from successful jobs.
        # VLM OCR jobs populate markdown_content directly; legacy jobs use output_path on disk.
        result_parts: List[str] = []
        for jr in summary.job_results:
            if jr.get("markdown_content"):
                result_parts.append(jr["markdown_content"])
            elif jr.get("output_path"):
                try:
                    result_parts.append(Path(jr["output_path"]).read_text(encoding="utf-8"))
                except Exception:
                    pass
        task["result_markdown"] = "\n---\n".join(result_parts) or None
        await _ws_manager.broadcast({
            "task_id": task_id,
            "status": task["status"],
            "processed": processed,
            "total": summary.total_inputs,
        })
        app.state.worker_busy = False
    except Exception as exc:
        logger.error("Batch processing failed: %s", exc)
        task["status"] = TaskStatus.FAILED.value
        task["error_code"] = "UNKNOWN_ERROR"
        await _ws_manager.broadcast({
            "task_id": task_id,
            "status": TaskStatus.FAILED.value,
            "processed": task["processed"],
            "total": total,
        })
        app.state.worker_busy = False

# NEW ENDPOINT: JSON file path mediation (replaces multipart upload)
@app.post("/process", status_code=202)
async def process_files_json(
    payload: Dict[str, Any] = Body(..., description="JSON payload with file_paths"),
) -> JSONResponse:
    """Trigger batch OCR processing via JSON file paths.

    Payload format: {"file_paths": ["C:/path/to/file.png", "D:/another.jpg"], "enhance": bool}
    Tauri provides absolute paths; backend validates and processes directly from disk.
    """
    file_paths = payload.get("file_paths", [])
    enhance = payload.get("enhance", False)
    consent_granted = bool(payload.get("consent_granted", False))
    if not file_paths:
        raise HTTPException(status_code=400, detail="No files provided")
    # Validate paths are absolute Windows paths
    for p in file_paths:
        if not isinstance(p, str):
            raise HTTPException(status_code=422, detail="Invalid path format")
        if not Path(p).is_absolute():
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
        "status": TaskStatus.QUEUED.value,
        "processed": 0,
        "total": len(paths),
        "result_markdown": None,
        "file_paths": file_paths,
        "started_at": time.monotonic(),
    }
    asyncio.create_task(
        _run_processing(
            task_id,
            queue,
            paths,
            path_to_stem,
            enhance=enhance,
            consent_granted=consent_granted,
        )
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
        "status": TaskStatus.QUEUED.value,
        "processed": 0,
        "total": len(saved_paths),
        "result_markdown": None,
        "started_at": time.monotonic(),
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
    # D-21: a processing task older than the ceiling is parked, not polled for
    # ever. The reason is a short key the frontend renders as a sentence.
    if (
        task["status"] == TaskStatus.PROCESSING.value
        and time.monotonic() - task.get("started_at", time.monotonic())
        > DOCUMENT_CEILING_SECONDS
    ):
        task["status"] = TaskStatus.WAITING.value
        task["reason"] = "ceiling"
        task["error_code"] = "DOCUMENT_TIMEOUT"
    result: Dict[str, Any] = {
        "task_id": task_id,
        "status": task["status"],
        "processed": task["processed"],
        "total": task["total"],
    }
    if task.get("error_code"):
        result["error_code"] = task["error_code"]
    if task["status"] == TaskStatus.WAITING.value and task.get("reason"):
        result["reason"] = task["reason"]
    if task["status"] == TaskStatus.COMPLETED.value and task.get("engine"):
        result["engine"] = task["engine"]
        if task["engine"] == "cloud" and task.get("cloud_model_id"):
            result["cloud_model_id"] = task["cloud_model_id"]
    if task["status"] == TaskStatus.COMPLETED.value and task.get("result_markdown"):
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
