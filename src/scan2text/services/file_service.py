"""File service — discovers, classifies, and validates input files."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import List, Optional

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# Supported extensions (case-insensitive).
SUPPORTED_EXTENSIONS: frozenset[str] = frozenset(
    [".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".pdf"]
)

MAX_FILE_SIZE_BYTES: int = 100 * 1024 * 1024  # 100 MB


class DiscoveredFile(BaseModel):
    """A file that passed initial validation and is ready for processing."""

    path: Path
    name: str
    extension: str
    size_bytes: int


class SkippedFile(BaseModel):
    """A file that was skipped during discovery."""

    path: Path
    reason_code: str
    reason_message: str


class DiscoveryResult(BaseModel):
    """Structured result of a file discovery operation."""

    accepted: List[DiscoveredFile] = []
    skipped: List[SkippedFile] = []

    @property
    def total_inputs(self) -> int:
        return len(self.accepted) + len(self.skipped)

    @property
    def supported_count(self) -> int:
        return len(self.accepted)

    @property
    def unsupported_count(self) -> int:
        return len(self.skipped)


# Reason codes used by FileService.
REASON_UNSUPPORTED = "UNSUPPORTED_FILE"
REASON_MISSING = "MISSING_INPUT"
REASON_INVALID_PATH = "INVALID_PATH"
REASON_TOO_LARGE = "FILE_TOO_LARGE"


def is_supported(path: Path) -> bool:
    """Check if the file extension is in the supported list (case-insensitive)."""
    return path.suffix.lower() in SUPPORTED_EXTENSIONS


def validate_size(path: Path) -> tuple[bool, str]:
    """Return (ok, message) for file size check."""
    if not path.exists():
        return False, f"File not found: {path}"
    size = path.stat().st_size
    if size > MAX_FILE_SIZE_BYTES:
        return False, f"File too large ({size} bytes). Max is {MAX_FILE_SIZE_BYTES}."
    return True, ""


class FileService:
    """Discovers and classifies input files for batch processing.

    - Accepts a list of input paths (files or directories).
    - Expands directories into candidate files (non-recursive).
    - Classifies each as supported or unsupported.
    - Never raises for an unsupported file in a batch.
    """

    @staticmethod
    def sanitize_filename(name: str) -> str:
        """Convert a filename (with optional extension) to a safe stem.

        - Strips file extension.
        - Replaces spaces with underscores.
        - Removes invalid/special characters (& < > : " / \\ | ? * ( ) etc.).
        - Returns "unknown" if empty after sanitization.
        """
        import re

        # Strip extension
        stem = name.rsplit(".", 1)[0] if "." in name else name

        # Remove special characters
        cleaned = re.sub(r'[<>:"/\\|?*&#()]+', "", stem)
        # Collapse whitespace
        cleaned = re.sub(r"\s+", "_", cleaned).strip("_")

        return cleaned or "unknown"

    def discover(self, input_paths: List[str | Path]) -> DiscoveryResult:
        """Discover files from the given input paths.

        Args:
            input_paths: List of file or directory paths to process.

        Returns:
            A DiscoveryResult with accepted and skipped files.
        """
        accepted: List[DiscoveredFile] = []
        skipped: List[SkippedFile] = []

        for raw_path in input_paths:
            path = Path(raw_path)

            if not path.exists():
                skipped.append(SkippedFile(
                    path=path,
                    reason_code=REASON_MISSING,
                    reason_message=f"Input path does not exist: {path}",
                ))
                continue

            if path.is_file():
                self._classify_file(path, accepted, skipped)
            elif path.is_dir():
                self._enumerate_directory(path, accepted, skipped)
            else:
                skipped.append(SkippedFile(
                    path=path,
                    reason_code=REASON_INVALID_PATH,
                    reason_message=f"Invalid path type: {path}",
                ))

        logger.info(
            "Discovery complete: %d supported, %d skipped out of %d inputs",
            len(accepted),
            len(skipped),
            len(input_paths),
        )
        return DiscoveryResult(accepted=accepted, skipped=skipped)

    def _classify_file(
        self,
        path: Path,
        accepted: List[DiscoveredFile],
        skipped: List[SkippedFile],
    ) -> None:
        """Classify a single file as supported or unsupported."""
        if not is_supported(path):
            skipped.append(SkippedFile(
                path=path,
                reason_code=REASON_UNSUPPORTED,
                reason_message=f"Unsupported extension: {path.suffix}",
            ))
            return

        ok, msg = validate_size(path)
        if not ok:
            skipped.append(SkippedFile(
                path=path,
                reason_code=REASON_TOO_LARGE,
                reason_message=msg,
            ))
            return

        accepted.append(DiscoveredFile(
            path=path,
            name=path.name,
            extension=path.suffix.lower(),
            size_bytes=path.stat().st_size,
        ))

    def _enumerate_directory(
        self,
        directory: Path,
        accepted: List[DiscoveredFile],
        skipped: List[SkippedFile],
    ) -> None:
        """Enumerate files in a directory (non-recursive)."""
        for entry in sorted(directory.iterdir()):
            if entry.is_file():
                self._classify_file(entry, accepted, skipped)
