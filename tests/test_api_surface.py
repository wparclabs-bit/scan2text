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


def test_run_processing_reads_markdown_content_for_vlm_ocr(app):
    """VLM OCR jobs put text in markdown_content, not output_path.

    Regression test for DIAG-STORE-POLLING-LIFECYCLE: when jr["output_path"]
    is None (always the case for VLM OCR), result_markdown must still be
    populated from jr["markdown_content"].
    """
    import asyncio
    from pathlib import Path
    from unittest.mock import AsyncMock, MagicMock, patch

    from scan2text.api.main import _run_processing, _task_store

    api_app = app

    expected_md = "# Extracted Text\n\nThis is VLM OCR output."

    class _Summary:
        succeeded = 1
        failed = 0
        total_inputs = 1
        job_results = [{
            "job_id": "vlm-j",
            "source_file": "scan.png",
            "status": "done",
            "error_code": None,
            "output_path": None,
            "markdown_content": expected_md,
        }]

    mock_queue = MagicMock()
    mock_queue._vlm_adapter = MagicMock()
    mock_queue.process_image_paths.return_value = _Summary()

    task_id = "t-vlm-markdown-test"
    _task_store[task_id] = {"status": "queued", "processed": 0, "total": 1, "result_markdown": None}

    with patch("scan2text.api.main._ws_manager") as mock_wsm:
        mock_wsm.broadcast = AsyncMock()
        asyncio.run(_run_processing(task_id, mock_queue, [Path("fake.png")], {}))

    task = _task_store[task_id]
    assert task["status"] == "completed"
    assert task["result_markdown"] == expected_md


def test_run_processing_falls_back_to_output_path_when_no_markdown_content(app):
    """Legacy path: when markdown_content is absent, read from output_path file."""
    import asyncio
    from pathlib import Path
    from unittest.mock import AsyncMock, MagicMock, patch

    from scan2text.api.main import _run_processing, _task_store

    api_app = app

    legacy_md = "# Legacy Output\n\nText from disk."
    tmp_file = Path(__file__).parent / "_tmp_legacy_output.md"
    try:
        tmp_file.write_text(legacy_md, encoding="utf-8")

        class _Summary:
            succeeded = 1
            failed = 0
            total_inputs = 1
            job_results = [{
                "job_id": "legacy-j",
                "source_file": "scan.png",
                "status": "done",
                "error_code": None,
                "output_path": str(tmp_file),
                "markdown_content": None,
            }]

        mock_queue = MagicMock()
        mock_queue._vlm_adapter = MagicMock()
        mock_queue.process_image_paths.return_value = _Summary()

        task_id = "t-legacy-output-test"
        _task_store[task_id] = {"status": "queued", "processed": 0, "total": 1, "result_markdown": None}

        with patch("scan2text.api.main._ws_manager") as mock_wsm:
            mock_wsm.broadcast = AsyncMock()
            asyncio.run(_run_processing(task_id, mock_queue, [Path("fake.png")], {}))

        task = _task_store[task_id]
        assert task["status"] == "completed"
        assert task["result_markdown"] == legacy_md
    finally:
        if tmp_file.exists():
            tmp_file.unlink()


def test_run_processing_result_markdown_is_none_when_no_content(app):
    """When all jobs have neither markdown_content nor output_path, result_markdown stays None."""
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
            "job_id": "empty-j",
            "source_file": "scan.png",
            "status": "done",
            "error_code": None,
            "output_path": None,
            "markdown_content": None,
        }]

    mock_queue = MagicMock()
    mock_queue._vlm_adapter = MagicMock()
    mock_queue.process_image_paths.return_value = _Summary()

    task_id = "t-empty-result-test"
    _task_store[task_id] = {"status": "queued", "processed": 0, "total": 1, "result_markdown": None}

    with patch("scan2text.api.main._ws_manager") as mock_wsm:
        mock_wsm.broadcast = AsyncMock()
        asyncio.run(_run_processing(task_id, mock_queue, [Path("fake.png")], {}))

    task = _task_store[task_id]
    assert task["status"] == "completed"
    assert task["result_markdown"] is None
