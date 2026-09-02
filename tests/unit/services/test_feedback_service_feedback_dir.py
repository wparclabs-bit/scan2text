"""Focused test: FeedbackService must write to feedback_dir, not base_dir.

In frozen mode, base_dir = backend/ but feedback lives at portable root/feedback/.
The bug: feedback_service.py:24-26 uses self._paths.base_dir instead of
self._paths.feedback_dir, so offline feedback lands in backend/feedback/
instead of the portable-root feedback/.
"""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import patch

import pytest

from scan2text.services.feedback_service import FeedbackService
from scan2text.services.path_service import PathService


def _freeze() -> None:
    """Set sys.frozen = True (PyInstaller marker)."""
    sys.frozen = True


def _unfreeze() -> None:
    """Remove sys.frozen if present."""
    if hasattr(sys, "frozen"):
        delattr(sys, "frozen")


class TestFeedbackDirNotBaseDir:
    """Verify feedback lands at app_root/feedback/pending, NOT base_dir/feedback/pending."""

    def _make_frozen_paths(self, tmp_path: Path) -> PathService:
        """Build a PathService in frozen mode."""
        portable_root = tmp_path / "Scan2Text"
        backend_dir = portable_root / "backend"
        portable_root.mkdir()
        backend_dir.mkdir()
        (portable_root / "models").mkdir()
        # S63a: base_dir = portable root (parent of backend exe folder)
        return PathService(base_dir=str(portable_root), app_root=str(portable_root))

    def test_ensure_feedback_dirs_returns_paths_under_feedback_dir(self, tmp_path):
        """_ensure_feedback_dirs must return paths under feedback_dir."""
        _freeze()
        try:
            paths = self._make_frozen_paths(tmp_path)
            svc = FeedbackService(path_service=paths)

            pending, sent = svc._ensure_feedback_dirs()

            assert pending == paths.feedback_dir / "pending"
            assert sent == paths.feedback_dir / "sent"
        finally:
            _unfreeze()

    def test_save_pending_feedback_uses_feedback_dir(self, tmp_path):
        """In frozen mode, save_pending_feedback must write to feedback_dir."""
        _freeze()
        try:
            paths = self._make_frozen_paths(tmp_path)
            svc = FeedbackService(path_service=paths)

            filename = svc.save_pending_feedback("Test feedback", None)

            expected_pending = paths.feedback_dir / "pending"

            assert any(expected_pending.glob("*.json")), (
                f"Expected feedback at {expected_pending} (feedback_dir) but not found."
            )
        finally:
            _unfreeze()

    def test_move_pending_to_sent_uses_feedback_dir(self, tmp_path):
        """move_pending_to_sent must operate within feedback_dir."""
        _freeze()
        try:
            paths = self._make_frozen_paths(tmp_path)
            svc = FeedbackService(path_service=paths)

            filename = svc.save_pending_feedback("Send me", None)
            result = svc.move_pending_to_sent(filename)

            expected_sent = paths.feedback_dir / "sent"

            assert result is True
            assert any(expected_sent.glob("*.json")), (
                f"Expected sent file at {expected_sent} but not found."
            )
        finally:
            _unfreeze()
