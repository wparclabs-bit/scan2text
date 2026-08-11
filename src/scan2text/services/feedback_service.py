"""Feedback service — saves offline feedback to pending/ and moves to sent/."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from scan2text.services.path_service import PathService

logger = logging.getLogger(__name__)


class FeedbackService:
    """Manages offline feedback files in feedback/pending/ and feedback/sent/."""

    def __init__(self, path_service: Optional[PathService] = None) -> None:
        self._paths = path_service or PathService()

    def _ensure_feedback_dirs(self) -> tuple[Path, Path]:
        """Create feedback/pending/ and feedback/sent/ if missing."""
        base = self._paths.base_dir
        pending = base / "feedback" / "pending"
        sent = base / "feedback" / "sent"
        pending.mkdir(parents=True, exist_ok=True)
        sent.mkdir(parents=True, exist_ok=True)
        return pending, sent

    def save_pending_feedback(
        self, message: str, contact: Optional[str] = None
    ) -> str:
        """Save a feedback entry as JSON in feedback/pending/.

        Returns the filename (timestamp.json).
        """
        pending, _ = self._ensure_feedback_dirs()
        now = datetime.now(timezone.utc)
        timestamp = now.strftime("%Y%m%dT%H%M%S%fZ")
        filename = f"{timestamp}.json"
        payload = {
            "message": message,
            "contact": contact,
            "timestamp": now.isoformat(),
            "version": "1.0.0",
        }
        target = pending / filename
        target.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        logger.info("Saved pending feedback to %s", target)
        return filename

    def get_pending_count(self) -> int:
        """Return the number of files in feedback/pending/."""
        pending, _ = self._ensure_feedback_dirs()
        return sum(1 for _ in pending.glob("*.json"))

    def move_pending_to_sent(self, filename: str) -> bool:
        """Move a file from feedback/pending/ to feedback/sent/.

        Returns True on success, False if the source file does not exist.
        """
        pending, sent = self._ensure_feedback_dirs()
        src = pending / filename
        dst = sent / filename
        if not src.exists():
            return False
        src.rename(dst)
        logger.info("Moved %s to sent/", filename)
        return True
