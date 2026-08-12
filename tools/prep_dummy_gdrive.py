"""Generate dummy model files and print a single valid version.json JSON object.

Usage:
    py -3.12 tools/prep_dummy_gdrive.py

Output:
    - tools/dummy_models/vlm.gguf   (5 MB zeroed bytes)
    - tools/dummy_models/mmproj.gguf (2 MB zeroed bytes)
    - One single valid JSON object printed to stdout containing all keys.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

DUMMY_DIR = Path(__file__).parent / "dummy_models"

# Production filenames per ADR-006 — raw .gguf files, NO ZIP archives
MODELS = {
    "vlm.gguf": 5 * 1024 * 1024,   # 5 MB
    "mmproj.gguf": 2 * 1024 * 1024,  # 2 MB
}

APP_VERSION = "1.0.0"


def generate_file(path: Path, size_bytes: int) -> None:
    """Write a file of exactly size_bytes zeroed bytes."""
    CHUNK = 1 * 1024 * 1024  # 1 MB chunks
    with open(path, "wb") as f:
        remaining = size_bytes
        while remaining > 0:
            write_size = min(CHUNK, remaining)
            f.write(b"\x00" * write_size)
            remaining -= write_size


def sha256_of(path: Path) -> str:
    """Return hex SHA256 digest of a file."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(1 * 1024 * 1024)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    DUMMY_DIR.mkdir(parents=True, exist_ok=True)

    results: dict[str, tuple[int, str]] = {}

    for filename, size in MODELS.items():
        path = DUMMY_DIR / filename
        print(f"Generating {filename} ({size:,} bytes)...", file=sys.stderr)
        generate_file(path, size)
        actual_size = path.stat().st_size
        assert actual_size == size, f"Size mismatch for {filename}: {actual_size} != {size}"
        digest = sha256_of(path)
        results[filename] = (actual_size, digest)
        print(f"  OK  {actual_size:,} bytes  SHA256={digest}", file=sys.stderr)

    # Build a single flat JSON object with all keys.
    vlm_size, vlm_sha = results["vlm.gguf"]
    mmproj_size, mmproj_sha = results["mmproj.gguf"]

    output = {
        "app_version": APP_VERSION,
        "app_download_url": "https://drive.google.com/uc?export=download&id=PLACEHOLDER_APP_ID",
        "vlm_download_url": "https://drive.google.com/uc?export=download&id=PLACEHOLDER_VLM_ID",
        "vlm_sha256": vlm_sha,
        "vlm_size_bytes": vlm_size,
        "mmproj_download_url": "https://drive.google.com/uc?export=download&id=PLACEHOLDER_MMPROJ_ID",
        "mmproj_sha256": mmproj_sha,
        "mmproj_size_bytes": mmproj_size,
        "release_notes": [
            "Live-fire dummy — replace URLs after GDrive upload"
        ],
    }

    print("", file=sys.stderr)
    print("=" * 72, file=sys.stderr)
    print("SINGLE VALID JSON OBJECT (copy-paste into version.json)", file=sys.stderr)
    print("=" * 72, file=sys.stderr)
    print(json.dumps(output, indent=2))

    print("", file=sys.stderr)
    print("GDrive upload steps:", file=sys.stderr)
    print("  1. Upload each .gguf to Google Drive (shareable link).", file=sys.stderr)
    print("  2. Replace PLACEHOLDER_VLM_ID / PLACEHOLDER_MMPROJ_ID with the GDrive file ID.", file=sys.stderr)
    print("  3. The URLs are already in direct download format:", file=sys.stderr)
    print("     https://drive.google.com/uc?export=download&id=<FILE_ID>", file=sys.stderr)
    print("  4. Paste the entire JSON block above into version.json.", file=sys.stderr)


if __name__ == "__main__":
    main()
