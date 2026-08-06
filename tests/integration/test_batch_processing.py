from __future__ import annotations

import pytest
from scan2text.models.job import JobStatus, OCRJob


class TestJobStatus:
    def test_enum_values(self):
        values = [s.value for s in JobStatus]
        assert "queued" in values
        assert "processing" in values
        assert "done" in values
        assert "failed" in values
        assert "skipped" in values


class TestOCRJobCreation:
    def test_defaults(self):
        job = OCRJob(file_name="doc.pdf", file_path="/data/doc.pdf")
        assert job.status == JobStatus.QUEUED
        assert job.output_path is None
        assert len(job.id) > 0  # UUID-ish
