"""Provider failure taxonomy and the retry wrapper (D-20, D-21, D-23).

The taxonomy maps every provider response to one of three behaviours:

* fast-fail — a key or quota problem; one attempt, a specific message, a fix-key
  action, and no retry;
* retryable — a rate limit, a server error, or a timeout; three retries with
  exponential backoff and jitter, then the job is parked;
* network — no response at all; the job is parked immediately.

The engine never changes on its own. Only the provider seam is consulted; there
is no fallback client and no alternate response object.
"""

from __future__ import annotations

import random
import time
from dataclasses import dataclass
from enum import Enum
from typing import Any, Callable, Protocol

from scan2text.cloud.provider import (
    ProviderAborted,
    ProviderAuthenticationError,
    ProviderError,
    ProviderForbidden,
    ProviderNetworkError,
    ProviderQuotaExceeded,
    ProviderRateLimited,
    ProviderResponse,
    ProviderServerError,
    ProviderTimeout,
)


class FailureCause(str, Enum):
    UNAUTHORIZED = "unauthorized"
    FORBIDDEN = "forbidden"
    QUOTA_EXHAUSTED = "quota_exhausted"
    RATE_LIMITED = "rate_limited"
    SERVER_ERROR = "server_error"
    TIMEOUT = "timeout"
    NETWORK_UNAVAILABLE = "network_unavailable"
    UNKNOWN = "unknown"


FAST_FAIL_CAUSES = frozenset(
    {FailureCause.UNAUTHORIZED, FailureCause.FORBIDDEN, FailureCause.QUOTA_EXHAUSTED}
)
RETRYABLE_CAUSES = frozenset(
    {FailureCause.RATE_LIMITED, FailureCause.SERVER_ERROR, FailureCause.TIMEOUT}
)
PROVIDER_MAX_RETRIES = 3


@dataclass(frozen=True)
class FailureInfo:
    cause: FailureCause
    error_code: str
    reason_key: str
    message: str
    fix_key: bool = False


_FAILURE_INFO: dict[FailureCause, FailureInfo] = {
    FailureCause.UNAUTHORIZED: FailureInfo(
        FailureCause.UNAUTHORIZED,
        "PROVIDER_UNAUTHORIZED",
        "unauthorized",
        "The provider rejected the API key.",
        fix_key=True,
    ),
    FailureCause.FORBIDDEN: FailureInfo(
        FailureCause.FORBIDDEN,
        "PROVIDER_FORBIDDEN",
        "forbidden",
        "The provider refused this request.",
        fix_key=True,
    ),
    FailureCause.QUOTA_EXHAUSTED: FailureInfo(
        FailureCause.QUOTA_EXHAUSTED,
        "PROVIDER_QUOTA_EXHAUSTED",
        "quota",
        "The provider quota is exhausted.",
        fix_key=True,
    ),
    FailureCause.RATE_LIMITED: FailureInfo(
        FailureCause.RATE_LIMITED,
        "RATE_LIMITED",
        "rateLimited",
        "The provider is rate limiting requests.",
    ),
    FailureCause.SERVER_ERROR: FailureInfo(
        FailureCause.SERVER_ERROR,
        "PROVIDER_SERVER_ERROR",
        "serverError",
        "The provider had a server error.",
    ),
    FailureCause.TIMEOUT: FailureInfo(
        FailureCause.TIMEOUT,
        "PROVIDER_TIMEOUT",
        "timeout",
        "The provider did not answer in time.",
    ),
    FailureCause.NETWORK_UNAVAILABLE: FailureInfo(
        FailureCause.NETWORK_UNAVAILABLE,
        "NETWORK_UNAVAILABLE",
        "network",
        "The network is unavailable.",
    ),
    FailureCause.UNKNOWN: FailureInfo(
        FailureCause.UNKNOWN,
        "UNKNOWN_ERROR",
        "unknown",
        "The provider request failed.",
    ),
}


def info_for(cause: FailureCause) -> FailureInfo:
    """Return the one translation-facing description for a cause."""
    return _FAILURE_INFO[cause]


def classify_failure(exc: Exception) -> FailureCause:
    """Map a provider exception to exactly one taxonomy cause."""
    if isinstance(exc, ProviderAuthenticationError):
        return FailureCause.UNAUTHORIZED
    if isinstance(exc, ProviderForbidden):
        return FailureCause.FORBIDDEN
    if isinstance(exc, ProviderQuotaExceeded):
        return FailureCause.QUOTA_EXHAUSTED
    if isinstance(exc, ProviderRateLimited):
        return FailureCause.RATE_LIMITED
    if isinstance(exc, ProviderServerError):
        return FailureCause.SERVER_ERROR
    if isinstance(exc, ProviderTimeout):
        return FailureCause.TIMEOUT
    if isinstance(exc, ProviderNetworkError):
        return FailureCause.NETWORK_UNAVAILABLE
    return FailureCause.UNKNOWN


class ProviderFailure(Exception):
    """A fast-fail: the job fails once with a specific, actionable message."""

    def __init__(self, info: FailureInfo, message: str | None = None) -> None:
        self.cause = info.cause
        self.reason = message or info.message
        self.reason_key = info.reason_key
        self.error_code = info.error_code
        self.fix_key = info.fix_key
        self.retryable = False
        super().__init__(self.reason)


class ProviderParkedError(Exception):
    """The job is parked in a waiting state with a reason and a retry action."""

    def __init__(self, info: FailureInfo) -> None:
        self.cause = info.cause
        self.reason = info.message
        self.reason_key = info.reason_key
        self.error_code = info.error_code
        self.fix_key = info.fix_key
        self.retryable = True
        super().__init__(self.reason)


class _Complete(Protocol):
    def complete(self, message: Any) -> ProviderResponse: ...


class RetryingProviderClient:
    """Wrap a provider client with the D-20 taxonomy.

    ``max_retries`` counts retries *after* the first attempt, so a retryable
    failure that parks has made ``max_retries + 1`` calls.
    """

    def __init__(
        self,
        client: _Complete,
        *,
        base_delay: float = 0.05,
        jitter: float = 0.02,
        max_retries: int = PROVIDER_MAX_RETRIES,
        sleep: Callable[[float], Any] | None = None,
        random_fn: Callable[[], float] | None = None,
    ) -> None:
        self._client = client
        self.base_delay = base_delay
        self.jitter = jitter
        self.max_retries = max_retries
        self._sleep = sleep or time.sleep
        self._random = random_fn or random.random
        self._aborted = False

    def abort(self) -> None:
        """Abandon the in-flight request, as far as the connection allows (D-22).

        The wrapper forwards the abort to the client it wraps; a client that
        cannot be abandoned is not a failure.
        """
        self._aborted = True
        abort = getattr(self._client, "abort", None)
        if callable(abort):
            abort()

    def complete(self, message: Any) -> ProviderResponse:
        attempt = 0
        while True:
            if self._aborted:
                # An abort is never a provider failure and is never retried.
                raise ProviderAborted("The provider request was abandoned")
            try:
                return self._client.complete(message)
            except ProviderError as exc:
                cause = classify_failure(exc)
                if cause in FAST_FAIL_CAUSES:
                    raise ProviderFailure(info_for(cause)) from exc
                if cause is FailureCause.NETWORK_UNAVAILABLE:
                    raise ProviderParkedError(info_for(cause)) from exc
                if attempt >= self.max_retries:
                    raise ProviderParkedError(info_for(cause)) from exc
                delay = self.base_delay * (2**attempt) + self._random() * self.jitter
                self._sleep(delay)
                attempt += 1
