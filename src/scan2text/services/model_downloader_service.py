"""Model downloader service — streams model files from remote URLs, verifies SHA256, atomically renames."""

from __future__ import annotations

import hashlib
import json
import logging
import os
import threading
import urllib.request
import zipfile
from urllib.request import urlopen
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

_VERSION_JSON = "version.json"
_CHUNK_SIZE = 1 * 1024 * 1024  # 1 MB

# Ordered list of (key_prefix, filename) pairs — VLM first, then MMPROJ.
_MODEL_SPECS: List[Tuple[str, str]] = [
    ("vlm", "vlm.gguf"),
    ("mmproj", "mmproj.gguf"),
]


class ModelDownloaderService:
    """Singleton-like service that downloads both OCR model files with progress tracking."""

    def __init__(self, app_root: Optional[Path] = None) -> None:
        self._app_root = app_root or Path.cwd()
        self._status: str = "idle"
        self._bytes_downloaded: int = 0
        self._total_bytes: int = 0
        self._error_message: Optional[str] = None
        self._cancel_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()

    @property
    def status(self) -> str:
        return self._status

    @property
    def bytes_downloaded(self) -> int:
        return self._bytes_downloaded

    @property
    def total_bytes(self) -> int:
        return self._total_bytes

    @property
    def error_message(self) -> Optional[str]:
        return self._error_message

    def _verify_file(self, path: Path, expected_sha256: str, expected_size: int) -> bool:
        """Check that a file exists, matches expected size and SHA256."""
        if not path.exists():
            return False
        try:
            actual_size = path.stat().st_size
            if actual_size != expected_size:
                return False
            sha = hashlib.sha256()
            with open(path, "rb") as f:
                while True:
                    block = f.read(_CHUNK_SIZE)
                    if not block:
                        break
                    sha.update(block)
            return sha.hexdigest() == expected_sha256
        except Exception:
            return False

    def get_progress(self) -> Dict[str, Any]:
        with self._lock:
            # Disk-aware: if both files verify on disk, report complete without download.
            if self._status not in ("downloading",):
                version_path = self._app_root / _VERSION_JSON
                if version_path.exists():
                    try:
                        version_data = json.loads(version_path.read_text(encoding="utf-8"))
                    except Exception:
                        pass
                    else:
                        models_dir = self._app_root / "models"
                        all_valid = True
                        for key_prefix, filename in _MODEL_SPECS:
                            expected_sha = version_data.get(f"{key_prefix}_sha256")
                            expected_size = version_data.get(f"{key_prefix}_size_bytes", 0)
                            if not expected_sha or not expected_size:
                                all_valid = False
                                break
                            if not self._verify_file(models_dir / filename, expected_sha, expected_size):
                                all_valid = False
                                break
                        if all_valid:
                            total = sum(version_data.get(f"{k}_size_bytes", 0) for k, _ in _MODEL_SPECS)
                            return {
                                "status": "complete",
                                "bytes_downloaded": total,
                                "total_bytes": total,
                                "error_message": None,
                            }
            return {
                "status": self._status,
                "bytes_downloaded": self._bytes_downloaded,
                "total_bytes": self._total_bytes,
                "error_message": self._error_message,
            }

    def start_download(self) -> None:
        """Read version.json and spawn a background thread to stream both model files."""
        with self._lock:
            # Guard against concurrent duplicate starts; allow restart from failed/cancelled/idle.
            if self._status == "downloading":
                return
            self._cancel_event.clear()
            self._status = "downloading"
            self._bytes_downloaded = 0
            self._error_message = None

        version_path = self._app_root / _VERSION_JSON
        if not version_path.exists():
            with self._lock:
                self._status = "failed"
                self._error_message = "version.json not found"
            return

        try:
            version_data = json.loads(version_path.read_text(encoding="utf-8"))
        except Exception as exc:
            with self._lock:
                self._status = "failed"
                self._error_message = f"Failed to read version.json: {exc}"
            return

        # Build per-model config from flat keys.
        models_config: List[Dict[str, Any]] = []
        for key_prefix, _ in _MODEL_SPECS:
            url = version_data.get(f"{key_prefix}_download_url")
            expected_sha256 = version_data.get(f"{key_prefix}_sha256")
            declared_size = version_data.get(f"{key_prefix}_size_bytes", 0)
            if not url:
                with self._lock:
                    self._status = "failed"
                    self._error_message = f"{key_prefix}_download_url not set in version.json"
                return
            models_config.append({
                "prefix": key_prefix,
                "filename": key_prefix + ".gguf",
                "url": url,
                "expected_sha256": expected_sha256,
                "declared_size": declared_size,
            })

        models_dir = self._app_root / "models"
        models_dir.mkdir(parents=True, exist_ok=True)

        # Clean stale .part and .zip files safely at start.
        for model_cfg in models_config:
            (models_dir / f"{model_cfg['filename']}.part").unlink(missing_ok=True)
            (models_dir / f"{model_cfg['filename']}.zip").unlink(missing_ok=True)
            (models_dir / f"{model_cfg['filename']}.zip.part").unlink(missing_ok=True)

        def _download() -> None:
            total_declared = sum(m["declared_size"] for m in models_config)
            downloaded_so_far = 0

            try:
                for model_cfg in models_config:
                    if self._cancel_event.is_set():
                        with self._lock:
                            self._status = "cancelled"
                        return

                    url = model_cfg["url"]
                    filename = model_cfg["filename"]
                    expected_sha256 = model_cfg["expected_sha256"]
                    declared_size = model_cfg["declared_size"]
                    final_path = models_dir / filename

                    # Skip files that already exist on disk.
                    if final_path.exists():
                        downloaded_so_far += declared_size
                        with self._lock:
                            self._bytes_downloaded = downloaded_so_far
                        continue

                    zip_part_path = models_dir / f"{filename}.zip.part"
                    zip_path = models_dir / f"{filename}.zip"

                    try:
                        req = urllib.request.Request(url)
                        with urlopen(req) as resp:
                            content_length = resp.getheader("Content-Length")
                            total = int(content_length) if content_length else declared_size or 0

                            with self._lock:
                                self._total_bytes = total_declared

                            with open(zip_part_path, "wb") as f:
                                while True:
                                    if self._cancel_event.is_set():
                                        with self._lock:
                                            self._status = "cancelled"
                                        break
                                    chunk = resp.read(_CHUNK_SIZE)
                                    if not chunk:
                                        break
                                    f.write(chunk)
                                    downloaded_so_far = zip_part_path.stat().st_size
                                    with self._lock:
                                        self._bytes_downloaded = downloaded_so_far

                        if self._cancel_event.is_set():
                            zip_part_path.unlink(missing_ok=True)
                            return

                        # Atomic rename .zip.part → .zip
                        os.replace(zip_part_path, zip_path)

                        # Verify zip size and SHA256 against version.json.
                        actual_size = zip_path.stat().st_size
                        if actual_size != declared_size:
                            logger.error("Size mismatch for %s.zip: expected %d, got %d", filename, declared_size, actual_size)
                            zip_path.unlink(missing_ok=True)
                            with self._lock:
                                self._status = "failed"
                                self._error_message = f"Size mismatch for {filename}"
                            return

                        sha = hashlib.sha256()
                        with open(zip_path, "rb") as f:
                            while True:
                                if self._cancel_event.is_set():
                                    zip_path.unlink(missing_ok=True)
                                    with self._lock:
                                        self._status = "cancelled"
                                    return
                                block = f.read(_CHUNK_SIZE)
                                if not block:
                                    break
                                sha.update(block)

                        computed = sha.hexdigest()
                        if computed != expected_sha256:
                            logger.error("SHA256 mismatch for %s.zip: expected %s, got %s", filename, expected_sha256, computed)
                            zip_path.unlink(missing_ok=True)
                            with self._lock:
                                self._status = "failed"
                                self._error_message = f"Hash mismatch for {filename}"
                            return

                        # Extract first .gguf entry from the zip.
                        with zipfile.ZipFile(zip_path, "r") as zf:
                            gguf_names = [n for n in zf.namelist() if n.endswith(".gguf")]
                            if not gguf_names:
                                raise ValueError(f"No .gguf entry found in {filename}.zip")
                            with zf.open(gguf_names[0]) as src, open(final_path, "wb") as dst:
                                while True:
                                    chunk = src.read(_CHUNK_SIZE)
                                    if not chunk:
                                        break
                                    dst.write(chunk)

                        # Delete the zip after successful extraction.
                        zip_path.unlink(missing_ok=True)
                        downloaded_so_far += total

                    except Exception as exc:
                        logger.error("Download failed for %s: %s", filename, exc)
                        zip_part_path.unlink(missing_ok=True)
                        zip_path.unlink(missing_ok=True)
                        with self._lock:
                            self._status = "failed"
                            self._error_message = str(exc)
                        return

                with self._lock:
                    self._status = "complete"
                    self._bytes_downloaded = total_declared

            except Exception as exc:
                logger.error("Download failed: %s", exc)
                # Clean up any leftover part or zip files.
                for model_cfg in models_config:
                    (models_dir / f"{model_cfg['filename']}.part").unlink(missing_ok=True)
                    (models_dir / f"{model_cfg['filename']}.zip").unlink(missing_ok=True)
                    (models_dir / f"{model_cfg['filename']}.zip.part").unlink(missing_ok=True)
                with self._lock:
                    self._status = "failed"
                    self._error_message = str(exc)

        self._thread = threading.Thread(target=_download, daemon=True)
        self._thread.start()

    def cancel(self) -> None:
        """Signal the background download thread to stop."""
        self._cancel_event.set()
