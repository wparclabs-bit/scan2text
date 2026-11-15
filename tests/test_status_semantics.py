"""Tests for backend status semantics — Defect S11-FIX73.

Rule: succeeded > 0 → status "completed" (even if failed > 0).
      succeeded == 0 AND failed > 0 → status "failed".
      Partial failure records error_code for observability.

`/process` returns 202 before the background coroutine finishes, so every test
waits for its own task to reach a terminal state through the public `/status`
route instead of reading the store while the task is still "processing". The
wait keeps these tests deterministic on a slow CI runner (T13).
"""

from __future__ import annotations

import asyncio
import tempfile
import time
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from fastapi.testclient import TestClient


def _tmp_file(suffix: str = ".png") -> str:
    """Create a temp file in C:\\\\Windows\\\\Temp and return its absolute path."""
    p = Path(tempfile.mktemp(suffix=suffix, dir="C:/Windows/Temp"))
    p.write_bytes(b"fake image bytes")
    return str(p)


def _wait_until_finished(client: TestClient, task_id: str, timeout: float = 20.0) -> str:
    """Poll the task through `/status` until it is completed or failed."""
    deadline = time.monotonic() + timeout
    observed = None
    while time.monotonic() < deadline:
        observed = client.get(f"/status/{task_id}").json().get("status")
        if observed in ("completed", "failed"):
            return observed
        time.sleep(0.05)
    raise AssertionError(
        f"task {task_id} stayed {observed!r} for {timeout}s; the background job never finished"
    )


@pytest.fixture(autouse=True)
def _isolated_task_store():
    """Clear the shared in-memory task store around every test."""
    from scan2text.api.main import _task_store
    _task_store.clear()
    yield
    _task_store.clear()


def _make_app():
    """Create the app with mocked dependencies."""
    with patch("scan2text.api.main.QueueService") as MockQS, \
         patch("scan2text.api.main.VlmOcrAdapter") as MockVlm:
        mock_qs = MagicMock()
        mock_qs._vlm_adapter = MagicMock()
        MockQS.return_value = mock_qs

        mock_vlm = MagicMock()
        MockVlm.return_value = mock_vlm

        from scan2text.api.main import app as api_app
        yield api_app, mock_qs


class FakeSummary:
    """Minimal BatchSummary-like object."""
    def __init__(self, succeeded, failed, total_inputs, job_results=None):
        self.succeeded = succeeded
        self.failed = failed
        self.total_inputs = total_inputs
        self.job_results = job_results or []


class TestStatusSemantics:
    """Status logic: succeeded > 0 → completed, succeeded == 0 + failed > 0 → failed."""

    def test_succeeded_gt0_failed_gt0_status_completed(self):
        """When some files succeed AND some fail, task status is 'completed'."""
        app_gen = _make_app()
        api_app, mock_qs = next(app_gen)

        mock_qs.process_image_paths.return_value = FakeSummary(
            succeeded=2, failed=1, total_inputs=3,
            job_results=[
                {"job_id": "j1", "source_file": "a.png", "status": "done",
                 "error_code": None, "output_path": "/tmp/a.md"},
                {"job_id": "j2", "source_file": "b.png", "status": "done",
                 "error_code": None, "output_path": "/tmp/b.md"},
                {"job_id": "j3", "source_file": "c.png", "status": "failed",
                 "error_code": "OCR_FAILED", "output_path": None},
            ],
        )

        paths = [_tmp_file(), _tmp_file(), _tmp_file()]
        with TestClient(api_app) as client:
            resp = client.post("/process", json={"file_paths": paths})
            assert resp.status_code == 202
            task_id = resp.json()["task_id"]
            _wait_until_finished(client, task_id)

        from scan2text.api.main import _task_store
        assert _task_store[task_id]["status"] == "completed"

    def test_succeeded_eq0_failed_gt0_status_failed(self):
        """When all files fail (succeeded == 0), task status is 'failed'."""
        app_gen = _make_app()
        api_app, mock_qs = next(app_gen)

        mock_qs.process_image_paths.return_value = FakeSummary(
            succeeded=0, failed=2, total_inputs=2,
            job_results=[
                {"job_id": "j1", "source_file": "x.png", "status": "failed",
                 "error_code": "OCR_FAILED", "output_path": None},
                {"job_id": "j2", "source_file": "y.png", "status": "failed",
                 "error_code": "OCR_FAILED", "output_path": None},
            ],
        )

        paths = [_tmp_file(), _tmp_file()]
        with TestClient(api_app) as client:
            resp = client.post("/process", json={"file_paths": paths})
            assert resp.status_code == 202
            task_id = resp.json()["task_id"]
            _wait_until_finished(client, task_id)

        from scan2text.api.main import _task_store
        assert _task_store[task_id]["status"] == "failed"

    def test_succeeded_gt0_failed_gt0_error_code_set(self):
        """When some succeed AND some fail, error_code is PARTIAL_FAILURE."""
        app_gen = _make_app()
        api_app, mock_qs = next(app_gen)

        mock_qs.process_image_paths.return_value = FakeSummary(
            succeeded=1, failed=1, total_inputs=2,
            job_results=[
                {"job_id": "j1", "source_file": "ok.png", "status": "done",
                 "error_code": None, "output_path": "/tmp/ok.md"},
                {"job_id": "j2", "source_file": "bad.png", "status": "failed",
                 "error_code": "OCR_FAILED", "output_path": None},
            ],
        )

        paths = [_tmp_file(), _tmp_file()]
        with TestClient(api_app) as client:
            resp = client.post("/process", json={"file_paths": paths})
            assert resp.status_code == 202
            task_id = resp.json()["task_id"]
            _wait_until_finished(client, task_id)

        from scan2text.api.main import _task_store
        assert _task_store[task_id].get("error_code") == "PARTIAL_FAILURE"

    def test_succeeded_gt0_failed_eq0_no_error_code(self):
        """When all succeed, error_code should not be set (or be None)."""
        app_gen = _make_app()
        api_app, mock_qs = next(app_gen)

        mock_qs.process_image_paths.return_value = FakeSummary(
            succeeded=2, failed=0, total_inputs=2,
            job_results=[
                {"job_id": "j1", "source_file": "a.png", "status": "done",
                 "error_code": None, "output_path": "/tmp/a.md"},
                {"job_id": "j2", "source_file": "b.png", "status": "done",
                 "error_code": None, "output_path": "/tmp/b.md"},
            ],
        )

        paths = [_tmp_file(), _tmp_file()]
        with TestClient(api_app) as client:
            resp = client.post("/process", json={"file_paths": paths})
            assert resp.status_code == 202
            task_id = resp.json()["task_id"]
            _wait_until_finished(client, task_id)

        from scan2text.api.main import _task_store
        assert _task_store[task_id].get("error_code") is None
