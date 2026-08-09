# Slice 7.2d — /api/health Real Contract

## What Changed
- Rewrote `src/scan2text/routes/health.py` from stub to real contract.
- Added `tests/test_health.py` with 3 tests covering contract, worker flag, and model file detection.

## Key Decisions
- `/api/health` now returns `status`, `worker`, `ram`, `model`, and `version`.
- Model resolution uses `PathService` + `SettingsService` (app-root relative paths per ADR-005), not hardcoded paths.
- `worker` state reads `request.app.state.worker_busy`; defaults to `"idle"`.
- RAM reported via `psutil.virtual_memory()` as `{total_mb, used_mb, percent}`.
- `model.loaded` is always `False` at this stage (engine not loaded in health path).
- No changes to `api/main.py`, `engine.py`, or frontend (reserved for 7.2e merge).

## Test Coverage
- `test_health_contract`: full shape validation (status, worker enum, version string, ram bounds, model fields).
- `test_health_worker_busy_flag`: toggles `app.state.worker_busy` and asserts response.
- `test_health_model_files_found`: creates temp models dir with both gguf files, sets `SCAN2TEXT_HOME`, asserts `files_present=True`.

## Open Questions
- None. Ready for 7.2e merge where frontend consumes the new contract.
