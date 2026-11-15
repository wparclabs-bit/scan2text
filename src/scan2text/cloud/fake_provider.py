"""Hermetic fake provider used by Cloud tests."""

from __future__ import annotations

from enum import Enum

from scan2text.cloud.provider import (
    ChatMessage,
    ProviderAuthenticationError,
    ProviderResponse,
    ProviderTimeout,
)


class FakeProviderMode(str, Enum):
    VISION = "vision"
    TEXT_ONLY = "text_only"
    REJECTED_KEY = "rejected_key"
    TIMEOUT = "timeout"


class FakeProviderClient:
    """Provider fake with one deterministic outcome for each test scenario."""

    def __init__(self, mode: FakeProviderMode = FakeProviderMode.VISION) -> None:
        self.mode = mode
        self.last_message: ChatMessage | None = None

    def complete(self, message: ChatMessage) -> ProviderResponse:
        self.last_message = message
        if self.mode is FakeProviderMode.REJECTED_KEY:
            raise ProviderAuthenticationError("Provider rejected the credential")
        if self.mode is FakeProviderMode.TIMEOUT:
            raise ProviderTimeout("Provider request timed out")
        if self.mode is FakeProviderMode.TEXT_ONLY:
            return ProviderResponse(content="I cannot read images.")
        return ProviderResponse(content="VISION_OK")
