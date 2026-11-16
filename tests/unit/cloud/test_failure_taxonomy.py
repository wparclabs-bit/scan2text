"""T05 — provider failure taxonomy, retries, backoff, and parking (D-20, D-23).

Every interaction goes through the fake provider seam; no test touches the network.
"""

from __future__ import annotations

import pytest

from scan2text.cloud.fake_provider import FakeProviderClient, FakeProviderMode
from scan2text.cloud.failure import (
    FAST_FAIL_CAUSES,
    RETRYABLE_CAUSES,
    FailureCause,
    ProviderFailure,
    ProviderParkedError,
    RetryingProviderClient,
    classify_failure,
)
from scan2text.cloud.provider import (
    ProviderAuthenticationError,
    ProviderError,
    ProviderForbidden,
    ProviderNetworkError,
    ProviderQuotaExceeded,
    ProviderRateLimited,
    ProviderServerError,
    ProviderTimeout,
)


def _classify_cases():
    return [
        (ProviderAuthenticationError("x"), FailureCause.UNAUTHORIZED),
        (ProviderForbidden("x"), FailureCause.FORBIDDEN),
        (ProviderQuotaExceeded("x"), FailureCause.QUOTA_EXHAUSTED),
        (ProviderRateLimited("x"), FailureCause.RATE_LIMITED),
        (ProviderServerError("x"), FailureCause.SERVER_ERROR),
        (ProviderTimeout("x"), FailureCause.TIMEOUT),
        (ProviderNetworkError("x"), FailureCause.NETWORK_UNAVAILABLE),
    ]


def test_every_provider_error_classifies_to_one_cause():
    for exc, expected in _classify_cases():
        assert classify_failure(exc) is expected


def test_fast_fail_and_retryable_sets_are_disjoint():
    assert FAST_FAIL_CAUSES.isdisjoint(RETRYABLE_CAUSES)


def _wrapper(mode, *, base_delay=0.0, jitter=0.0, attempts=None, sleep_calls=None):
    fake = FakeProviderClient(mode)
    sleeps = []
    wrapper = RetryingProviderClient(
        fake,
        base_delay=base_delay,
        jitter=jitter,
        sleep=sleeps.append,
        random_fn=lambda: jitter,
    )
    return fake, wrapper, sleeps


def test_rejected_key_fails_on_first_attempt_with_a_specific_message_and_no_retry():
    fake, wrapper, _ = _wrapper(FakeProviderMode.REJECTED_KEY)
    with pytest.raises(ProviderFailure) as ei:
        wrapper.complete(None)
    assert ei.value.cause is FailureCause.UNAUTHORIZED
    assert ei.value.fix_key is True
    assert ei.value.reason  # a short human sentence, never a raw code
    assert fake.attempts == 1


def test_forbidden_request_fails_on_first_attempt_with_a_specific_message_and_no_retry():
    fake, wrapper, _ = _wrapper(FakeProviderMode.FORBIDDEN)
    with pytest.raises(ProviderFailure) as ei:
        wrapper.complete(None)
    assert ei.value.cause is FailureCause.FORBIDDEN
    assert ei.value.fix_key is True
    assert fake.attempts == 1


def test_exhausted_quota_fails_on_first_attempt_with_a_specific_message_and_no_retry():
    fake, wrapper, _ = _wrapper(FakeProviderMode.QUOTA_EXHAUSTED)
    with pytest.raises(ProviderFailure) as ei:
        wrapper.complete(None)
    assert ei.value.cause is FailureCause.QUOTA_EXHAUSTED
    assert ei.value.fix_key is True
    assert fake.attempts == 1


@pytest.mark.parametrize(
    "mode",
    [FakeProviderMode.RATE_LIMITED, FakeProviderMode.SERVER_ERROR, FakeProviderMode.TIMEOUT],
)
def test_retryable_cause_retries_three_times_then_parks(mode):
    from scan2text.cloud.failure import PROVIDER_MAX_RETRIES

    fake, wrapper, sleeps = _wrapper(mode, base_delay=0.01, jitter=0.0)
    with pytest.raises(ProviderParkedError) as ei:
        wrapper.complete(None)
    assert fake.attempts == PROVIDER_MAX_RETRIES + 1
    assert len(sleeps) == PROVIDER_MAX_RETRIES
    assert ei.value.cause is classify_failure(
        {
            FakeProviderMode.RATE_LIMITED: ProviderRateLimited("x"),
            FakeProviderMode.SERVER_ERROR: ProviderServerError("x"),
            FakeProviderMode.TIMEOUT: ProviderTimeout("x"),
        }[mode]
    )


def test_dead_network_parks_without_failing():
    fake, wrapper, sleeps = _wrapper(FakeProviderMode.NETWORK_UNAVAILABLE)
    with pytest.raises(ProviderParkedError) as ei:
        wrapper.complete(None)
    assert ei.value.cause is FailureCause.NETWORK_UNAVAILABLE
    assert ei.value.error_code == "NETWORK_UNAVAILABLE"
    assert fake.attempts == 1
    assert sleeps == []


def test_retries_use_backoff_and_jitter():
    fake, wrapper, sleeps = _wrapper(FakeProviderMode.RATE_LIMITED, base_delay=0.05, jitter=0.5)
    from scan2text.cloud.failure import PROVIDER_MAX_RETRIES

    with pytest.raises(ProviderParkedError):
        wrapper.complete(None)
    assert len(sleeps) == PROVIDER_MAX_RETRIES
    # Each delay grows (backoff) and carries the injected jitter on top.
    assert sleeps == sorted(sleeps)
    assert len(set(sleeps)) == len(sleeps)
    assert all(delay >= 0.05 for delay in sleeps)


def test_parked_error_carries_reason_and_error_code():
    fake, wrapper, _ = _wrapper(FakeProviderMode.RATE_LIMITED)
    with pytest.raises(ProviderParkedError) as ei:
        wrapper.complete(None)
    assert isinstance(ei.value.reason, str) and ei.value.reason
    assert ei.value.error_code == "RATE_LIMITED"
    assert ei.value.retryable is True


def test_a_parked_job_never_switches_engine():
    from scan2text.cloud.provider import ProviderResponse

    fake, wrapper, _ = _wrapper(FakeProviderMode.NETWORK_UNAVAILABLE)
    with pytest.raises(ProviderParkedError) as ei:
        wrapper.complete(None)
    # No response is produced by the wrapper, so there is no object carrying an
    # alternate engine — the only client consulted is the cloud fake.
    assert not isinstance(getattr(ei.value, "response", None), ProviderResponse)
    assert getattr(ei.value, "engine", None) is None
    assert fake.attempts == 1
