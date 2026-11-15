"""Cloud Profile persistence and the application-facing Cloud service."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Callable, Protocol

from scan2text.cloud.capability import CapabilityResult, CapabilityTester
from scan2text.cloud.models import CloudProfile
from scan2text.cloud.provider import OpenAICompatibleProviderClient, ProviderClient
from scan2text.services.credential_store import (
    CREDENTIAL_TARGET,
    build_default_credential_store,
    describe_credential,
)


DEFAULT_PROFILE_PATH = Path(__file__).with_name("default_profile.json")


class CredentialStoreApi(Protocol):
    def write(self, secret: str) -> None:
        """Store one secret."""

    def read(self) -> str | None:
        """Read one secret, or ``None``."""

    def delete(self) -> None:
        """Delete one secret."""


class CloudProfileError(Exception):
    """The Cloud Profile could not be loaded or saved."""


class CloudKeyRequiredError(Exception):
    """No stored Cloud provider key is available."""


class CloudProfileService:
    """Load and atomically save the secret-free Cloud Profile file."""

    def __init__(
        self,
        *,
        profile_path: Path,
        default_profile_path: Path = DEFAULT_PROFILE_PATH,
    ) -> None:
        self.profile_path = profile_path
        self.default_profile_path = default_profile_path

    def load(self) -> CloudProfile:
        source = self.profile_path if self.profile_path.exists() else self.default_profile_path
        try:
            raw = json.loads(source.read_text(encoding="utf-8"))
            return CloudProfile.model_validate(raw)
        except (OSError, ValueError) as exc:
            raise CloudProfileError("Cloud Profile is invalid") from exc

    def save(self, profile: CloudProfile) -> CloudProfile:
        self.profile_path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.profile_path.with_suffix(".tmp")
        try:
            temporary.write_text(
                json.dumps(profile.model_dump(), indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            os.replace(temporary, self.profile_path)
        except OSError as exc:
            temporary.unlink(missing_ok=True)
            raise CloudProfileError("Cloud Profile could not be saved") from exc
        return profile


def build_production_cloud_service(path_service) -> CloudService:
    """Build the production Profile, credential, and provider dependencies."""
    settings_dir = path_service.settings_path.parent
    profiles = CloudProfileService(profile_path=settings_dir / "cloud-profile.json")
    credentials = build_default_credential_store(settings_dir)

    def provider_factory(profile: CloudProfile, secret: str) -> ProviderClient:
        return OpenAICompatibleProviderClient(
            base_url=profile.base_url,
            model_id=profile.model_id,
            api_key=secret,
            recipe=profile.recipe,
        )

    return CloudService(
        profile_service=profiles,
        credential_store=credentials,
        provider_factory=provider_factory,
    )


class CloudService:
    """Coordinate Profile persistence, credential storage, and capability tests."""

    def __init__(
        self,
        *,
        profile_service: CloudProfileService,
        credential_store: CredentialStoreApi,
        provider_factory: Callable[[CloudProfile, str], ProviderClient],
    ) -> None:
        self._profiles = profile_service
        self._credentials = credential_store
        self._provider_factory = provider_factory

    def get_profile(self) -> CloudProfile:
        return self._profiles.load()

    def save_profile(
        self,
        *,
        base_url: str,
        model_id: str,
        enabled: bool,
        api_key: str | None = None,
    ) -> CloudProfile:
        profile = self._profiles.load().model_copy(
            update={
                "base_url": base_url.strip(),
                "model_id": model_id.strip(),
                "enabled": enabled,
            }
        )
        if api_key:
            self._credentials.write(api_key)
            profile.credential = describe_credential(CREDENTIAL_TARGET, api_key)
        return self._profiles.save(profile)

    def delete_key(self) -> CloudProfile:
        self._credentials.delete()
        profile = self._profiles.load().model_copy(update={"credential": None})
        return self._profiles.save(profile)

    def test_connection(self) -> CapabilityResult:
        profile = self._profiles.load()
        secret = self._credentials.read()
        if not secret:
            raise CloudKeyRequiredError("No Cloud provider key is stored")
        client = self._provider_factory(profile, secret)
        return CapabilityTester(client).test(
            model_id=profile.model_id,
            recipe=profile.recipe,
            estimated_cost_usd=profile.cost_estimate.estimated_cost_usd,
        )
