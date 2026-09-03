"""New tests for JSON payload API contract after uplift.

This file tests the new POST /process JSON endpoint that replaces multipart upload.
The JSON payload format is: {"file_paths": ["C:/path/to/file.png", ...]}
"""

import asyncio
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from fastapi import HTTPException

from scan2text.api.main import app, _task_store, _run_processing
from scan2text.services.path_service import PathService


def _tmp_file(suffix: str = ".png") -> str:
    """Create a temp file in C:\\Windows\\Temp and return its absolute path."""
    p = Path(tempfile.mktemp(suffix=suffix, dir="C:/Windows/Temp"))
    p.write_bytes(b"fake image bytes")
    return str(p)


class TestJsonProcessEndpoint:
    """Tests for POST /process with JSON payload containing file paths."""

    def test_post_process_json_returns_202(self):
        """POST /process accepts JSON {"file_paths": [...]} and returns 202."""
        with TestClient(app) as client:
            payload = {"file_paths": [_tmp_file(), _tmp_file()]}
            response = client.post("/process", json=payload)
            assert response.status_code == 202
            data = response.json()
            assert "task_id" in data
            assert isinstance(data["task_id"], str)

    def test_post_process_json_creates_task_in_store(self):
        """POST /process registers task in in-memory store with file paths."""
        with TestClient(app) as client:
            path = _tmp_file()
            payload = {"file_paths": [path]}
            response = client.post("/process", json=payload)
            task_id = response.json()["task_id"]
            assert task_id in _task_store
            assert _task_store[task_id]["total"] == 1
            assert _task_store[task_id]["file_paths"] == [path]

    @patch("scan2text.api.main._run_processing")
    def test_post_process_json_triggers_processing(self, mock_run):
        """POST /process triggers background processing via _run_processing."""
        with TestClient(app) as client:
            path = _tmp_file()
            payload = {"file_paths": [path]}
            response = client.post("/process", json=payload)
            task_id = response.json()["task_id"]
            mock_run.assert_called_once()
            call_args = mock_run.call_args
            assert call_args[0][0] == task_id
            # call_args[0][1] is queue, call_args[0][2] is paths
            assert isinstance(call_args[0][2], list)

    def test_post_process_json_rejects_invalid_paths(self):
        """POST /process rejects invalid or non-existent file paths."""
        with TestClient(app) as client:
            # Invalid path format (not a string)
            payload = {"file_paths": [123]}
            response = client.post("/process", json=payload)
            assert response.status_code == 422

    def test_post_process_json_validates_existing_files(self):
        """POST /process validates files exist before processing."""
        with TestClient(app) as client:
            # Create a valid file with absolute path
            valid_path = _tmp_file()

            payload = {"file_paths": [valid_path, "C:/Nonexistent/file.jpg"]}
            response = client.post("/process", json=payload)
            assert response.status_code == 422
            assert "File not found" in response.json()["detail"]


class TestProcessFilesJson:
    """Tests for process_files_json function that replaces old multipart logic."""

    def test_process_files_json_validates_and_sanitizes_paths(self):
        """process_files_json validates paths and uses sanitize_filename from PathService."""
        with patch("scan2text.api.main.QueueService") as MockQS, \
             patch("scan2text.api.main.VlmOcrAdapter") as MockVlm, \
             patch.object(
                 PathService,
                 "sanitize_filename",
                 return_value="sanitized_stem"
             ) as mock_sanitize:
            mock_qs = MagicMock()
            mock_qs._vlm_adapter = MagicMock()
            MockQS.return_value = mock_qs
            MockVlm.return_value = MagicMock()

            from scan2text.api.main import app as api_app

            # Create test files with absolute paths
            path1 = _tmp_file(".png")
            path2 = _tmp_file(".jpg")

            with TestClient(api_app) as client:
                payload = {"file_paths": [path1, path2]}
                response = client.post("/process", json=payload)
                assert response.status_code == 202

            # Verify sanitize_filename was called for each path
            assert mock_sanitize.call_count == 2

    def test_process_files_json_raises_on_missing_file(self):
        """process_files_json raises HTTPException when a file doesn't exist."""
        with TestClient(app) as client:
            payload = {"file_paths": ["C:/Nonexistent/file.png"]}
            response = client.post("/process", json=payload)
            assert response.status_code == 422
            assert "File not found" in response.json()["detail"]


class TestSaveUploadedFileJson:
    """Tests for _save_uploaded_file (legacy compatibility)."""

    def test_save_uploaded_file_legacy_compatibility(self, tmp_path):
        """_save_uploaded_file maintains compatibility but won't be called from JSON flow."""
        from scan2text.api.main import _save_uploaded_file
        import io
        from fastapi import UploadFile

        uploads_dir = tmp_path / "uploads"
        uploads_dir.mkdir(exist_ok=True)
        file = UploadFile(filename="test.jpg", file=io.BytesIO(b"fake"))
        path, stem = asyncio.run(_save_uploaded_file(file))
        assert path.exists()
        assert Path(path).suffix == ".jpg"
        assert stem == "test"
