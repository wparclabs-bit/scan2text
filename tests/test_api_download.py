"""Integration tests for the download API endpoints — POST /api/download/start, GET /api/download/progress, POST /api/download/cancel."""

from __future__ import annotations

import json
import hashlib
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


def _make_version_json(tmp_path, vlm_sha="abc123", vlm_size=1024, mmproj_sha="def456", mmproj_size=512):
    version = {
        "vlm_download_url": "http://example.com/vlm.gguf",
        "vlm_sha256": vlm_sha,
        "vlm_size_bytes": vlm_size,
        "mmproj_download_url": "http://example.com/mmproj.gguf",
        "mmproj_sha256": mmproj_sha,
        "mmproj_size_bytes": mmproj_size,
    }
    (tmp_path / "version.json").write_text(json.dumps(version), encoding="utf-8")
    return tmp_path


class _FakeResponse:
    def __init__(self, data, content_length=None):
        self._data = data
        self._pos = 0
        self._content_length = content_length

    def read(self, size=-1):
        if self._pos >= len(self._data):
            return b""
        chunk = self._data[self._pos:self._pos + (size if size > 0 else len(self._data))]
        self._pos += len(chunk)
        return chunk

    def getheader(self, name, default=None):
        if name.lower() == "content-length" and self._content_length is not None:
            return str(self._content_length)
        return default

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        return False


@pytest.fixture
def app(tmp_path):
    with patch("scan2text.api.main.QueueService") as MockQS, \
         patch("scan2text.api.main.VlmOcrAdapter") as MockVlm, \
         patch("scan2text.services.path_service._default_instance") as mock_paths:
        mock_qs = MagicMock()
        mock_qs._vlm_adapter = MagicMock()
        MockQS.return_value = mock_qs
        MockVlm.return_value = MagicMock()

        mock_path_svc = MagicMock()
        mock_path_svc.app_root = tmp_path
        mock_path_svc.models_dir = tmp_path / "models"
        mock_paths.return_value = mock_path_svc

        _make_version_json(tmp_path)
        (tmp_path / "models").mkdir(parents=True, exist_ok=True)

        from scan2text.api.main import app as api_app
        yield api_app


class TestDownloadStart:
    def test_post_download_start_triggers_service(self, app):
        api_app = app
        with patch("scan2text.routes.download._download_svc") as mock_svc:
            mock_svc.get_progress.return_value = {"status": "idle", "bytes_downloaded": 0, "total_bytes": 0, "error_message": None}
            with TestClient(api_app) as client:
                response = client.post("/api/download/start")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "idle"
        mock_svc.start_download.assert_called_once()

    def test_post_download_start_returns_failed_status_when_no_version_json(self, tmp_path):
        with patch("scan2text.api.main.QueueService") as MockQS, \
             patch("scan2text.api.main.VlmOcrAdapter") as MockVlm, \
             patch("scan2text.routes.download._download_svc") as mock_svc:
            mock_svc.get_progress.return_value = {"status": "failed", "bytes_downloaded": 0, "total_bytes": 0, "error_message": "version.json not found"}
            mock_svc.start_download.side_effect = Exception("version.json not found")

            from scan2text.api.main import app as api_app
            with TestClient(api_app) as client:
                response = client.post("/api/download/start")

        assert response.status_code == 500


class TestDownloadStatus:
    def test_get_download_status_returns_state(self, app):
        api_app = app
        with patch("scan2text.routes.download._download_svc") as mock_svc:
            mock_svc.get_progress.return_value = {
                "status": "complete",
                "bytes_downloaded": 1536,
                "total_bytes": 1536,
                "error_message": None,
            }
            with TestClient(api_app) as client:
                response = client.get("/api/download/status")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "complete"
        assert data["bytes_downloaded"] == 1536
        assert data["total_bytes"] == 1536
        assert response.headers["Cache-Control"] == "no-store, no-cache, must-revalidate, max-age=0"
        assert response.headers["Pragma"] == "no-cache"
        assert response.headers["Expires"] == "0"

    def test_get_download_status_defaults_when_idle(self, app):
        api_app = app
        with patch("scan2text.routes.download._download_svc") as mock_svc:
            mock_svc.get_progress.return_value = {
                "status": "idle",
                "bytes_downloaded": 0,
                "total_bytes": 0,
                "error_message": None,
            }
            with TestClient(api_app) as client:
                response = client.get("/api/download/status")

        assert response.status_code == 200
        assert response.json()["status"] == "idle"
        assert response.headers["Cache-Control"] == "no-store, no-cache, must-revalidate, max-age=0"
        assert response.headers["Pragma"] == "no-cache"
        assert response.headers["Expires"] == "0"


class TestDownloadProgress:
    def test_get_download_progress_returns_state(self, app):
        api_app = app
        with patch("scan2text.routes.download._download_svc") as mock_svc:
            mock_svc.get_progress.return_value = {
                "status": "downloading",
                "bytes_downloaded": 5000,
                "total_bytes": 10000,
                "error_message": None,
            }
            with TestClient(api_app) as client:
                response = client.get("/api/download/progress")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "downloading"
        assert data["bytes_downloaded"] == 5000
        assert data["total_bytes"] == 10000
        assert response.headers["Cache-Control"] == "no-store, no-cache, must-revalidate, max-age=0"
        assert response.headers["Pragma"] == "no-cache"
        assert response.headers["Expires"] == "0"

    def test_get_download_progress_defaults_when_idle(self, app):
        api_app = app
        with patch("scan2text.routes.download._download_svc") as mock_svc:
            mock_svc.get_progress.return_value = {
                "status": "idle",
                "bytes_downloaded": 0,
                "total_bytes": 0,
                "error_message": None,
            }
            with TestClient(api_app) as client:
                response = client.get("/api/download/progress")

        assert response.status_code == 200
        assert response.json()["status"] == "idle"
        assert response.headers["Cache-Control"] == "no-store, no-cache, must-revalidate, max-age=0"
        assert response.headers["Pragma"] == "no-cache"
        assert response.headers["Expires"] == "0"


class TestDownloadCancel:
    def test_post_download_cancel_triggers_cancellation(self, app):
        api_app = app
        with patch("scan2text.routes.download._download_svc") as mock_svc:
            mock_svc.get_progress.return_value = {"status": "cancelled", "bytes_downloaded": 0, "total_bytes": 0, "error_message": None}
            with TestClient(api_app) as client:
                response = client.post("/api/download/cancel")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "cancelled"
        mock_svc.cancel.assert_called_once()

    def test_post_download_cancel_when_idle_returns_ok(self, app):
        api_app = app
        with patch("scan2text.routes.download._download_svc") as mock_svc:
            mock_svc.get_progress.return_value = {"status": "idle", "bytes_downloaded": 0, "total_bytes": 0, "error_message": None}
            with TestClient(api_app) as client:
                response = client.post("/api/download/cancel")

        assert response.status_code == 200
        assert response.json()["status"] == "idle"
