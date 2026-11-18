"""Cancellation of a running cloud job (D-22).

A cancel is honest. The local wait stops at once, the result is discarded, and
the upstream request is abandoned as far as the connection allows. The provider
may still finish the work and charge for it; nothing here claims otherwise.

The registry lives in memory only: jobs never persist.
"""

from __future__ import annotations

import logging
import threading
from typing import Any

logger = logging.getLogger(__name__)


class JobCancelledError(Exception):
    """The job was cancelled: its result is discarded and nothing is written."""


def abort_provider(provider: Any) -> bool:
    """Abandon an in-flight provider request, best effort.

    Returns True when an abort was attempted. A provider that cannot be
    abandoned is not a failure: the local state stays correct either way.
    """
    abort = getattr(provider, "abort", None)
    if not callable(abort):
        return False
    try:
        abort()
    except Exception:  # best effort by design (D-22)
        logger.warning(
            "The upstream abort failed; the local state stays correct.",
            exc_info=True,
        )
        return False
    return True


class JobCancellation:
    """One cancellable job: the flag plus the provider request in flight."""

    def __init__(self) -> None:
        self._event = threading.Event()
        self._lock = threading.Lock()
        self._provider: Any | None = None

    @property
    def cancelled(self) -> bool:
        """True once the user asked for this job to stop."""
        return self._event.is_set()

    def attach_provider(self, provider: Any) -> None:
        """Remember the provider request so a cancel can abandon it."""
        with self._lock:
            self._provider = provider

    def cancel(self) -> bool:
        """Mark the job cancelled and abandon the upstream request, best effort.

        Returns True the first time the job is cancelled.
        """
        first_time = not self._event.is_set()
        self._event.set()
        with self._lock:
            provider = self._provider
        if provider is not None:
            abort_provider(provider)
        return first_time

    def raise_if_cancelled(self) -> None:
        """Stop the work when the job was cancelled."""
        if self._event.is_set():
            raise JobCancelledError("The job was cancelled.")


class CancellationRegistry:
    """Task id -> cancellation. Thread safe, in memory, never persisted."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._entries: dict[str, JobCancellation] = {}

    def create(self, task_id: str) -> JobCancellation:
        """Register a cancellable job and return its cancellation."""
        with self._lock:
            cancellation = JobCancellation()
            self._entries[task_id] = cancellation
            return cancellation

    def get(self, task_id: str) -> JobCancellation | None:
        """Return the cancellation of a task, or None when it is unknown."""
        with self._lock:
            return self._entries.get(task_id)

    def cancel(self, task_id: str) -> bool:
        """Cancel a task. False when the task is unknown or already cancelled."""
        with self._lock:
            cancellation = self._entries.get(task_id)
        if cancellation is None:
            return False
        return cancellation.cancel()

    def discard(self, task_id: str) -> None:
        """Forget a finished task."""
        with self._lock:
            self._entries.pop(task_id, None)

    def clear(self) -> None:
        """Forget every task (tests only)."""
        with self._lock:
            self._entries.clear()


cancellation_registry = CancellationRegistry()
