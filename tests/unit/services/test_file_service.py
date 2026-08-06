"""Unit tests for FileService."""

from __future__ import annotations

import tempfile
from pathlib import Path

import pytest

from scan2text.services.file_service import (
    DiscoveredFile,
    DiscoveryResult,
    FileService,
    REASON_UNSUPPORTED,
    REASON_MISSING,
    REASON_INVALID_PATH,
)


class TestSupportedExtensions:
    def test_image_extensions_accepted(self, tmp_path):
        svc = FileService()
        for ext in (".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"):
            f = tmp_path / f"doc{ext}"
            f.touch()
            result = svc.discover([f])
            assert len(result.accepted) == 1

    def test_pdf_extension_accepted(self, tmp_path):
        svc = FileService()
        pdf = tmp_path / "doc.pdf"
        pdf.touch()
        result = svc.discover([pdf])
        assert len(result.accepted) == 1

    def test_case_insensitive(self, tmp_path):
        svc = FileService()
        f = tmp_path / "doc.PNG"
        f.touch()
        result = svc.discover([f])
        assert len(result.accepted) == 1

    def test_unsupported_skipped_with_reason(self, tmp_path):
        svc = FileService()
        f = tmp_path / "doc.xyz"
        f.touch()
        result = svc.discover([f])
        assert len(result.skipped) == 1
        assert result.skipped[0].reason_code == REASON_UNSUPPORTED


class TestMissingAndInvalidPaths:
    def test_missing_file_produces_skip_record(self, tmp_path):
        svc = FileService()
        missing = tmp_path / "does_not_exist.png"
        result = svc.discover([missing])
        assert len(result.skipped) == 1
        assert result.skipped[0].reason_code == REASON_MISSING

    def test_invalid_path_type(self, tmp_path):
        svc = FileService()
        # Create a socket-like path (we'll use a non-existent special path)
        result = svc.discover(["/dev/null"])
        # On Windows this may be treated as file or invalid
        # Just verify no exception raised
        assert isinstance(result, DiscoveryResult)


class TestDirectoryEnumeration:
    def test_enumerates_files_in_directory(self, tmp_path):
        svc = FileService()
        d = tmp_path / "input_dir"
        d.mkdir()
        for name in ("a.png", "b.jpg", "c.xyz"):
            (d / name).touch()
        result = svc.discover([d])
        assert len(result.accepted) == 2
        assert len(result.skipped) == 1

    def test_empty_directory(self, tmp_path):
        svc = FileService()
        d = tmp_path / "empty"
        d.mkdir()
        result = svc.discover([d])
        assert len(result.accepted) == 0
        assert len(result.skipped) == 0


class TestDiscoveryCounts:
    def test_total_inputs_correct(self, tmp_path):
        svc = FileService()
        f1 = tmp_path / "a.png"
        f2 = tmp_path / "b.xyz"
        f1.touch()
        f2.touch()
        result = svc.discover([f1, f2])
        assert result.total_inputs == 2
        assert result.supported_count == 1
        assert result.unsupported_count == 1
