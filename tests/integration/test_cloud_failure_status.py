"""T05 — waiting status on the public route, equal status sets, and the ceiling."""

from __future__ import annotations

import re
import tempfile
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from scan2text.models.job import TaskStatus


def _tmp_file(suffix: str = ".png") -> str:
    p = Path(tempfile.mktemp(suffix=suffix, dir="C:/Windows/Temp"))
    p.write_bytes(b"fake image bytes")
    return str(p)


@pytest.fixture(autouse=True)
def _isolated_app_state():
    from scan2text.api.main import _task_store

    _task_store.clear()
    yield
    patch.stopall()
    _task_store.clear()


def _make_app():
    mock_qs_cls = patch("scan2text.api.main.QueueService").start()
    patch("scan2text.api.main.VlmOcrAdapter").start()
    mock_qs = MagicMock()
    mock_qs._vlm_adapter = MagicMock()
    mock_qs_cls.return_value = mock_qs
    from scan2text.api.main import app as api_app

    return api_app, mock_qs


def _wait_for_visible(client, task_id, timeout=20.0):
    deadline = time.monotonic() + timeout
    observed = None
    while time.monotonic() < deadline:
        observed = client.get(f"/status/{task_id}").json().get("status")
        if observed in ("completed", "failed", "waiting"):
            return observed
        time.sleep(0.05)
    raise AssertionError(f"task stayed {observed!r}")


class _Summary:
    def __init__(self, job_results, succeeded=0, failed=0):
        self.job_results = job_results
        self.succeeded = succeeded
        self.failed = failed
        self.total_inputs = len(job_results)


def test_waiting_status_route_returns_reason_and_error_code():
    api_app, mock_qs = _make_app()
    mock_qs.process_image_paths.return_value = _Summary(
        job_results=[
            {
                "status": "waiting",
                "reason": "network",
                "error_code": "NETWORK_UNAVAILABLE",
                "engine": "cloud",
                "output_path": None,
            }
        ]
    )
    with TestClient(api_app) as client:
        resp = client.post("/process", json={"file_paths": [_tmp_file()]})
        assert resp.status_code == 202
        task_id = resp.json()["task_id"]
        assert _wait_for_visible(client, task_id) == "waiting"
        body = client.get(f"/status/{task_id}").json()

    assert body["status"] == "waiting"
    assert body["reason"] == "network"
    assert body["error_code"] == "NETWORK_UNAVAILABLE"


def test_fast_fail_status_exposes_specific_message_and_fix_key():
    api_app, mock_qs = _make_app()
    mock_qs.process_image_paths.return_value = _Summary(
        job_results=[
            {
                "status": "failed",
                "error_code": "PROVIDER_UNAUTHORIZED",
                "error": "The provider rejected the API key.",
                "fix_key": True,
                "engine": "cloud",
                "output_path": None,
            }
        ],
        failed=1,
    )
    with TestClient(api_app) as client:
        resp = client.post("/process", json={"file_paths": [_tmp_file()]})
        task_id = resp.json()["task_id"]
        assert _wait_for_visible(client, task_id) == "failed"
        body = client.get(f"/status/{task_id}").json()

    assert body["error_code"] == "PROVIDER_UNAUTHORIZED"
    assert body["error"] == "The provider rejected the API key."
    assert body["fix_key"] is True


def test_backend_and_frontend_status_sets_are_equal():
    api_ts = (
        Path(__file__).resolve().parents[2]
        / "frontend"
        / "src"
        / "lib"
        / "api.ts"
    ).read_text(encoding="utf-8")
    match = re.search(r"TASK_STATUSES\s*=\s*\[([^\]]+)\]", api_ts)
    assert match, "frontend api.ts must declare TASK_STATUSES"
    frontend = set(re.findall(r"'([a-z_]+)'", match.group(1)))
    backend = {status.value for status in TaskStatus}
    assert frontend == backend
    assert "skipped" in frontend
    assert "waiting" in frontend
    # T06: the cancelled value joins the shared set on both sides.
    assert "cancelled" in frontend


def test_document_ceiling_parks_the_task():
    from scan2text.api.main import DOCUMENT_CEILING_SECONDS, _task_store

    api_app, _ = _make_app()
    # A task that has been processing past the ceiling is parked by the status
    # route with a retryable waiting state and a short reason.
    _task_store["ceiled"] = {
        "status": "processing",
        "processed": 0,
        "total": 1,
        "result_markdown": None,
        "started_at": time.monotonic() - DOCUMENT_CEILING_SECONDS - 1,
    }
    with TestClient(api_app) as client:
        body = client.get("/status/ceiled").json()
    assert body["status"] == "waiting"
    assert body["error_code"] == "DOCUMENT_TIMEOUT"
    assert body["reason"] == "ceiling"
