# Slice: Fix-Backend-Startup-Resilience

Date: 2026-08-12
Phase: Phase 7
Baseline: 195 backend tests green

## What Changed

**Problem:** Backend crashed on startup when `models/vlm.gguf` or `models/mmproj.gguf` was missing, preventing the frontend downloader modal from ever appearing.

**Fix:** Made `VlmOcrAdapter` fail gracefully when model files are absent.

### Files modified

- `src/scan2text/adapters/vlm_ocr.py` — Added `_check_model_files()` + `loaded` property; skip worker spawn when files missing; `ocr()` returns `MODEL_NOT_FOUND` error dict when unloaded
- `src/scan2text/routes/health.py` — Added `_get_adapter_state(request)` helper that reads `adapter.loaded` from app state; falls back to disk check when adapter unavailable
- `tests/test_vlm_ocr.py` — Added 3 new tests in `TestVlmOcrMissingModelFiles`; updated 5 existing tests to provide both `model_path` and `mmproj_path` pointing to existing temp files
- `tests/test_health.py` — Added 2 tests for adapter-loaded state via monkeypatch

### Key decisions

1. **Pre-check over post-catch:** Instead of letting the worker process crash and recover, we check file existence in `__init__` before spawning. This is cheaper (no fork+exec) and gives the adapter a clean `loaded=False` signal.
2. **`loaded` property on adapter:** Health endpoint uses the authoritative adapter state rather than re-checking disk independently. Falls back to disk check when the adapter isn't wired into app.state yet (e.g., standalone health router tests).
3. **`ocr()` short-circuit:** When unloaded, `ocr()` returns an error dict immediately instead of hitting empty queues. Error code is `MODEL_NOT_FOUND` (consistent with existing constant).
4. **Existing test compatibility:** Several existing tests only set `model_path` without `mmproj_path`, causing the new pre-check to fail. Updated them to create both dummy files in tmp_scan2text.

## Test Coverage

- `test_loaded_is_false_when_model_file_missing` — adapter.loaded=False, Process.start not called
- `test_loaded_is_true_when_both_model_files_exist` — adapter.loaded=True, Process.start called once
- `test_worker_not_spawned_when_mmproj_missing` — partial missing files also blocks spawn
- `test_ocr_returns_model_not_found_when_files_missing` — ocr() returns error dict
- `test_health_when_adapter_not_loaded` — health returns loaded=False via adapter state
- `test_health_when_adapter_is_loaded` — health returns loaded=True via adapter state

## Verification

- `py -3.12 -m pytest -q` → 197 passed (was 195)
- Deleted `models/` folder, ran `uvicorn scan2text.api.main:app` → started successfully, no crash
- `GET /api/health` → `{"model":{"loaded":false,"files_present":false},...}`
- `GET /api/download/status` → `{"status":"idle",...}`
- `npm run typecheck` → PASS
- `npm run build` → PASS

## Open Questions

None. The frontend downloader modal already polls `/api/download/status` on mount; with the server now starting regardless of model presence, the modal will trigger correctly on first launch.
