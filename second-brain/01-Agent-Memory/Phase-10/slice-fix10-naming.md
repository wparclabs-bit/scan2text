# S10-FIX10: Backend Original Filename Stem

**Date:** 2026-08-15
**Slice:** S10-FIX10-Backend-Original-Filename
**Status:** COMPLETE

## What Changed

- `main.py:_save_uploaded_file` now returns `(Path, str)` — the UUID-named temp path and the sanitized original filename stem.
- `main.py:process_files` builds a `path_to_stem: Dict[Path, str]` mapping from saved UUID paths to original stems.
- `main.py:_run_processing` accepts `path_to_stem` and threads it through to `queue.process_image_paths`.
- `queue_service.py:process_image_paths` accepts optional `path_to_stem: Dict[Path, str] | None`; when provided, `resolve_output_path` receives the original stem instead of the UUID hex stem.
- Added `PathService` import to `main.py`.

## Key Decisions

- UUID stays as the on-disk temp name (no collision risk in uploads/).
- Original stem is sanitized via `PathService.sanitize_filename()` — removes invalid Windows chars, collapses whitespace to `_`, handles reserved names.
- Fallback: when `file.filename` is `None`, the UUID hex stem is used as `desired_stem`.
- `path_to_stem` is optional in `process_image_paths` — existing callers (non-API) are unaffected.

## Test Coverage

- `test_save_captures_original_stem` — asserts `_save_uploaded_file` returns sanitized stem `"strutur_qris"` for `"strutur qris.jpg"`.
- `test_save_fallback_to_uuid_stem_when_filename_none` — asserts UUID stem fallback when `filename=None`.
- `test_save_sanitizes_special_chars_in_stem` — asserts `"report<v2>.pdf"` → `"reportv2"`.
- `test_process_image_paths_uses_original_stem_from_mapping` — asserts output stem is `"strutur_qris_*"` when `path_to_stem` maps a UUID path.
- `test_process_image_paths_fallback_when_no_mapping` — asserts UUID stem fallback when no mapping provided.
- Existing tests updated: `test_run_processing_uses_asyncio_to_thread`, `test_run_processing_toggles_worker_busy` (signature change).

## Open Questions

None.

## Baseline

- Backend: 244 passed, 1 pre-existing failure (`test_health_contract` — dummy models on disk, model reports loaded=True).
- Frontend: 617 green, 0 failures.
- Typecheck: clean. Build: success.
