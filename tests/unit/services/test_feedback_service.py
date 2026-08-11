"""Unit tests for FeedbackService."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

from scan2text.services.feedback_service import FeedbackService, PathService


class TestSavePendingFeedback:
    def test_creates_file_in_pending_dir(self, tmp_path):
        paths = PathService(base_dir=str(tmp_path))
        svc = FeedbackService(path_service=paths)
        filename = svc.save_pending_feedback("Great app!", None)
        pending_dir = paths.base_dir / "feedback" / "pending"
        assert (pending_dir / filename).exists()

    def test_json_structure_has_required_fields(self, tmp_path):
        paths = PathService(base_dir=str(tmp_path))
        svc = FeedbackService(path_service=paths)
        filename = svc.save_pending_feedback("Test message", "user@example.com")
        pending_dir = paths.base_dir / "feedback" / "pending"
        content = json.loads((pending_dir / filename).read_text(encoding="utf-8"))
        assert content["message"] == "Test message"
        assert content["contact"] == "user@example.com"
        assert "timestamp" in content
        assert content["version"] == "1.0.0"

    def test_contact_can_be_none(self, tmp_path):
        paths = PathService(base_dir=str(tmp_path))
        svc = FeedbackService(path_service=paths)
        filename = svc.save_pending_feedback("No contact", None)
        pending_dir = paths.base_dir / "feedback" / "pending"
        content = json.loads((pending_dir / filename).read_text(encoding="utf-8"))
        assert content["contact"] is None

    def test_returns_filename_string(self, tmp_path):
        paths = PathService(base_dir=str(tmp_path))
        svc = FeedbackService(path_service=paths)
        result = svc.save_pending_feedback("Hello", None)
        assert isinstance(result, str)
        assert result.endswith(".json")


class TestGetPendingCount:
    def test_returns_zero_when_no_files(self, tmp_path):
        paths = PathService(base_dir=str(tmp_path))
        svc = FeedbackService(path_service=paths)
        assert svc.get_pending_count() == 0

    def test_returns_correct_count(self, tmp_path):
        paths = PathService(base_dir=str(tmp_path))
        svc = FeedbackService(path_service=paths)
        svc.save_pending_feedback("Msg 1", None)
        svc.save_pending_feedback("Msg 2", None)
        svc.save_pending_feedback("Msg 3", None)
        assert svc.get_pending_count() == 3


class TestMovePendingToSent:
    def test_moves_file_from_pending_to_sent(self, tmp_path):
        paths = PathService(base_dir=str(tmp_path))
        svc = FeedbackService(path_service=paths)
        filename = svc.save_pending_feedback("Send me", None)
        pending_dir = paths.base_dir / "feedback" / "pending"
        sent_dir = paths.base_dir / "feedback" / "sent"
        result = svc.move_pending_to_sent(filename)
        assert result is True
        assert not (pending_dir / filename).exists()
        assert (sent_dir / filename).exists()

    def test_returns_false_for_missing_file(self, tmp_path):
        paths = PathService(base_dir=str(tmp_path))
        svc = FeedbackService(path_service=paths)
        result = svc.move_pending_to_sent("nonexistent.json")
        assert result is False
