"""Unit tests for ModelDownloaderService — streaming download, SHA256 verification, cancellation."""

from __future__ import annotations

import hashlib
import json
import tempfile
import threading
import time
from io import BytesIO
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from scan2text.services.model_downloader_service import ModelDownloaderService


class _FakeResponse:
    """Minimal urllib response that yields fixed chunks and exposes headers."""

    def __init__(self, chunks, content_length=None, bytes_per_read=None):
        self._chunks = list(chunks)
        self._content_length = content_length
        self._bytes_per_read = bytes_per_read

    def read(self, size=-1):
        if not self._chunks:
            return b""
        chunk = self._chunks.pop(0)
        if self._bytes_per_read is not None:
            # Yield one byte at a time to simulate slow network for cancellation tests.
            result = chunk[:self._bytes_per_read]
            self._chunks.insert(0, chunk[self._bytes_per_read:])
            time.sleep(0.002)
            return result
        return chunk

    def getheader(self, name, default=None):
        if name.lower() == "content-length" and self._content_length is not None:
            return str(self._content_length)
        return default

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
        return False

    def close(self):
        pass


def _make_version_json(tmp_path, sha256="abc123", size_bytes=1024):
    version = {
        "model_version": "test-model-v1",
        "model_download_url": "http://example.com/model.gguf",
        "model_sha256": sha256,
        "model_size_bytes": size_bytes,
    }
    (tmp_path / "version.json").write_text(json.dumps(version), encoding="utf-8")
    return tmp_path / "version.json"


class TestStartDownload:
    def test_reads_version_json_and_sets_downloading_status(self, tmp_path):
        data = b"x" * 1024
        real_sha = hashlib.sha256(data).hexdigest()
        _make_version_json(tmp_path, sha256=real_sha, size_bytes=len(data))
        with patch("scan2text.services.model_downloader_service.urlopen", return_value=_FakeResponse([data], len(data))):
            svc = ModelDownloaderService(app_root=tmp_path)
            svc.start_download()
            # Give the background thread a moment to start.
            for _ in range(50):
                if svc.status in ("complete", "failed", "cancelled"):
                    break
                threading.Event().wait(0.1)
            # Status should be complete since hash matches and download finishes fast.
            assert svc.status in ("downloading", "complete")
            svc.cancel()

    def test_successful_download_creates_part_then_renames(self, tmp_path):
        sha = "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592"
        data = b"A" * 1024
        expected_hash = hashlib.sha256(data).hexdigest()
        _make_version_json(tmp_path, sha256=expected_hash, size_bytes=len(data))
        models_dir = tmp_path / "models"
        models_dir.mkdir()

        final_name = "test-model-v1.gguf"
        part_name = "test-model-v1.part"

        with patch("scan2text.services.model_downloader_service.urlopen", return_value=_FakeResponse([data], len(data))):
            svc = ModelDownloaderService(app_root=tmp_path)
            svc.start_download()
            # Wait for background thread to finish.
            for _ in range(50):
                if svc.status in ("complete", "failed", "cancelled"):
                    break
                threading.Event().wait(0.1)

        assert svc.status == "complete"
        assert (models_dir / final_name).exists()
        assert not (models_dir / part_name).exists()

    def test_cancellation_deletes_part_file(self, tmp_path):
        # Use a large payload so the slowed-down read gives us time to cancel.
        data = b"x" * (500 * 1024)  # 500 KB
        real_sha = hashlib.sha256(data).hexdigest()
        _make_version_json(tmp_path, sha256=real_sha, size_bytes=len(data))
        models_dir = tmp_path / "models"
        models_dir.mkdir()

        # Yield one byte at a time with a tiny sleep to simulate slow network.
        with patch("scan2text.services.model_downloader_service.urlopen", return_value=_FakeResponse([data], len(data), bytes_per_read=1)):
            svc = ModelDownloaderService(app_root=tmp_path)
            svc.start_download()
            threading.Event().wait(0.01)
            svc.cancel()
            # Give thread time to notice cancellation.
            for _ in range(30):
                if svc.status in ("cancelled", "complete", "failed"):
                    break
                threading.Event().wait(0.1)

        assert svc.status == "cancelled"
        part_files = list(models_dir.glob("*.part"))
        assert len(part_files) == 0

    def test_hash_mismatch_deletes_part_and_sets_failed(self, tmp_path):
        bad_sha = "0000000000000000000000000000000000000000000000000000000000000000"
        data = b"B" * 512
        _make_version_json(tmp_path, sha256=bad_sha, size_bytes=len(data))
        models_dir = tmp_path / "models"
        models_dir.mkdir()

        with patch("scan2text.services.model_downloader_service.urlopen", return_value=_FakeResponse([data], len(data))):
            svc = ModelDownloaderService(app_root=tmp_path)
            svc.start_download()
            for _ in range(50):
                if svc.status in ("complete", "failed", "cancelled"):
                    break
                threading.Event().wait(0.1)

        assert svc.status == "failed"
        assert svc.error_message == "Hash mismatch"
        part_files = list(models_dir.glob("*.part"))
        assert len(part_files) == 0


class TestGetProgress:
    def test_initial_state(self):
        svc = ModelDownloaderService()
        state = svc.get_progress()
        assert state["status"] == "idle"
        assert state["bytes_downloaded"] == 0
        assert state["total_bytes"] == 0
        assert state["error_message"] is None

    def test_state_updates_during_download(self, tmp_path):
        data = b"C" * 1024
        real_sha = hashlib.sha256(data).hexdigest()
        _make_version_json(tmp_path, sha256=real_sha, size_bytes=len(data))

        with patch("scan2text.services.model_downloader_service.urlopen", return_value=_FakeResponse([data], len(data))):
            svc = ModelDownloaderService(app_root=tmp_path)
            svc.start_download()
            for _ in range(50):
                if svc.status in ("complete", "failed", "cancelled"):
                    break
                threading.Event().wait(0.1)

        state = svc.get_progress()
        assert state["status"] == "complete"
        assert state["bytes_downloaded"] == 1024
        assert state["total_bytes"] == 1024
