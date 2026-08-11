"""Unit tests for LoggingService — privacy-safe rotating log handler."""

from __future__ import annotations

import json
import re
import tempfile
from pathlib import Path
from unittest.mock import patch

import logging

import pytest

from scan2text.services.logging_service import (
    PrivacyFilter,
    StructuredFormatter,
    setup_logging,
)


class TestPrivacyFilter:
    """Tests that filenames are stripped from log output."""

    def test_no_filenames_in_logs(self, tmp_path):
        """Log messages containing file paths must not expose them."""
        log_file = tmp_path / "app.log"
        logger = setup_logging(log_file)
        filter_instance = PrivacyFilter()
        logger.addFilter(filter_instance)

        logger.info("Processing secret.pdf")
        lines = log_file.read_text().splitlines()
        assert "secret.pdf" not in lines[-1]
        assert "[FILE_REDACTED]" in lines[-1]

    def test_no_content_in_logs(self, tmp_path):
        """OCR result text must never appear in log output."""
        log_file = tmp_path / "app.log"
        logger = setup_logging(log_file)
        filter_instance = PrivacyFilter()
        logger.addFilter(filter_instance)

        ocr_result = "This is sensitive document content that must not be logged."
        logger.info("OCR completed for %s", ocr_result)
        lines = log_file.read_text().splitlines()
        assert ocr_result not in lines[-1]

    def test_multiple_filenames_redacted(self, tmp_path):
        """Multiple filenames in one message are all redacted."""
        log_file = tmp_path / "app.log"
        logger = setup_logging(log_file)
        filter_instance = PrivacyFilter()
        logger.addFilter(filter_instance)

        logger.info("Files: report.pdf and image.png processed")
        line = log_file.read_text().strip()
        assert "report.pdf" not in line
        assert "image.png" not in line
        assert line.count("[FILE_REDACTED]") >= 2


class TestRotationConfig:
    """Tests that RotatingFileHandler is configured correctly."""

    def test_rotation_config(self, tmp_path):
        """RotatingFileHandler must use maxBytes=1MB and backupCount=1."""
        log_file = tmp_path / "app.log"
        logger = setup_logging(log_file)

        handlers = [h for h in logger.handlers if isinstance(h, type(logger.handlers[0]))]
        # Find the RotatingFileHandler
        rh_handlers = [
            h for h in logger.handlers
            if type(h).__name__ == "RotatingFileHandler"
        ]
        assert len(rh_handlers) == 1
        rh = rh_handlers[0]
        assert rh.maxBytes == 1_048_576
        assert rh.backupCount == 1


class TestStructuredFormatter:
    """Tests JSON structured logging for OCR events."""

    def test_structured_ocr_event(self, tmp_path):
        """OCR events must be logged as valid JSON with allowed fields only."""
        log_file = tmp_path / "app.log"
        logger = setup_logging(log_file)

        formatter = StructuredFormatter()
        handler = logging.StreamHandler()
        handler.setFormatter(formatter)
        logger.addHandler(handler)

        logger.info(json.dumps({
            "extension": ".pdf",
            "byte_count": 12345,
            "page_count": 3,
            "duration": 2.5,
            "error_code": None,
            "model_version": "ovis-0.9b",
            "timestamp": "2026-08-11T00:00:00+00:00",
        }))
        # Verify the last line is valid JSON with expected keys
        lines = log_file.read_text().splitlines()
        last_line = [l for l in lines if l.strip()][-1]
        data = json.loads(last_line)
        assert data["extension"] == ".pdf"
        assert data["byte_count"] == 12345
        assert data["page_count"] == 3
        assert data["duration"] == 2.5
        assert data["error_code"] is None
        assert data["model_version"] == "ovis-0.9b"
        assert "timestamp" in data


class TestLogOcrEvent:
    """Tests for the log_ocr_event method."""

    def test_log_ocr_event_success(self, tmp_path):
        """Successful OCR event logs structured JSON."""
        log_file = tmp_path / "app.log"
        logger = setup_logging(log_file)

        logger.log_ocr_event(
            extension=".jpg",
            byte_count=50000,
            page_count=1,
            duration=1.2,
            error_code=None,
            model_version="ovis-0.9b",
        )

        lines = log_file.read_text().splitlines()
        json_lines = [l for l in lines if l.strip().startswith("{")]
        assert len(json_lines) >= 1
        data = json.loads(json_lines[-1])
        assert data["extension"] == ".jpg"
        assert data["byte_count"] == 50000
        assert data["page_count"] == 1
        assert data["duration"] == 1.2
        assert data["error_code"] is None
        assert data["model_version"] == "ovis-0.9b"

    def test_log_ocr_event_with_error(self, tmp_path):
        """Failed OCR event logs error_code and no content."""
        log_file = tmp_path / "app.log"
        logger = setup_logging(log_file)

        logger.log_ocr_event(
            extension=".pdf",
            byte_count=100000,
            page_count=5,
            duration=0.0,
            error_code="OCR_TIMEOUT",
            model_version="ovis-0.9b",
        )

        lines = log_file.read_text().splitlines()
        json_lines = [l for l in lines if l.strip().startswith("{")]
        data = json.loads(json_lines[-1])
        assert data["error_code"] == "OCR_TIMEOUT"
        # Ensure no document content leaked
        assert "sensitive" not in data.get("message", "")


class TestNoContentLeakage:
    """Guarantee that OCR text never enters the log."""

    def test_ocr_result_not_in_logs(self, tmp_path):
        """Raw OCR output must never be written to log files."""
        log_file = tmp_path / "app.log"
        logger = setup_logging(log_file)

        sensitive_text = "CONFIDENTIAL: This document contains private health information."
        logger.info("OCR result: %s", sensitive_text)

        content = log_file.read_text()
        assert sensitive_text not in content
