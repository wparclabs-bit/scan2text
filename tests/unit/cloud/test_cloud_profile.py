from __future__ import annotations

import json

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


def build_service(tmp_path):
    profiles = CloudProfileService(
        profile_path=tmp_path / "cloud-profile.json",
        default_profile_path=DEFAULT_PROFILE_PATH,
    )
    credentials = FakeCredentialStore()
    service = CloudService(
        profile_service=profiles,
        credential_store=credentials,
        provider_factory=lambda profile, secret: object(),
    )
    return service, profiles, credentials


def test_default_profile_is_beta_and_disabled(tmp_path) -> None:
    service, _, _ = build_service(tmp_path)

    profile = service.get_profile()

    assert profile.beta is True
    assert profile.enabled is False
    assert profile.credential is None


def test_default_profile_keeps_t01_recipe_and_measured_cost(tmp_path) -> None:
    service, _, _ = build_service(tmp_path)

    profile = service.get_profile()

    assert profile.recipe.version
    assert profile.recipe.prompt
    assert profile.recipe.temperature == 0.6
    assert profile.recipe.top_p == 0.95
    assert profile.recipe.thinking_enabled is False
    assert profile.cost_estimate.prompt_tokens_per_page == 2167
    assert profile.cost_estimate.completion_tokens_per_page == 381
    assert profile.cost_estimate.pages_per_document == 30
    assert profile.cost_estimate.estimated_cost_usd == 0.0187
    assert profile.cost_estimate.measured_on == "2026-11-15"


def test_saved_profile_never_contains_secret(tmp_path) -> None:
    service, profiles, _ = build_service(tmp_path)

    profile = service.save_profile(
        base_url="https://provider.example/v1",
        model_id="vision-model",
        enabled=False,
        api_key="credential-fixture",
    )

    assert profile.credential is not None
    assert profile.credential.key_id
    assert profile.credential.last_four == "ture"
    raw = profiles.profile_path.read_text(encoding="utf-8")
    assert "credential-fixture" not in raw
    assert "credential" in json.loads(raw)


def test_disabling_profile_preserves_key_descriptor(tmp_path) -> None:
    service, _, credentials = build_service(tmp_path)
    service.save_profile(
        base_url="https://provider.example/v1",
        model_id="vision-model",
        enabled=True,
        api_key="credential-fixture",
    )

    profile = service.save_profile(
        base_url="https://provider.example/v1",
        model_id="vision-model",
        enabled=False,
    )

    assert profile.enabled is False
    assert profile.credential is not None
    assert credentials.read() == "credential-fixture"
