# S28 — BACKEND ZIP EXTRACTION

- **Date:** 2026-08-23
- **Status:** COMPLETE
- **Slice:** S28-BACKEND-ZIP-EXTRACTION

## Goal
Implement zip download + extraction in the backend downloader. Update repo `version.json` with CEO-verified SHA256 hashes.

## Baseline
S27 proved the downloader saves zips as `.gguf` with no extraction. CEO uploaded WinRAR-compressed zips to GitHub Release tag `OCR` and verified them.

## Changes

### `src/scan2text/services/model_downloader_service.py`
- Added `import zipfile`.
- Download flow per model: URL → `<name>.zip.part` → atomic `os.replace` → `<name>.zip` → verify size + SHA256 against `version.json` → open zip, locate first `.gguf` entry → stream-extract to `models/<key>.gguf` → delete zip.
- Skip optimization: changed from `_verify_file` (size+hash) to `final_path.exists()` — we don't store gguf hashes in version.json, only zip hashes.
- Cleanup at start and in error paths now removes `.part`, `.zip`, and `.zip.part` files.
- Progress + cancel behavior preserved.

### `tests/unit/services/test_model_downloader_service.py`
- Added `_make_zip_bytes()` helper to wrap raw content in a real in-memory zip.
- Added `TestZipExtraction::test_downloads_zip_extracts_gguf_deletes_zip_no_part` — asserts extracted `.gguf` begins with `b'GGUF'`, no `.zip` or `.part` remains.
- Updated all existing download tests to wrap mock data in real zip archives and use zip SHA256/size in `version.json`.

### `version.json`
- `vlm_sha256` → `9facc171eb7b5cd58ef48c3c1e0814b9da911100ab9088757d1f1269d1e09925`
- `mmproj_sha256` → `d63a90a1f1594ce9ecc83f2e1894f9bd7b38605bb00daf59b2fdf7b1b42b0530`
- `vlm_size_bytes` → `772878446` (from `D:\Scan2Text\models\vlm.zip`)
- `mmproj_size_bytes` → `156370919` (from `D:\Scan2Text\models\mmproj.zip`)
- Download URLs unchanged (already point to `.zip`).

## Verification
- Targeted pytest: **17 passed, 0 failed**.
- `git status` shows only `model_downloader_service.py`, `test_model_downloader_service.py`, `version.json`.

## Context
FR-17 (§9 of 02-FR-NON-FR.md); diag-S27-DOWNLOAD-404.md.
