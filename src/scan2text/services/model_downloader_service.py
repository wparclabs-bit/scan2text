"""Model downloader service — streams model files from remote URLs, verifies SHA256, atomically renames."""

from __future__ import annotations

import hashlib
import json
import logging
import threading
import urllib.request
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

    def get_progress(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "status": self._status,
                "bytes_downloaded": self._bytes_downloaded,
                "total_bytes": self._total_bytes,
                "error_message": self._error_message,
            }

    def start_download(self) -> None:
        """Read version.json and spawn a background thread to stream both model files."""
        with self._lock:
            if self._status == "downloading":
                return
            self._cancel_event.clear()
            self._status = "idle"
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

                    part_path = models_dir / f"{filename}.part"
                    final_path = models_dir / filename

                    try:
                        req = urllib.request.Request(url)
                        with urlopen(req) as resp:
                            content_length = resp.getheader("Content-Length")
                            total = int(content_length) if content_length else declared_size or 0

                            with self._lock:
                                self._total_bytes = total_declared

                            with open(part_path, "wb") as f:
                                while True:
                                    if self._cancel_event.is_set():
                                        with self._lock:
                                            self._status = "cancelled"
                                        break
                                    chunk = resp.read(_CHUNK_SIZE)
                                    if not chunk:
                                        break
                                    f.write(chunk)
                                    downloaded_so_far = part_path.stat().st_size
                                    with self._lock:
                                        self._bytes_downloaded = downloaded_so_far

                        if self._cancel_event.is_set():
                            part_path.unlink(missing_ok=True)
                            return

                        # Verify SHA256
                        sha = hashlib.sha256()
                        with open(part_path, "rb") as f:
                            while True:
                                if self._cancel_event.is_set():
                                    part_path.unlink(missing_ok=True)
                                    with self._lock:
                                        self._status = "cancelled"
                                    return
                                block = f.read(_CHUNK_SIZE)
                                if not block:
                                    break
                                sha.update(block)

                        computed = sha.hexdigest()
                        if computed != expected_sha256:
                            logger.error("SHA256 mismatch for %s: expected %s, got %s", filename, expected_sha256, computed)
                            part_path.unlink(missing_ok=True)
                            with self._lock:
                                self._status = "failed"
                                self._error_message = f"Hash mismatch for {filename}"
                            return

                        part_path.rename(final_path)
                        downloaded_so_far += total

                    except Exception as exc:
                        logger.error("Download failed for %s: %s", filename, exc)
                        part_path.unlink(missing_ok=True)
                        with self._lock:
                            self._status = "failed"
                            self._error_message = str(exc)
                        return

                with self._lock:
                    self._status = "complete"
                    self._bytes_downloaded = total_declared

            except Exception as exc:
                logger.error("Download failed: %s", exc)
                # Clean up any leftover part files.
                for model_cfg in models_config:
                    (models_dir / f"{model_cfg['filename']}.part").unlink(missing_ok=True)
                with self._lock:
                    self._status = "failed"
                    self._error_message = str(exc)

        self._thread = threading.Thread(target=_download, daemon=True)
        self._thread.start()

    def cancel(self) -> None:
        """Signal the background download thread to stop."""
        self._cancel_event.set()
