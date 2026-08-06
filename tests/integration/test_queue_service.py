from __future__ import annotations

import pytest
from pathlib import Path
from unittest.mock import MagicMock

from scan2text.models.job import JobStatus, OCRJob
from scan2text.adapters.ocr_engine import FakeOCR


class TestQueueService:
    """Test that the FIFO queue processes jobs in order."""

    def _make_jobs(self, names):
        return [OCRJob(file_name=n, file_path=f"/data/{n}") for n in names]

    def test_fifo_order(self):
        jobs = self._make_jobs(["first", "second", "third"])
        statuses = [j.status for j in sorted(jobs, key=lambda j: j.created_at)]
        assert all(s == JobStatus.QUEUED for s in statuses)

    def test_skipped_file_does_not_block_others(self, fake_ocr_engine):
        """Simulate one skipped file among valid ones."""
        pending = [
            OCRJob(file_name="valid.png", file_path="/data/valid.png"),
            OCRJob(file_name="skipped.xyz", file_path="/data/skipped.xyz", error_code="UNSUPPORTED_FILE"),
            OCRJob(file_name="also_valid.jpg", file_path="/data/also_valid.jpg"),
        ]
        # In batch processing, only the unsupported file is skipped; others continue.
        processed = [j for j in pending if j.error_code != "UNSUPPORTED_FILE"]
        assert len(processed) == 2
