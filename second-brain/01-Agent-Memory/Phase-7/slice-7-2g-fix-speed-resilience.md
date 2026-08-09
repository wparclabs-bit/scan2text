# Slice 7.2g — OCR Speed + Worker Resilience Fix

**Date:** 2026-08-09  
**Commit:** (pending)  
**Baseline:** 3803457

## What Changed

### src/scan2text/adapters/vlm_ocr.py
- Added `_shrink_to_png()` helper: downscales images to max edge 1280px via PIL LANCZOS before sending to VLM worker. Reduces CPU vision-encoding time and keeps payloads within `n_ctx`.
- Added `_PDF_RENDER_SCALE = 1.5` (was hardcoded `2.0` inside `_render_pdf`).
- Added `OCR_FAILED` sentinel constant.
- Wrapped per-task OCR loop body in try/except so a single bad image returns an error dict instead of crashing the persistent worker (NFR-05).
- Changed default `max_tokens` from 4096 → 2048 in both task submission and worker call.
- `_render_pdf` now applies `_shrink_to_png` to each rendered page.
- Image path branch in `ocr()` now passes through `_shrink_to_png` instead of raw bytes.

### src/scan2text/models/settings.py
- `n_ctx`: 4096 → **8192** (fits larger downscaled images without truncation).
- `ocr_timeout_seconds`: 180 → **600** (5 min, accommodates slower CPU inference on large batches).

### tests/unit/test_settings_validation.py
- Updated assertions for new defaults: `n_ctx == 8192`, `ocr_timeout_seconds == 600`.

### tests/test_vlm_ocr.py
- Patched `_shrink_to_png` in two tests that use fake image bytes, preventing PIL `UnidentifiedImageError`.

## Key Decisions

1. **Resolution cap at 1280px edge**: Balances OCR quality vs CPU throughput. 1280px PNG is ~1-2 MB; well within `n_ctx=8192` token budget even with vision encoding overhead.
2. **Worker survives bad tasks (NFR-05)**: Per-task try/except ensures one corrupted image doesn't kill the persistent process. Error returned as dict to caller.
3. **Timeout raised to 600s**: 5 minutes covers worst-case multi-page PDFs on CPU. Previous 180s was too aggressive for large inputs.
4. **n_ctx raised to 8192**: Accommodates vision-encoded 1280px images plus prompt + output tokens without context truncation.
5. **max_tokens reduced to 2048**: Default output cap; prevents runaway generation on ambiguous inputs while still covering most single-page OCR jobs.

## Test Coverage

- `test_settings_validation.py`: engine defaults assertions updated and passing.
- `test_vlm_ocr.py::TestVlmOcrPersistentWorkerQueues`: queue reuse verified with `_shrink_to_png` patched.
- `test_vlm_ocr.py::TestVlmOcrTimeoutHandling`: timeout returns error dict, worker not killed.
- Full suite: **119 passed** (no failures).

## Open Questions

- Is 1280px edge sufficient for dense small-print PDFs? May need user-tunable cap in v2.
- Should `OCR_FAILED` error dicts be surfaced to the UI or silently retried?
- `_PDF_RENDER_SCALE` is now a module constant — consider moving to settings if users need control.
