"""T06 — the cancel route on the public API.

A running task becomes cancelled at once, a finished task changes nothing, and
the status route reports the cancelled state without a result.
"""

from __future__ import annotations

import tempfile
import threading
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


def _tmp_file(suffix: str = ".png") -> str:
    p = Path(tempfile.mktemp(suffix=suffix, dir="C:/Windows/Temp"))
    p.write_bytes(b"fake image bytes")
    return str(p)


@pytest.fixture(autouse=True)
def _isolated_app_state():
    from scan2text.api.main import _task_store
    from scan2text.cloud.cancellation import cancellation_registry

    _task_store.clear()
    cancellation_registry.clear()
    yield
    patch.stopall()
    _task_store.clear()
    cancellation_registry.clear()


def _make_app():
    mock_qs_cls = patch("scan2text.api.main.QueueService").start()
    patch("scan2text.api.main.VlmOcrAdapter").start()
    mock_qs = MagicMock()
    mock_qs._vlm_adapter = MagicMock()
    mock_qs_cls.return_value = mock_qs
    from scan2text.api.main import app as api_app

    return api_app, mock_qs


def _wait_for_status(client, task_id, wanted, timeout=20.0):
    deadline = time.monotonic() + timeout
    observed = None
    while time.monotonic() < deadline:
        observed = client.get(f"/status/{task_id}").json().get("status")
        if observed == wanted:
            return observed
        time.sleep(0.05)
    raise AssertionError(f"task stayed {observed!r}")


class _Summary:
    def __init__(self, job_results, succeeded=0, failed=0):
        self.job_results = job_results
        self.succeeded = succeeded
        self.failed = failed
        self.total_inputs = len(job_results)


def test_cancel_route_marks_a_running_task_cancelled():
    api_app, mock_qs = _make_app()
    release = threading.Event()

    def slow_process(*args, **kwargs):
        release.wait(timeout=20)
        return _Summary(
            job_results=[
                {
                    "status": "completed",
                    "markdown_content": "# done",
                    "output_path": None,
                    "engine": "cloud",
                }
            ],
            succeeded=1,
        )

    mock_qs.process_image_paths.side_effect = slow_process

    with TestClient(api_app) as client:
        resp = client.post("/process", json={"file_paths": [_tmp_file()]})
        assert resp.status_code == 202
        task_id = resp.json()["task_id"]
        _wait_for_status(client, task_id, "processing")

        cancel = client.post(f"/cancel/{task_id}")
        assert cancel.status_code == 200
        assert cancel.json()["cancelled"] is True
        assert cancel.json()["status"] == "cancelled"

        body = client.get(f"/status/{task_id}").json()
        assert body["status"] == "cancelled"
        assert "result_markdown" not in body

        # The worker finishes late; the cancelled state and the discarded
        # result must survive it.
        release.set()
        _wait_for_status(client, task_id, "cancelled")
        time.sleep(0.2)
        after = client.get(f"/status/{task_id}").json()

    assert after["status"] == "cancelled"
    assert "result_markdown" not in after


def test_cancel_route_on_a_finished_task_changes_nothing():
    from scan2text.api.main import _task_store

    api_app, _ = _make_app()
    _task_store["finished"] = {
        "status": "completed",
        "processed": 1,
        "total": 1,
        "result_markdown": "# kept",
        "engine": "cloud",
        "started_at": time.monotonic(),
    }

    with TestClient(api_app) as client:
        cancel = client.post("/cancel/finished")
        assert cancel.status_code == 200
        assert cancel.json()["cancelled"] is False
        assert cancel.json()["status"] == "completed"

        body = client.get("/status/finished").json()

    assert body["status"] == "completed"
    assert body["result_markdown"] == "# kept"


def test_status_route_reports_the_cancelled_status():
    from scan2text.api.main import _task_store

    api_app, _ = _make_app()
    _task_store["cancelled-job"] = {
        "status": "cancelled",
        "processed": 0,
        "total": 1,
        "result_markdown": None,
        "started_at": time.monotonic(),
    }

    with TestClient(api_app) as client:
        body = client.get("/status/cancelled-job").json()

    assert body["status"] == "cancelled"
    assert "result_markdown" not in body
