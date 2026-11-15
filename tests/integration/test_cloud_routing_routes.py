"""Tests for the routing thresholds and per-file route exposed through the API."""

from __future__ import annotations

import tempfile
import uuid
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from scan2text.api.main import app as main_app
from scan2text.cloud import route_decision, routes as cloud_routes
from scan2text.cloud.fake_provider import FakeProviderClient, FakeProviderMode
from scan2text.cloud.route_decision import router as route_router
from scan2text.cloud.service import DEFAULT_PROFILE_PATH, CloudProfileService, CloudService

MEGABYTE = 1024 * 1024

_TEST_ROOT = Path(tempfile.gettempdir()) / f"scan2text-cloud-routes-{uuid.uuid4().hex}"
_TEST_ROOT.mkdir(parents=True, exist_ok=True)


class FakeCredentialStore:
    def __init__(self) -> None:
        self.secret: str | None = None

    def write(self, secret: str) -> None:
        self.secret = secret

    def read(self) -> str | None:
        return self.secret

    def delete(self) -> None:
        self.secret = None


def build_client() -> TestClient:
    profiles = CloudProfileService(
        profile_path=_TEST_ROOT / "cloud-profile.json",
        default_profile_path=DEFAULT_PROFILE_PATH,
    )
    service = CloudService(
        profile_service=profiles,
        credential_store=FakeCredentialStore(),
        provider_factory=lambda profile, secret: FakeProviderClient(FakeProviderMode.VISION),
    )
    app = FastAPI()
    app.include_router(cloud_routes.router)
    app.include_router(route_router)
    app.state.cloud_service = service
    return TestClient(app)


def test_routing_thresholds_are_exposed_through_the_api() -> None:
    response = build_client().get("/api/cloud/routing")

    assert response.status_code == 200
    body = response.json()
    assert body["local_threshold_bytes"] == 8 * MEGABYTE
    assert body["ceiling_bytes"] == 50 * MEGABYTE
    assert body["local_threshold_bytes"] == route_decision.LOCAL_THRESHOLD_BYTES
    assert body["ceiling_bytes"] == route_decision.CEILING_BYTES


def test_batch_route_preview_splits_a_mixed_batch() -> None:
    response = build_client().post(
        "/api/cloud/batch-route",
        json={"sizes": [2 * MEGABYTE, 12 * MEGABYTE, 51 * MEGABYTE]},
    )

    assert response.status_code == 200
    body = response.json()
    assert [item["route"] for item in body["decisions"]] == ["local", "cloud", None]
    assert [item["accepted"] for item in body["decisions"]] == [True, True, False]
    assert body["local_count"] == 1
    assert body["cloud_count"] == 1
    assert body["rejected_count"] == 1


def test_batch_route_rejects_a_non_positive_size() -> None:
    response = build_client().post("/api/cloud/batch-route", json={"sizes": [0]})

    assert response.status_code == 422


def test_profile_response_carries_the_region_value() -> None:
    body = build_client().get("/api/cloud/profile").json()

    assert body["region"] == "United States"


def test_main_app_exposes_routing_routes() -> None:
    paths = set()
    for route in main_app.routes:
        original = getattr(route, "original_router", None)
        if original is not None:
            paths.update(item.path for item in original.routes)
        elif hasattr(route, "path"):
            paths.add(route.path)
    assert "/api/cloud/routing" in paths
    assert "/api/cloud/batch-route" in paths
