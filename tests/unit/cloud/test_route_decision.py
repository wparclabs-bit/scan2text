"""Tests for the single routing authority: the 8 MB and 50 MB boundaries."""

from __future__ import annotations

import inspect
import tempfile
import uuid
from pathlib import Path

from scan2text.cloud import route_decision

MEGABYTE = 1024 * 1024

# The sandboxed test environment cannot remove its own temporary tree, so these
# tests create one uniquely named directory and leave cleanup to the platform.
_TEST_ROOT = Path(tempfile.gettempdir()) / f"scan2text-routing-{uuid.uuid4().hex}"
_TEST_ROOT.mkdir(parents=True, exist_ok=True)


def _sized_file(name: str, size_bytes: int) -> Path:
    path = _TEST_ROOT / name
    path.write_bytes(b"0" * size_bytes)
    return path


def test_batch_with_one_small_and_one_large_file_returns_a_different_route_for_each() -> None:
    small = _sized_file("small.pdf", 2 * MEGABYTE)
    large = _sized_file("large.pdf", 12 * MEGABYTE)

    plan = route_decision.plan_batch([small, large])

    assert [decision.route for decision in plan.decisions] == [
        route_decision.Engine.LOCAL,
        route_decision.Engine.CLOUD,
    ]
    assert plan.local_count == 1
    assert plan.cloud_count == 1
    assert plan.total_size_bytes == 14 * MEGABYTE


def test_thresholds_live_in_the_route_decision_module() -> None:
    source = inspect.getsource(route_decision)

    assert route_decision.LOCAL_THRESHOLD_BYTES == 8 * MEGABYTE
    assert route_decision.CEILING_BYTES == 50 * MEGABYTE
    assert "8 * 1024 * 1024" in source
    assert "50 * 1024 * 1024" in source

    from scan2text.cloud import routes as cloud_routes

    assert "LOCAL_THRESHOLD_BYTES" in inspect.getsource(cloud_routes)
    assert "8 * 1024 * 1024" not in inspect.getsource(cloud_routes)


def test_file_at_the_eight_megabyte_boundary_stays_local() -> None:
    boundary = _sized_file("boundary.pdf", 8 * MEGABYTE)

    decision = route_decision.decide_route(boundary)

    assert decision.route is route_decision.Engine.LOCAL
    assert decision.accepted is True


def test_file_above_the_fifty_megabyte_ceiling_is_rejected() -> None:
    oversized = _sized_file("oversized.pdf", 50 * MEGABYTE + 1)

    decision = route_decision.decide_route(oversized)

    assert decision.accepted is False
    assert decision.route is None


def test_local_engine_choice_overrides_every_route_in_the_batch() -> None:
    small = _sized_file("override-small.pdf", 2 * MEGABYTE)
    large = _sized_file("override-large.pdf", 12 * MEGABYTE)

    plan = route_decision.plan_batch(
        [small, large], engine_choice=route_decision.Engine.LOCAL
    )

    assert [decision.route for decision in plan.decisions] == [
        route_decision.Engine.LOCAL,
        route_decision.Engine.LOCAL,
    ]
    assert plan.cloud_count == 0
