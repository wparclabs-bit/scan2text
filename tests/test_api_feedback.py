"""Tests for feedback API endpoints."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def app():
    with patch("scan2text.api.main.QueueService") as MockQS, \
         patch("scan2text.api.main.VlmOcrAdapter") as MockVlm:
        mock_qs = MagicMock()
        mock_qs._vlm_adapter = MagicMock()
        MockQS.return_value = mock_qs
        MockVlm.return_value = MagicMock()
        from scan2text.api.main import app as api_app
        yield api_app


class TestFeedbackEndpoints:
    def test_post_feedback_creates_file(self, app, tmp_path):
        with patch("scan2text.services.feedback_service.PathService") as MockPS:
            mock_paths = MagicMock()
            mock_paths.base_dir = tmp_path
            MockPS.return_value = mock_paths
            with TestClient(app) as client:
                r = client.post("/api/feedback", json={
                    "message": "Great app!",
                    "contact": "user@example.com",
                })
        assert r.status_code == 200
        body = r.json()
        assert "filename" in body
        pending_dir = tmp_path / "feedback" / "pending"
        assert (pending_dir / body["filename"]).exists()

    def test_get_pending_count(self, app, tmp_path):
        with patch("scan2text.services.feedback_service.PathService") as MockPS:
            mock_paths = MagicMock()
            mock_paths.base_dir = tmp_path
            MockPS.return_value = mock_paths
            pending_dir = tmp_path / "feedback" / "pending"
            pending_dir.mkdir(parents=True, exist_ok=True)
            (pending_dir / "1.json").touch()
            (pending_dir / "2.json").touch()
            with TestClient(app) as client:
                r = client.get("/api/feedback/pending-count")
        assert r.status_code == 200
        body = r.json()
        assert body["count"] == 2

    def test_mark_sent_moves_file(self, app, tmp_path):
        with patch("scan2text.services.feedback_service.PathService") as MockPS:
            mock_paths = MagicMock()
            mock_paths.base_dir = tmp_path
            MockPS.return_value = mock_paths
            pending_dir = tmp_path / "feedback" / "pending"
            sent_dir = tmp_path / "feedback" / "sent"
            pending_dir.mkdir(parents=True, exist_ok=True)
            sent_dir.mkdir(parents=True, exist_ok=True)
            test_file = pending_dir / "test.json"
            test_file.write_text(json.dumps({"message": "hi"}), encoding="utf-8")
            with TestClient(app) as client:
                r = client.post("/api/feedback/mark-sent", json={
                    "filename": "test.json",
                })
        assert r.status_code == 200
        body = r.json()
        assert body["moved"] is True
        assert not test_file.exists()
        assert (sent_dir / "test.json").exists()
