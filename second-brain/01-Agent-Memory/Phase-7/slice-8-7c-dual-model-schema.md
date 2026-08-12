# Slice 8.7c — Dual-Model Schema Patch

Date: 2026-08-11
Phase: Phase 7
Status: COMPLETE

## What Changed

### Modified files
- `src/scan2text/services/model_downloader_service.py` — Refactored from single-file (`model_download_url`/`model_sha256`/`model_size_bytes`) to dual-file flat keys (`vlm_*` + `mmproj_*`). Downloads both files sequentially, aggregates progress bytes, verifies SHA256 for each; any failure sets overall status to `failed`.
- `tools/prep_dummy_gdrive.py` — Rewritten to emit a single valid JSON object with all keys (`app_*`, `vlm_*`, `mmproj_*`, `release_notes`) instead of two separate blocks. URLs use direct GDrive format (`uc?export=download&id=...`).
- `version.json` — Overwritten with new flat schema containing dummy placeholders for both model files.
- `tests/unit/services/test_model_downloader_service.py` — Updated all fixtures and tests for dual-file schema; added tests for missing VLM/MMPROJ URL cases and aggregated progress tracking.
- `tests/test_api_download.py` — Updated `_make_version_json` fixture to use new flat keys.

## Key Decisions

1. **Flat keys over nested objects**: `vlm_download_url`, `vlm_sha256`, `vlm_size_bytes`, `mmproj_download_url`, `mmproj_sha256`, `mmproj_size_bytes` — simple, explicit, easy to generate from the prep script.
2. **Sequential download**: VLM first, then MMPROJ. If VLM fails, MMPROJ is never attempted; overall status = `failed`.
3. **Aggregated progress**: `bytes_downloaded` tracks cumulative bytes across both files; `total_bytes` = sum of both declared sizes. Frontend progress bar remains accurate.
4. **GDrive direct URL format locked**: `https://drive.google.com/uc?export=download&id=<FILE_ID>` — no ZIP archives per ADR-006.
5. **Single JSON output from prep script**: Eliminates copy-paste errors; one valid block replaces two separate blocks.

## Test Coverage

| Test | File | Status |
|------|------|--------|
| `test_reads_version_json_and_sets_downloading_status` | test_model_downloader_service.py | PASS |
| `test_successful_download_creates_both_gguf_files` | test_model_downloader_service.py | PASS |
| `test_cancellation_deletes_part_files` | test_model_downloader_service.py | PASS |
| `test_hash_mismatch_deletes_part_and_sets_failed` | test_model_downloader_service.py | PASS |
| `test_missing_vlm_url_sets_failed` | test_model_downloader_service.py | PASS (new) |
| `test_missing_mmproj_url_sets_failed` | test_model_downloader_service.py | PASS (new) |
| `test_initial_state` | test_model_downloader_service.py | PASS |
| `test_state_updates_during_download` | test_model_downloader_service.py | PASS |
| `test_aggregated_progress_during_dual_download` | test_model_downloader_service.py | PASS (new) |
| All API integration tests | test_api_download.py | PASS |

**Total backend tests: 191 (was 188, +3)**

## Open Questions

- None. Live-fire download test ready for CEO manual GDrive upload.
