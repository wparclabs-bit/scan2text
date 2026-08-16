"""Unit tests for ModelDownloaderService — streaming download, SHA256 verification, cancellation."""

from __future__ import annotations

import hashlib
import json
import threading
import time
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


def _make_version_json(tmp_path, vlm_sha="abc123", vlm_size=1024, mmproj_sha="def456", mmproj_size=512):
    version = {
        "vlm_download_url": "http://example.com/vlm.gguf",
        "vlm_sha256": vlm_sha,
        "vlm_size_bytes": vlm_size,
        "mmproj_download_url": "http://example.com/mmproj.gguf",
        "mmproj_sha256": mmproj_sha,
        "mmproj_size_bytes": mmproj_size,
    }
    (tmp_path / "version.json").write_text(json.dumps(version), encoding="utf-8")
    return tmp_path / "version.json"


class TestStartDownload:
    def test_reads_version_json_and_sets_downloading_status(self, tmp_path):
        vlm_data = b"x" * 1024
        mmproj_data = b"y" * 512
        vlm_sha = hashlib.sha256(vlm_data).hexdigest()
        mmproj_sha = hashlib.sha256(mmproj_data).hexdigest()
        _make_version_json(tmp_path, vlm_sha=vlm_sha, vlm_size=len(vlm_data), mmproj_sha=mmproj_sha, mmproj_size=len(mmproj_data))

        responses = [_FakeResponse([vlm_data], len(vlm_data)), _FakeResponse([mmproj_data], len(mmproj_data))]
        with patch("scan2text.services.model_downloader_service.urlopen", side_effect=responses):
            svc = ModelDownloaderService(app_root=tmp_path)
            svc.start_download()
            for _ in range(50):
                if svc.status in ("complete", "failed", "cancelled"):
                    break
                threading.Event().wait(0.1)
            assert svc.status in ("downloading", "complete")
            svc.cancel()

    def test_successful_download_creates_both_gguf_files(self, tmp_path):
        vlm_data = b"A" * 1024
        vlm_sha = hashlib.sha256(vlm_data).hexdigest()
        mmproj_data = b"B" * 512
        mmproj_sha = hashlib.sha256(mmproj_data).hexdigest()
        _make_version_json(tmp_path, vlm_sha=vlm_sha, vlm_size=len(vlm_data), mmproj_sha=mmproj_sha, mmproj_size=len(mmproj_data))
        models_dir = tmp_path / "models"
        models_dir.mkdir()

        responses = [_FakeResponse([vlm_data], len(vlm_data)), _FakeResponse([mmproj_data], len(mmproj_data))]
        with patch("scan2text.services.model_downloader_service.urlopen", side_effect=responses):
            svc = ModelDownloaderService(app_root=tmp_path)
            svc.start_download()
            for _ in range(50):
                if svc.status in ("complete", "failed", "cancelled"):
                    break
                threading.Event().wait(0.1)

        assert svc.status == "complete"
        assert (models_dir / "vlm.gguf").exists()
        assert (models_dir / "mmproj.gguf").exists()
        assert not (models_dir / "vlm.gguf.part").exists()
        assert not (models_dir / "mmproj.gguf.part").exists()

    def test_cancellation_deletes_part_files(self, tmp_path):
        vlm_data = b"x" * (500 * 1024)
        vlm_sha = hashlib.sha256(vlm_data).hexdigest()
        mmproj_data = b"y" * 256
        mmproj_sha = hashlib.sha256(mmproj_data).hexdigest()
        _make_version_json(tmp_path, vlm_sha=vlm_sha, vlm_size=len(vlm_data), mmproj_sha=mmproj_sha, mmproj_size=len(mmproj_data))
        models_dir = tmp_path / "models"
        models_dir.mkdir()

        responses = [
            _FakeResponse([vlm_data], len(vlm_data), bytes_per_read=1),
            _FakeResponse([mmproj_data], len(mmproj_data)),
        ]
        with patch("scan2text.services.model_downloader_service.urlopen", side_effect=responses):
            svc = ModelDownloaderService(app_root=tmp_path)
            svc.start_download()
            threading.Event().wait(0.01)
            svc.cancel()
            for _ in range(30):
                if svc.status in ("cancelled", "complete", "failed"):
                    break
                threading.Event().wait(0.1)

        assert svc.status == "cancelled"
        part_files = list(models_dir.glob("*.part"))
        assert len(part_files) == 0

    def test_hash_mismatch_deletes_part_and_sets_failed(self, tmp_path):
        bad_vlm_sha = "0000000000000000000000000000000000000000000000000000000000000000"
        vlm_data = b"B" * 512
        mmproj_data = b"C" * 256
        mmproj_sha = hashlib.sha256(mmproj_data).hexdigest()
        _make_version_json(tmp_path, vlm_sha=bad_vlm_sha, vlm_size=len(vlm_data), mmproj_sha=mmproj_sha, mmproj_size=len(mmproj_data))
        models_dir = tmp_path / "models"
        models_dir.mkdir()

        responses = [_FakeResponse([vlm_data], len(vlm_data)), _FakeResponse([mmproj_data], len(mmproj_data))]
        with patch("scan2text.services.model_downloader_service.urlopen", side_effect=responses):
            svc = ModelDownloaderService(app_root=tmp_path)
            svc.start_download()
            for _ in range(50):
                if svc.status in ("complete", "failed", "cancelled"):
                    break
                threading.Event().wait(0.1)

        assert svc.status == "failed"
        assert "Hash mismatch" in svc.error_message
        part_files = list(models_dir.glob("*.part"))
        assert len(part_files) == 0

    def test_missing_vlm_url_sets_failed(self, tmp_path):
        version = {
            "vlm_download_url": "",
            "mmproj_download_url": "http://example.com/mmproj.gguf",
            "mmproj_sha256": "abc",
            "mmproj_size_bytes": 100,
        }
        (tmp_path / "version.json").write_text(json.dumps(version), encoding="utf-8")
        svc = ModelDownloaderService(app_root=tmp_path)
        svc.start_download()
        for _ in range(10):
            if svc.status in ("failed",):
                break
            threading.Event().wait(0.1)
        assert svc.status == "failed"
        assert "vlm_download_url not set" in svc.error_message

    def test_missing_mmproj_url_sets_failed(self, tmp_path):
        vlm_data = b"x" * 128
        vlm_sha = hashlib.sha256(vlm_data).hexdigest()
        version = {
            "vlm_download_url": "http://example.com/vlm.gguf",
            "vlm_sha256": vlm_sha,
            "vlm_size_bytes": len(vlm_data),
            "mmproj_download_url": "",
        }
        (tmp_path / "version.json").write_text(json.dumps(version), encoding="utf-8")
        responses = [_FakeResponse([vlm_data], len(vlm_data))]
        with patch("scan2text.services.model_downloader_service.urlopen", side_effect=responses):
            svc = ModelDownloaderService(app_root=tmp_path)
            svc.start_download()
            for _ in range(50):
                if svc.status in ("complete", "failed"):
                    break
                threading.Event().wait(0.1)
        assert svc.status == "failed"
        assert "mmproj_download_url not set" in svc.error_message


class TestGetProgress:
    def test_initial_state(self, tmp_path):
        svc = ModelDownloaderService(app_root=tmp_path)
        state = svc.get_progress()
        assert state["status"] == "idle"
        assert state["bytes_downloaded"] == 0
        assert state["total_bytes"] == 0
        assert state["error_message"] is None

    def test_state_updates_during_download(self, tmp_path):
        vlm_data = b"C" * 1024
        mmproj_data = b"D" * 512
        vlm_sha = hashlib.sha256(vlm_data).hexdigest()
        mmproj_sha = hashlib.sha256(mmproj_data).hexdigest()
        _make_version_json(tmp_path, vlm_sha=vlm_sha, vlm_size=len(vlm_data), mmproj_sha=mmproj_sha, mmproj_size=len(mmproj_data))

        responses = [_FakeResponse([vlm_data], len(vlm_data)), _FakeResponse([mmproj_data], len(mmproj_data))]
        with patch("scan2text.services.model_downloader_service.urlopen", side_effect=responses):
            svc = ModelDownloaderService(app_root=tmp_path)
            svc.start_download()
            for _ in range(50):
                if svc.status in ("complete", "failed", "cancelled"):
                    break
                threading.Event().wait(0.1)

        state = svc.get_progress()
        assert state["status"] == "complete"
        assert state["bytes_downloaded"] == 1536
        assert state["total_bytes"] == 1536

    def test_aggregated_progress_during_dual_download(self, tmp_path):
        vlm_data = b"E" * 1024
        mmproj_data = b"F" * 1024
        vlm_sha = hashlib.sha256(vlm_data).hexdigest()
        mmproj_sha = hashlib.sha256(mmproj_data).hexdigest()
        _make_version_json(tmp_path, vlm_sha=vlm_sha, vlm_size=len(vlm_data), mmproj_sha=mmproj_sha, mmproj_size=len(mmproj_data))

        responses = [_FakeResponse([vlm_data], len(vlm_data)), _FakeResponse([mmproj_data], len(mmproj_data))]
        with patch("scan2text.services.model_downloader_service.urlopen", side_effect=responses):
            svc = ModelDownloaderService(app_root=tmp_path)
            svc.start_download()
            for _ in range(50):
                if svc.status in ("complete", "failed", "cancelled"):
                    break
                threading.Event().wait(0.1)

        state = svc.get_progress()
        assert state["status"] == "complete"
        assert state["bytes_downloaded"] == 2048
        assert state["total_bytes"] == 2048


class TestDiskAwareDownload:
    def test_precreated_vlm_with_correct_sha_skips_download_and_no_rename_error(self, tmp_path):
        """Bug 1: Windows WinError 183 when vlm.gguf already exists at rename step."""
        vlm_data = b"Z" * 1024
        vlm_sha = hashlib.sha256(vlm_data).hexdigest()
        mmproj_data = b"W" * 512
        mmproj_sha = hashlib.sha256(mmproj_data).hexdigest()
        _make_version_json(tmp_path, vlm_sha=vlm_sha, vlm_size=len(vlm_data), mmproj_sha=mmproj_sha, mmproj_size=len(mmproj_data))
        models_dir = tmp_path / "models"
        models_dir.mkdir()
        (models_dir / "vlm.gguf").write_bytes(vlm_data)

        responses = [_FakeResponse([mmproj_data], len(mmproj_data))]
        with patch("scan2text.services.model_downloader_service.urlopen", side_effect=responses):
            svc = ModelDownloaderService(app_root=tmp_path)
            svc.start_download()
            for _ in range(50):
                if svc.status in ("complete", "failed", "cancelled"):
                    break
                threading.Event().wait(0.1)

        assert svc.status == "complete"
        assert (models_dir / "vlm.gguf").exists()
        assert (models_dir / "mmproj.gguf").exists()

    def test_valid_models_on_disk_returns_complete_without_download(self, tmp_path):
        """Bug 2: GET /api/download/status should validate disk files and return complete."""
        vlm_data = b"P" * 1024
        vlm_sha = hashlib.sha256(vlm_data).hexdigest()
        mmproj_data = b"Q" * 512
        mmproj_sha = hashlib.sha256(mmproj_data).hexdigest()
        _make_version_json(tmp_path, vlm_sha=vlm_sha, vlm_size=len(vlm_data), mmproj_sha=mmproj_sha, mmproj_size=len(mmproj_data))
        models_dir = tmp_path / "models"
        models_dir.mkdir()
        (models_dir / "vlm.gguf").write_bytes(vlm_data)
        (models_dir / "mmproj.gguf").write_bytes(mmproj_data)

        svc = ModelDownloaderService(app_root=tmp_path)
        state = svc.get_progress()
        assert state["status"] == "complete"

    def test_concurrent_start_calls_do_not_run_two_downloads(self, tmp_path):
        """Guard against concurrent duplicate starts spawning two download threads."""
        vlm_data = b"R" * 1024
        vlm_sha = hashlib.sha256(vlm_data).hexdigest()
        mmproj_data = b"S" * 512
        mmproj_sha = hashlib.sha256(mmproj_data).hexdigest()
        _make_version_json(tmp_path, vlm_sha=vlm_sha, vlm_size=len(vlm_data), mmproj_sha=mmproj_sha, mmproj_size=len(mmproj_data))
        models_dir = tmp_path / "models"
        models_dir.mkdir()

        call_count = 0
        original_urlopen = None

        def counting_urlopen(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            return _FakeResponse([vlm_data if call_count % 2 == 1 else mmproj_data], 1024 if call_count % 2 == 1 else 512)

        import scan2text.services.model_downloader_service as mds
        with patch.object(mds, "urlopen", side_effect=counting_urlopen):
            svc = ModelDownloaderService(app_root=tmp_path)
            svc.start_download()
            svc.start_download()
            for _ in range(50):
                if svc.status in ("complete", "failed", "cancelled"):
                    break
                threading.Event().wait(0.1)

        assert svc.status == "complete"
        assert call_count == 2
