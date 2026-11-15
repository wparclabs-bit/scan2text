"""The single authority for the routing boundaries between the engines.

Files up to 8 MB stay on the Local engine. Files over 8 MB and up to the 50 MB
ceiling route to the Cloud engine. Anything larger is rejected here, in one
place. The frontend may mirror these bounds to reject a file early, but it
never decides the route.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Iterable

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field, conint

LOCAL_THRESHOLD_BYTES: int = 8 * 1024 * 1024  # 8 MB
CEILING_BYTES: int = 50 * 1024 * 1024  # 50 MB

FileSize = conint(gt=0)

router = APIRouter()


class Engine(str, Enum):
    """The engine that will convert a file."""

    LOCAL = "local"
    CLOUD = "cloud"


class Escalation(str, Enum):
    """Why a Cloud file cannot be sent yet, when it cannot."""

    READY = "ready"
    CLOUD_DISABLED = "cloud_disabled"
    NEEDS_KEY = "needs_key"


class RouteDecision(BaseModel):
    """The route for one file, decided by size alone."""

    size_bytes: int = Field(ge=0)
    accepted: bool
    route: Engine | None = None


class BatchPlan(BaseModel):
    """One route per file, plus the batch totals the consent gate needs."""

    decisions: list[RouteDecision] = Field(default_factory=list)
    local_count: int = 0
    cloud_count: int = 0
    rejected_count: int = 0
    total_size_bytes: int = 0


def _resolve_route(size_bytes: int) -> RouteDecision:
    if size_bytes > CEILING_BYTES:
        return RouteDecision(size_bytes=size_bytes, accepted=False, route=None)
    route = Engine.LOCAL if size_bytes <= LOCAL_THRESHOLD_BYTES else Engine.CLOUD
    return RouteDecision(size_bytes=size_bytes, accepted=True, route=route)


def path_size_bytes(path: str | Path) -> int:
    """Return the byte size of one path, without opening the file."""
    return Path(path).stat().st_size


def sizes_of(files: Iterable[str | Path]) -> list[int]:
    """Return the byte size of every path, without opening the file."""
    return [path_size_bytes(item) for item in files]


def decide_route(
    size_bytes: int | str | Path, *, engine_choice: Engine | None = None
) -> RouteDecision:
    """Resolve one file's route, honouring a batch-level engine choice.

    ``size_bytes`` may be a byte count or any path-like value.
    """
    resolved = (
        size_bytes
        if isinstance(size_bytes, int)
        else path_size_bytes(size_bytes)
    )
    if engine_choice is Engine.LOCAL:
        if resolved > CEILING_BYTES:
            return RouteDecision(size_bytes=resolved, accepted=False, route=None)
        return RouteDecision(size_bytes=resolved, accepted=True, route=Engine.LOCAL)
    return _resolve_route(resolved)


def plan_batch(
    files: Iterable[str | Path], *, engine_choice: Engine | None = None
) -> BatchPlan:
    """Plan one route per file. Routing is per file, never per batch."""
    decisions: list[RouteDecision] = []
    for size_bytes in sizes_of(files):
        decisions.append(decide_route(size_bytes, engine_choice=engine_choice))
    return BatchPlan(
        decisions=decisions,
        local_count=sum(1 for d in decisions if d.route is Engine.LOCAL),
        cloud_count=sum(1 for d in decisions if d.route is Engine.CLOUD),
        rejected_count=sum(1 for d in decisions if not d.accepted),
        total_size_bytes=sum(d.size_bytes for d in decisions),
    )


class BatchRouteRequest(BaseModel):
    """One batch preview: the sizes to route, and an optional whole-batch override."""

    sizes: list[FileSize] = Field(min_length=1)
    engine_choice: Engine | None = None

    def decisions(self) -> list[RouteDecision]:
        return [
            decide_route(size_bytes, engine_choice=self.engine_choice)
            for size_bytes in self.sizes
        ]

    def plan(self) -> BatchPlan:
        decisions = self.decisions()
        return BatchPlan(
            decisions=decisions,
            local_count=sum(1 for d in decisions if d.route is Engine.LOCAL),
            cloud_count=sum(1 for d in decisions if d.route is Engine.CLOUD),
            rejected_count=sum(1 for d in decisions if not d.accepted),
            total_size_bytes=sum(d.size_bytes for d in decisions),
        )


@router.get("/api/cloud/routing")
def get_routing_thresholds() -> dict:
    """Expose the routing bounds so no other layer needs its own copy."""
    return {
        "local_threshold_bytes": LOCAL_THRESHOLD_BYTES,
        "ceiling_bytes": CEILING_BYTES,
        "engines": [engine.value for engine in Engine],
    }


@router.post("/api/cloud/batch-route", response_model=BatchPlan)
def preview_batch_route(payload: BatchRouteRequest) -> BatchPlan:
    """Return one route per file, plus the batch totals."""
    return payload.plan()
