from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from scan2text.cloud.fake_provider import FakeProviderClient, FakeProviderMode
from scan2text.cloud.routes import router
from scan2text.cloud.service import (
    DEFAULT_PROFILE_PATH,
    CloudProfileService,
    CloudService,
)


class FakeCredentialStore:
    def __init__(self) -> None:
        self.secret: str | None = None

    def write(self, secret: str) -> None:
        self.secret = secret

    def read(self) -> str | None:
        return self.secret

    def delete(self) -> None:
        self.secret = None


def build_client(tmp_path, mode: FakeProviderMode = FakeProviderMode.VISION):
    profiles = CloudProfileService(
        profile_path=tmp_path / "cloud-profile.json",
        default_profile_path=DEFAULT_PROFILE_PATH,
    )
    credentials = FakeCredentialStore()
    service = CloudService(
        profile_service=profiles,
        credential_store=credentials,
        provider_factory=lambda profile, secret: FakeProviderClient(mode),
    )
    app = FastAPI()
    app.include_router(router)
    app.state.cloud_service = service
    return TestClient(app), service, credentials


def save_profile(client: TestClient, *, enabled: bool = False, api_key: str | None = None):
    body = {
        "base_url": "https://provider.example/v1",
        "model_id": "vision-model",
        "enabled": enabled,
    }
    if api_key is not None:
        body["api_key"] = api_key
    return client.put("/api/cloud/profile", json=body)


def test_profile_response_never_contains_secret(tmp_path) -> None:
    client, _, _ = build_client(tmp_path)

    response = save_profile(client, api_key="credential-fixture")
    profile = client.get("/api/cloud/profile")

    assert response.status_code == 200
    assert "credential-fixture" not in response.text
    assert "credential-fixture" not in profile.text
    assert profile.json()["credential"]["last_four"] == "ture"


def test_save_key_returns_descriptor_only(tmp_path) -> None:
    client, _, _ = build_client(tmp_path)

    response = save_profile(client, api_key="credential-fixture")

    assert response.status_code == 200
    assert set(response.json()["credential"]) == {"key_id", "last_four"}


def test_delete_key_is_separate_from_disable(tmp_path) -> None:
    client, _, credentials = build_client(tmp_path)
    save_profile(client, enabled=True, api_key="credential-fixture")

    disabled = save_profile(client, enabled=False)
    tested = client.post("/api/cloud/test-connection")
    assert credentials.read() == "credential-fixture"
    deleted = client.delete("/api/cloud/key")
    missing = client.post("/api/cloud/test-connection")

    assert disabled.json()["enabled"] is False
    assert disabled.json()["credential"] is not None
    assert tested.status_code == 200
    assert deleted.json()["credential"] is None
    assert missing.status_code == 409
    assert missing.json()["detail"] == "CLOUD_KEY_REQUIRED"


def test_connection_test_uses_fake_provider_without_network(tmp_path) -> None:
    client, _, _ = build_client(tmp_path, FakeProviderMode.VISION)
    save_profile(client, api_key="credential-fixture")

    response = client.post("/api/cloud/test-connection")

    assert response.status_code == 200
    assert response.json() == {
        "model_id": "vision-model",
        "can_read_images": True,
        "latency_ms": response.json()["latency_ms"],
        "estimated_cost_usd": 0.0187,
    }


def test_connection_test_reports_text_only_model(tmp_path) -> None:
    client, _, _ = build_client(tmp_path, FakeProviderMode.TEXT_ONLY)
    save_profile(client, api_key="credential-fixture")

    response = client.post("/api/cloud/test-connection")

    assert response.status_code == 200
    assert response.json()["can_read_images"] is False


def test_connection_test_reports_rejected_key(tmp_path) -> None:
    client, _, _ = build_client(tmp_path, FakeProviderMode.REJECTED_KEY)
    save_profile(client, api_key="credential-fixture")

    response = client.post("/api/cloud/test-connection")

    assert response.status_code == 401
    assert response.json()["detail"] == "CLOUD_KEY_REJECTED"
    assert "credential-fixture" not in response.text


def test_connection_test_reports_timeout(tmp_path) -> None:
    client, _, _ = build_client(tmp_path, FakeProviderMode.TIMEOUT)
    save_profile(client, api_key="credential-fixture")

    response = client.post("/api/cloud/test-connection")

    assert response.status_code == 408
    assert response.json()["detail"] == "CLOUD_PROVIDER_TIMEOUT"
    assert "credential-fixture" not in response.text


def test_main_app_exposes_cloud_routes() -> None:
    from scan2text.api.main import app

    paths = set()
    for route in app.routes:
        original = getattr(route, "original_router", None)
        if original is not None:
            paths.update(item.path for item in original.routes)
        elif hasattr(route, "path"):
            paths.add(route.path)
    assert "/api/cloud/profile" in paths
    assert "/api/cloud/test-connection" in paths
