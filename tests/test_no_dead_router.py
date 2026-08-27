"""Absence test: prove routes/jobs.py ghost is removed and unmounted.

Per AGENTS.md §13 Lessons Learned — Ghosts/forensics block:
"Absence tests keep removed features removed."
"""
from __future__ import annotations


def test_routes_jobs_module_removed() -> None:
    """Importing scan2text.routes.jobs must raise ModuleNotFoundError."""
    try:
        import scan2text.routes.jobs  # noqa: F401
    except ModuleNotFoundError:
        return
    raise AssertionError(
        "scan2text.routes.jobs still exists — ghost not removed"
    )


def test_no_dead_router_mounted() -> None:
    """No route path on the FastAPI app may start with /api/jobs."""
    from scan2text.api.main import app

    dead_routes = [
        route for route in app.routes
        if hasattr(route, "path") and isinstance(route.path, str)
        and route.path.startswith("/api/jobs")
    ]
    assert not dead_routes, (
        f"Dead /api/jobs routes still mounted: {[r.path for r in dead_routes]}"
    )
