# Slice 7.2g-fix2 — Raise Vision Resolution for Table Accuracy

## What Changed
- `src/scan2text/adapters/vlm_ocr.py`: `_MAX_IMAGE_EDGE` raised from 1280 → 2048; `_PDF_RENDER_SCALE` raised from 1.5 → 2.0.
- No other logic changes. Two-constant tuning only.

## Key Decisions
- **Accuracy-over-speed per NFR-03 / NFR-04**: larger vision input preserves table structure and fine text that 1280px edge was downsampling away.
- **No n_ctx change**: the worker already receives `n_ctx` from settings; higher-res images consume more context slots, so operators should ensure `n_ctx` is sized accordingly (out of scope for this slice).
- **Heartbeat slice queued** to make wait visibility explicit alongside this accuracy win.

## Test Coverage
- Root pytest: 119 passed (no regressions).
- Existing vlm_ocr unit tests continue to pass; no new tests added because constants are runtime tunables exercised by integration paths, not unit-testable without a live model.

## Open Questions
- At 2048px edge + scale 2.0, memory/CPU footprint on the worker process increases. Monitor on typical hardware; tune `n_ctx` if OOM or context overflow appears.
- PDF render scale 2.0 on multi-page documents raises per-page PNG size; `_max_pdf_pages` cap remains the guardrail.
