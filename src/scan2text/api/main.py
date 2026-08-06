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
from scan2text.services.queue_service import QueueService
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


UPLOADS_DIR = Path(__file__).resolve().parents[3] / "uploads"


def _ensure_uploads_dir() -> Path:
    """Create the uploads directory if it does not exist."""
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    return UPLOADS_DIR


async def _save_uploaded_file(file: UploadFile) -> Path:
    """Save an uploaded file to the uploads/ directory with a UUID filename."""
    uploads_dir = _ensure_uploads_dir()
    ext = Path(file.filename).suffix if file.filename else ""
    unique_name = f"{uuid.uuid4().hex}{ext}"
    target_path = uploads_dir / unique_name
    content = await file.read()
    target_path.write_bytes(content)
    return target_path


async def _run_processing(task_id: str, queue: QueueService, paths: List[Path]) -> None:
    """Background coroutine that processes files and broadcasts progress."""
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
        summary = queue.process_image_paths(paths, queue._vlm_adapter)
        processed = summary.succeeded + summary.failed
        task["processed"] = processed
        task["total"] = summary.total_inputs
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
    except Exception as exc:
        logger.error("Batch processing failed: %s", exc)
        task["status"] = "failed"
        await _ws_manager.broadcast({
            "task_id": task_id,
            "status": "failed",
            "processed": task["processed"],
            "total": total,
        })


@app.post("/process", status_code=202)
async def process_files(files: List[UploadFile] = Form(default=[])) -> Dict[str, str]:
    """Trigger batch OCR processing for uploaded files.

    Accepts multipart/form-data with one or more files. Each file is saved
    to a local uploads/ directory and then processed by the background worker.

    Returns a task ID immediately (async fire-and-forget style).
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    queue: QueueService = app.state.queue_service
    saved_paths = []
    for f in files:
        saved_paths.append(await _save_uploaded_file(f))
    task_id = str(uuid.uuid4())

    _task_store[task_id] = {
        "status": "queued",
        "processed": 0,
        "total": len(saved_paths),
        "result_markdown": None,
    }

    asyncio.create_task(_run_processing(task_id, queue, saved_paths))

    return {"task_id": task_id}


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
