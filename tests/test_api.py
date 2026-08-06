"""Tests for the FastAPI bridge — POST /process, GET /status/{task_id}, CORS, WebSocket."""

from __future__ import annotations

import asyncio
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


class _FakeSummary:
    """Minimal BatchSummary-like object for tests."""
    def __init__(self, succeeded=1, failed=0, total_inputs=1):
        self.succeeded = succeeded
        self.failed = failed
        self.total_inputs = total_inputs
        self.job_results = [{"job_id": "j1", "source_file": "f.png", "status": "done", "error_code": None, "output_path": None}]


@pytest.fixture
def app():
    with patch("scan2text.api.main.QueueService") as MockQS, \
         patch("scan2text.api.main.VlmOcrAdapter") as MockVlm:
        mock_qs = MagicMock()
        mock_qs._vlm_adapter = MagicMock()
        mock_qs.process_image_paths.return_value = _FakeSummary()
        MockQS.return_value = mock_qs

        mock_vlm = MagicMock()
        MockVlm.return_value = mock_vlm

        from scan2text.api.main import app as api_app
        yield api_app, mock_qs


class TestProcessEndpoint:
    def test_post_process_returns_202(self, app):
        """POST /process accepts multipart files and returns 202."""
        api_app, mock_qs = app
        with TestClient(api_app) as client:
            response = client.post(
                "/process",
                files=[
                    ("files", ("doc1.png", b"fake image bytes 1")),
                    ("files", ("doc2.jpg", b"fake image bytes 2")),
                ],
            )

        assert response.status_code == 202
        data = response.json()
        assert "task_id" in data
        task_id = data["task_id"]

        # Verify the saved paths were passed to the queue service
        call_args = mock_qs.process_image_paths.call_args
        saved_paths = call_args[0][0]
        assert len(saved_paths) == 2
        for p in saved_paths:
            assert isinstance(p, Path)
            assert p.exists()

    def test_post_process_creates_task_in_store(self, app):
        """POST /process registers the task in the in-memory store."""
        api_app, _ = app
        with TestClient(api_app) as client:
            response = client.post(
                "/process",
                files={"files": ("doc1.png", b"fake image bytes")},
            )

        assert response.status_code == 202
        task_id = response.json()["task_id"]

        from scan2text.api.main import _task_store
        assert task_id in _task_store
        # Background task runs synchronously with mocks, so status may already be completed.
        assert _task_store[task_id]["total"] == 1
        assert _task_store[task_id]["status"] in ("processing", "completed")

    def test_post_process_rejects_empty_upload(self, app):
        """POST /process returns 400 when no files are provided."""
        api_app, _ = app
        with TestClient(api_app) as client:
            response = client.post("/process")

        assert response.status_code == 400
        assert "No files provided" in response.json()["detail"]

    def test_post_process_saves_files_to_uploads_dir(self, app, tmp_path):
        """Uploaded files are saved to the uploads/ directory with UUID names."""
        api_app, _ = app
        from scan2text.api.main import UPLOADS_DIR

        # Use a temporary uploads dir for this test
        with patch("scan2text.api.main.UPLOADS_DIR", tmp_path / "uploads"):
            with TestClient(api_app) as client:
                response = client.post(
                    "/process",
                    files={"files": ("report.pdf", b"fake pdf content")},
                )

        assert response.status_code == 202
        uploaded_files = list((tmp_path / "uploads").iterdir())
        assert len(uploaded_files) == 1
        # Filename should be UUID-based (64 hex chars + .pdf)
        name = uploaded_files[0].name
        stem = Path(name).stem
        suffix = Path(name).suffix
        assert len(stem) == 32  # uuid4 hex is 32 chars
        assert suffix == ".pdf"


class TestStatusEndpoint:
    def test_get_status_returns_task_progress(self, app):
        """GET /status/{task_id} returns the current state of a specific task."""
        api_app, _ = app
        from scan2text.api.main import _task_store

        task_id = "test-task-123"
        _task_store[task_id] = {
            "status": "processing",
            "processed": 3,
            "total": 5,
            "result_markdown": None,
        }

        with TestClient(api_app) as client:
            response = client.get(f"/status/{task_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == task_id
        assert data["status"] == "processing"
        assert data["processed"] == 3
        assert data["total"] == 5

    def test_get_status_returns_404_for_missing_task(self, app):
        """GET /status/{task_id} returns 404 if the task doesn't exist."""
        api_app, _ = app
        with TestClient(api_app) as client:
            response = client.get("/status/nonexistent-task")

        assert response.status_code == 404

    def test_get_status_includes_result_markdown_when_completed(self, app):
        """GET /status/{task_id} includes result_markdown when completed."""
        api_app, _ = app
        from scan2text.api.main import _task_store

        task_id = "test-task-done"
        _task_store[task_id] = {
            "status": "completed",
            "processed": 2,
            "total": 2,
            "result_markdown": "# OCR Result\n\nSome text.",
        }

        with TestClient(api_app) as client:
            response = client.get(f"/status/{task_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["result_markdown"] == "# OCR Result\n\nSome text."

    def test_get_status_excludes_result_markdown_when_not_completed(self, app):
        """GET /status/{task_id} omits result_markdown for non-completed tasks."""
        api_app, _ = app
        from scan2text.api.main import _task_store

        task_id = "test-task-pending"
        _task_store[task_id] = {
            "status": "queued",
            "processed": 0,
            "total": 3,
            "result_markdown": None,
        }

        with TestClient(api_app) as client:
            response = client.get(f"/status/{task_id}")

        assert response.status_code == 200
        data = response.json()
        assert "result_markdown" not in data


class TestCors:
    def test_cors_allows_local_react_origin(self, app):
        """CORS middleware allows requests from localhost:5173 (React dev server)."""
        api_app, _ = app
        with TestClient(api_app) as client:
            response = client.get(
                "/status/some-task",
                headers={"Origin": "http://localhost:5173"},
            )

        # 404 is expected since the task doesn't exist; CORS header should still be present.
        allow_origin = response.headers.get("access-control-allow-origin")
        assert allow_origin in ("*", "http://localhost:5173")

    def test_cors_preflight_returns_200(self, app):
        """OPTIONS preflight request returns 200 with CORS headers."""
        api_app, _ = app
        with TestClient(api_app) as client:
            response = client.options(
                "/process",
                headers={
                    "Origin": "http://localhost:5173",
                    "Access-Control-Request-Method": "POST",
                },
            )

        assert response.status_code == 200
        allow_origin = response.headers.get("access-control-allow-origin")
        assert allow_origin in ("*", "http://localhost:5173")


class TestWebSocket:
    def test_websocket_ping_pong(self, app):
        """WebSocket responds to 'ping' with 'pong'."""
        api_app, _ = app
        with TestClient(api_app) as client:
            websocket = client.websocket_connect("/ws/progress")
            with websocket as ws:
                ws.send_text("ping")
                data = ws.receive_text()
                assert data == "pong"
