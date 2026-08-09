"""Tests that the consolidated app exposes /api/health and /api/settings (ADR-005)."""
from __future__ import annotations

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


class TestApiSurface:
    def test_api_health_reachable(self, app):
        with TestClient(app) as client:
            r = client.get("/api/health")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ok"
        assert body["worker"] in ("idle", "busy")
        assert "ram" in body and "model" in body

    def test_api_settings_get_reachable(self, app):
        with TestClient(app) as client:
            r = client.get("/api/settings")
        assert r.status_code == 200
        body = r.json()
        assert "max_pdf_pages" in body
        assert "cpu_threads" in body
        assert "language" in body
        assert "theme" in body
