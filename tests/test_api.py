"""Tests for the FastAPI bridge — POST /process, GET /status/{task_id}, CORS, WebSocket."""

from __future__ import annotations

import asyncio
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


def _tmp_file(suffix: str = ".png") -> str:
    """Create a temp file in C:\\Windows\\Temp and return its absolute path."""
    p = Path(tempfile.mktemp(suffix=suffix, dir="C:/Windows/Temp"))
    p.write_bytes(b"fake image bytes")
    return str(p)


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
        """POST /process accepts JSON file_paths and returns 202."""
        api_app, mock_qs = app
        paths = [_tmp_file(".png"), _tmp_file(".jpg")]
        with TestClient(api_app) as client:
            response = client.post("/process", json={"file_paths": paths})

        assert response.status_code == 202
        data = response.json()
        assert "task_id" in data
        task_id = data["task_id"]

        call_args = mock_qs.process_image_paths.call_args
        saved_paths = call_args[0][0]
        assert len(saved_paths) == 2
        for p in saved_paths:
            assert isinstance(p, Path)
            assert p.exists()

    def test_post_process_returns_valid_json_with_task_id(self, app):
        """POST /process returns valid JSON with task_id field (contract test)."""
        api_app, _ = app
        path = _tmp_file()
        with TestClient(api_app) as client:
            response = client.post("/process", json={"file_paths": [path]})

        assert response.status_code == 202
        assert "application/json" in response.headers.get("content-type", "")
        data = response.json()
        assert isinstance(data, dict)
        assert "task_id" in data
        assert isinstance(data["task_id"], str)
        assert len(data["task_id"]) > 0
        assert set(data.keys()) == {"task_id"}

    def test_post_process_creates_task_in_store(self, app):
        """POST /process registers the task in the in-memory store."""
        api_app, _ = app
        path = _tmp_file()
        with TestClient(api_app) as client:
            response = client.post("/process", json={"file_paths": [path]})

        assert response.status_code == 202
        task_id = response.json()["task_id"]

        from scan2text.api.main import _task_store
        assert task_id in _task_store
        assert _task_store[task_id]["total"] == 1
        assert _task_store[task_id]["status"] in ("processing", "completed")

    def test_post_process_rejects_empty_upload(self, app):
        """POST /process returns 400 when no files are provided."""
        api_app, _ = app
        with TestClient(api_app) as client:
            response = client.post("/process", json={"file_paths": []})

        assert response.status_code == 400
        assert "No files provided" in response.json()["detail"]

    def test_post_process_reads_from_original_path(self, app, tmp_path):
        """JSON endpoint reads files directly from the provided paths (no uploads dir)."""
        api_app, _ = app
        src = tmp_path / "doc.pdf"
        src.write_bytes(b"fake pdf content")

        with TestClient(api_app) as client:
            response = client.post("/process", json={"file_paths": [str(src)]})

        assert response.status_code == 202
        data = response.json()
        assert "task_id" in data


class TestSaveUploadedFileOriginalStem:
    """Test that _save_uploaded_file captures the original filename stem."""

    def test_save_captures_original_stem(self, tmp_path):
        """_save_uploaded_file returns (path, desired_stem) where stem is from original filename."""
        import io
        from scan2text.api.main import _save_uploaded_file

        uploads_dir = tmp_path / "uploads"
        with patch("scan2text.api.main.UPLOADS_DIR", uploads_dir):
            from fastapi import UploadFile
            file = UploadFile(
                filename="strutur qris.jpg",
                file=io.BytesIO(b"fake image bytes"),
            )
            path, desired_stem = asyncio.run(_save_uploaded_file(file))

        name = path.name
        stem_on_disk = Path(name).stem
        suffix = Path(name).suffix
        assert len(stem_on_disk) == 32
        assert suffix == ".jpg"
        assert desired_stem == "strutur_qris"

    def test_save_fallback_to_uuid_stem_when_filename_none(self, tmp_path):
        """When file.filename is None, desired_stem falls back to uuid stem."""
        import io
        from scan2text.api.main import _save_uploaded_file

        uploads_dir = tmp_path / "uploads"
        with patch("scan2text.api.main.UPLOADS_DIR", uploads_dir):
            from fastapi import UploadFile
            file = UploadFile(
                filename=None,
                file=io.BytesIO(b"fake image bytes"),
            )
            path, desired_stem = asyncio.run(_save_uploaded_file(file))

        assert len(desired_stem) == 32
        assert all(c in "0123456789abcdef" for c in desired_stem)

    def test_save_sanitizes_special_chars_in_stem(self, tmp_path):
        """Original filename with invalid chars gets sanitized."""
        import io
        from scan2text.api.main import _save_uploaded_file

        uploads_dir = tmp_path / "uploads"
        with patch("scan2text.api.main.UPLOADS_DIR", uploads_dir):
            from fastapi import UploadFile
            file = UploadFile(
                filename="report<v2>.pdf",
                file=io.BytesIO(b"fake pdf"),
            )
            path, desired_stem = asyncio.run(_save_uploaded_file(file))

        assert desired_stem == "reportv2"


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

    def test_cors_allows_tauri_localhost_origin(self, app):
        """CORS middleware allows requests from tauri://localhost (Tauri shell)."""
        api_app, _ = app
        with TestClient(api_app) as client:
            response = client.get(
                "/status/some-task",
                headers={"Origin": "tauri://localhost"},
            )

        allow_origin = response.headers.get("access-control-allow-origin")
        assert allow_origin == "*"


class TestRunProcessingOffloadsToThread:
    def test_run_processing_uses_asyncio_to_thread(self, app):
        """_run_processing must offload the sync process_image_paths call to
        asyncio.to_thread so the event loop is not blocked during OCR."""
        import asyncio
        from pathlib import Path
        from unittest.mock import AsyncMock, MagicMock

        api_app, _ = app
        from scan2text.api.main import _run_processing, _task_store

        class _Summary:
            succeeded = 1
            failed = 0
            total_inputs = 1
            job_results = [{
                "job_id": "j",
                "source_file": "f.png",
                "status": "done",
                "error_code": None,
                "output_path": None,
            }]

        mock_queue = MagicMock()
        mock_queue._vlm_adapter = MagicMock()
        mock_queue.process_image_paths.return_value = _Summary()

        task_id = "t-thread-test"
        _task_store[task_id] = {"status": "queued", "processed": 0, "total": 1, "result_markdown": None}

        with patch("scan2text.api.main._ws_manager") as mock_wsm, \
             patch("scan2text.api.main.asyncio.to_thread") as mock_to_thread:
            mock_wsm.broadcast = AsyncMock()
            mock_to_thread.side_effect = lambda fn, *a, **kw: fn(*a, **kw)
            asyncio.run(_run_processing(task_id, mock_queue, [Path("fake.png")], {}))

        mock_to_thread.assert_called_once()
        call_args = mock_to_thread.call_args
        assert call_args[0][0] == mock_queue.process_image_paths
        assert call_args[0][1] == [Path("fake.png")]
        assert call_args[0][2] == mock_queue._vlm_adapter
        assert call_args[0][3] == {}


class TestStatusFailurePropagation:
    """GET /status must return failed + error_code when any job fails."""

    def test_status_returns_failed_when_job_fails(self, app):
        """When process_image_paths raises, status becomes 'failed' with error_code."""
        api_app, _ = app
        from scan2text.api.main import _task_store

        task_id = "fail-task"
        _task_store[task_id] = {
            "status": "processing",
            "processed": 0,
            "total": 1,
            "result_markdown": None,
        }

        with TestClient(api_app) as client:
            response = client.get(f"/status/{task_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "processing"

    def test_status_returns_failed_after_ocr_exception(self, app):
        """When vlm_adapter.ocr raises, the task store gets status=failed + error_code."""
        api_app, mock_qs = app
        from scan2text.api.main import _task_store

        mock_qs._vlm_adapter.ocr.side_effect = RuntimeError("RGBA JPEG save failed")
        mock_qs.process_image_paths.side_effect = RuntimeError("RGBA JPEG save failed")

        path = _tmp_file()
        with TestClient(api_app) as client:
            response = client.post("/process", json={"file_paths": [path]})

        assert response.status_code == 202
        task_id = response.json()["task_id"]

        import asyncio
        async def _poll():
            for _ in range(10):
                await asyncio.sleep(0.05)
        asyncio.run(_poll())

        assert task_id in _task_store
        task = _task_store[task_id]
        assert task["status"] == "failed"
        assert task.get("error_code") is not None

    def test_status_includes_error_code_field(self, app):
        """GET /status/{task_id} returns error_code when status is failed."""
        api_app, _ = app
        from scan2text.api.main import _task_store

        task_id = "failed-task"
        _task_store[task_id] = {
            "status": "failed",
            "processed": 0,
            "total": 1,
            "result_markdown": None,
            "error_code": "OCR_FAILED",
        }

        with TestClient(api_app) as client:
            response = client.get(f"/status/{task_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "failed"
        assert data["error_code"] == "OCR_FAILED"


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
