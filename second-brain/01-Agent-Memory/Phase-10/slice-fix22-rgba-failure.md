# S10-FIX22 — RGBA-Safe-Images-And-Failed-Propagation

**Date:** 2026-08-16
**Phase:** 10
**Commit:** 529a7d6
**Hash:** D9E3F07D

## What Changed

### Bug 1: RGBA/LA/P PNG and WEBP inputs crashed
- **File:** `src/scan2text/services/postprocess_service.py` line 309
- **Root cause:** `crop.save(out_path, format="JPEG")` called on RGBA/LA/P crops raised `OSError: cannot write mode X as JPEG`
- **Fix:** Added `if crop.mode != "RGB": crop = crop.convert("RGB")` before JPEG save
- **Scope:** Affects all PNG/WEBP inputs with alpha or palette modes that contain `<img>` bbox tags in OCR output

### Bug 2: Task store never wrote error_code on failure
- **File:** `src/scan2text/api/main.py`
- **Root cause:** `_run_processing` always set `status="completed"` on normal return from `process_image_paths`, even when some jobs failed. `GET /status` never returned `error_code`.
- **Fix:** 
  - After `process_image_paths` returns, check `summary.failed > 0` → set `status="failed"` + `error_code="OCR_FAILED"`
  - On exception path, also set `error_code="UNKNOWN_ERROR"`
  - `GET /status` now includes `error_code` field when present

## Key Decisions
- Convert-to-RGB guard is minimal: only runs when mode != RGB, zero overhead for already-RGB images
- error_code uses existing `ErrorCode` enum values for machine-readability (FR-11)
- Task store failure propagation ensures frontend sees red dot + can promote next job

## Test Coverage
- `test_rgba_png_crop_saves_as_rgb_jpeg` — RGBA source → RGB JPEG crop, no crash
- `test_la_png_crop_saves_as_rgb_jpeg` — LA source → RGB JPEG crop, no crash
- `test_p_mode_png_crop_saves_as_rgb_jpeg` — P (palette) source → RGB JPEG crop, no crash
- `test_status_returns_failed_after_ocr_exception` — exception in processing → task store status=failed + error_code
- `test_status_includes_error_code_field` — GET /status returns error_code for failed tasks
- `test_status_returns_failed_when_job_fails` — baseline status endpoint behavior

## Open Questions
- None. Ready for CEO manual verification (upload RGBA PNG, trigger failure, confirm red dot + queue promotion).

## Baseline
- Backend: 259 passed, 1 pre-existing failure (test_health_contract)
- Hash: D9E3F07D ≠ stale 9E4BAB70 (three-way match: packaging = repo dist = portable)
