"""Hermetic fake provider used by Cloud tests (D-23).

Every failure in the T05 taxonomy is scriptable. ``attempts`` counts calls so a
test can prove a fast-fail was never retried and a retryable failure was retried
exactly three times.
"""

from __future__ import annotations

from enum import Enum

from scan2text.cloud.provider import (
    ChatMessage,
    ProviderAuthenticationError,
    ProviderForbidden,
    ProviderNetworkError,
    ProviderQuotaExceeded,
    ProviderRateLimited,
    ProviderResponse,
    ProviderServerError,
    ProviderTimeout,
)


class FakeProviderMode(str, Enum):
    VISION = "vision"
    TEXT_ONLY = "text_only"
    REJECTED_KEY = "rejected_key"
    FORBIDDEN = "forbidden"
    QUOTA_EXHAUSTED = "quota_exhausted"
    RATE_LIMITED = "rate_limited"
    SERVER_ERROR = "server_error"
    TIMEOUT = "timeout"
    NETWORK_UNAVAILABLE = "network_unavailable"


class FakeProviderClient:
    """Provider fake with one deterministic outcome for each test scenario."""

    def __init__(self, mode: FakeProviderMode = FakeProviderMode.VISION) -> None:
        self.mode = mode
        self.last_message: ChatMessage | None = None
        self.attempts = 0

    def complete(self, message: ChatMessage) -> ProviderResponse:
        self.attempts += 1
        self.last_message = message
        if self.mode is FakeProviderMode.REJECTED_KEY:
            raise ProviderAuthenticationError("Provider rejected the credential")
        if self.mode is FakeProviderMode.FORBIDDEN:
            raise ProviderForbidden("Provider refused the request")
        if self.mode is FakeProviderMode.QUOTA_EXHAUSTED:
            raise ProviderQuotaExceeded("Provider quota is exhausted")
        if self.mode is FakeProviderMode.RATE_LIMITED:
            raise ProviderRateLimited("Provider rate limited the request")
        if self.mode is FakeProviderMode.SERVER_ERROR:
            raise ProviderServerError("Provider returned HTTP 503")
        if self.mode is FakeProviderMode.TIMEOUT:
            raise ProviderTimeout("Provider request timed out")
        if self.mode is FakeProviderMode.NETWORK_UNAVAILABLE:
            raise ProviderNetworkError("Provider is unreachable")
        if self.mode is FakeProviderMode.TEXT_ONLY:
            return ProviderResponse(content="I cannot read images.")
        return ProviderResponse(content="VISION_OK")
