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


def test_run_processing_toggles_worker_busy(app):
    import asyncio
    from pathlib import Path
    from unittest.mock import AsyncMock, MagicMock, patch

    from scan2text.api.main import _run_processing, _task_store

    api_app = app

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

    observed = {}
    mock_queue = MagicMock()
    mock_queue._vlm_adapter = MagicMock()

    def capture(paths, adapter, path_to_stem=None, enhance=False):
        observed["busy"] = api_app.state.worker_busy
        return _Summary()

    mock_queue.process_image_paths.side_effect = capture

    task_id = "t-busy-test"
    _task_store[task_id] = {"status": "queued", "processed": 0, "total": 1, "result_markdown": None}

    with patch("scan2text.api.main._ws_manager") as mock_wsm:
        mock_wsm.broadcast = AsyncMock()
        asyncio.run(_run_processing(task_id, mock_queue, [Path("fake.png")], {}))

    assert observed.get("busy") is True
    assert api_app.state.worker_busy is False
