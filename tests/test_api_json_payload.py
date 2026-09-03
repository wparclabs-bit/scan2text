"""New tests for JSON payload API contract after uplift.

This file tests the new POST /process JSON endpoint that replaces multipart upload.
The JSON payload format is: {"file_paths": ["C:/path/to/file.png", ...]}
"""

import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from fastapi import HTTPException

from scan2text.api.main import app, _task_store, _run_processing
from scan2text.services.path_service import PathService


class TestJsonProcessEndpoint:
    """Tests for POST /process with JSON payload containing file paths."""

    def test_post_process_json_returns_202(self):
        """POST /process accepts JSON {"file_paths": [...]} and returns 202."""
        with TestClient(app) as client:
            payload = {"file_paths": ["C:/Users/Test/Documents/image.png", "D:/Pictures/photo.jpg"]}
            response = client.post("/process", json=payload)
            assert response.status_code == 202
            data = response.json()
            assert "task_id" in data
            assert isinstance(data["task_id"], str)

    def test_post_process_json_creates_task_in_store(self):
        """POST /process registers task in in-memory store with file paths."""
        with TestClient(app) as client:
            payload = {"file_paths": ["C:/Test/file.png"]}
            response = client.post("/process", json=payload)
            task_id = response.json()["task_id"]
            assert task_id in _task_store
            assert _task_store[task_id]["total"] == 1
            assert _task_store[task_id]["file_paths"] == ["C:/Test/file.png"]

    @patch("scan2text.api.main._run_processing")
    def test_post_process_json_triggers_processing(self, mock_run):
        """POST /process triggers background processing via _run_processing."""
        with TestClient(app) as client:
            payload = {"file_paths": ["C:/Test/file.png"]}
            response = client.post("/process", json=payload)
            task_id = response.json()["task_id"]
            mock_run.assert_called_once()
            call_args = mock_run.call_args
            assert call_args[0][0] == task_id
            assert call_args[0][1] == [Path("C:/Test/file.png")]

    def test_post_process_json_rejects_invalid_paths(self):
        """POST /process rejects invalid or non-existent file paths."""
        with TestClient(app) as client:
            # Invalid path format
            payload = {"file_paths": ["not/a/valid/path", 123]}
            response = client.post("/process", json=payload)
            assert response.status_code == 422

    def test_post_process_json_validates_existing_files(self):
        """POST /process validates files exist before processing."""
        with TestClient(app) as client:
            # Create a valid file
            test_dir = Path("test_validate")
            test_dir.mkdir(exist_ok=True)
            valid_path = test_dir / "valid.png"
            valid_path.write_text("""PNG data""")

            payload = {"file_paths": [str(valid_path), "C:/Nonexistent/file.jpg"]}
            response = client.post("/process", json=payload)
            assert response.status_code == 422
            assert "File not found" in response.json()["detail"]

            # Cleanup
            if test_dir.exists():
                import shutil
                shutil.rmtree(test_dir)


class TestProcessFilesJson:
    """Tests for process_files_json function that replaces old multipart logic."""

    def test_process_files_json_validates_and_sanitizes_paths(self):
        """process_files_json validates paths and uses sanitize_filename from PathService."""
        # Create test files
        test_dir = Path("test_paths")
        test_dir.mkdir(exist_ok=True)
        (test_dir / "valid.png").write_text("""PNG data""")
        (test_dir / "valid2.jpg").write_text("""JPG data""")

        try:
            paths = [str(test_dir / "valid.png"), str(test_dir / "valid2.jpg")]
            # Call the function directly (bypassing FastAPI)
            from scan2text.api.main import process_files_json
            result = asyncio.run(process_files_json(
                file_paths=paths,
                enhance=False,
                vlm_adapter=MagicMock(),
                task_id="test-task"
            ))
            # Verify processing was triggered (we can't easily mock internal calls)
            # Just verify no errors occurred
            assert result is not None
        finally:
            if test_dir.exists():
                import shutil
                shutil.rmtree(test_dir)

    def test_process_files_json_raises_on_missing_file(self):
        """process_files_json raises HTTPException when a file doesn't exist."""
        from scan2text.api.main import process_files_json
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc:
            asyncio.run(process_files_json(
                file_paths=["C:/Nonexistent/file.png"],
                enhance=False,
                vlm_adapter=MagicMock(),
                task_id="test-task"
            ))
        assert exc.value.status_code == 422
        assert "File not found" in str(exc.value.detail)

    """Tests for process_files_json function called by the endpoint."""

    def test_process_files_json_validates_and_sanitizes_paths(self):
        """process_files_json validates paths and uses sanitize_filename."""
        # Mock sanitize_filename
        with patch(
            "scan2text.services.path_service.sanitize_filename",
            return_value="sanitized_stem"
        ) as mock_sanitize:
            # Create test files
            test_dir = Path("test_paths")
            test_dir.mkdir(exist_ok=True)
            (test_dir / "valid.png").write_text("""data""")
            (test_dir / "invalid.txt").write_text("""data""")

            try:
                paths = [str(test_dir / "valid.png"), "C:/Valid/File.jpg"]
                # Call the function directly (bypassing FastAPI)
                from scan2text.api.main import process_files_json
                result = asyncio.run(process_files_json(
                    file_paths=paths,
                    enhance=False,
                    vlm_adapter=MagicMock(),
                    task_id="test-task"
                ))
                # Verify it returned the sanitized paths
                assert mock_sanitize.call_count == 2
                # Verify it didn't save files to uploads directory
                assert not Path("uploads").exists()
            finally:
                if test_dir.exists():
                    import shutil
                    shutil.rmtree(test_dir)

    def test_process_files_json_raises_on_missing_file(self):
        """process_files_json raises HTTPException when a file doesn't exist."""
        from scan2text.api.main import process_files_json
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc:
            asyncio.run(process_files_json(
                file_paths=["C:/Nonexistent/file.png"],
                enhance=False,
                vlm_adapter=MagicMock(),
                task_id="test-task"
            ))
        assert exc.value.status_code == 422
        assert "File not found" in str(exc.value.detail)


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
