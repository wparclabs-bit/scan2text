# Slice 7.2g-fix3 — Raise Generation Budget for Wide Tables

## What Changed
- `src/scan2text/adapters/vlm_ocr.py:118` default `max_tokens` 2048 → 4096 (worker path)
- `src/scan2text/adapters/vlm_ocr.py:179` per-task `max_tokens` 2048 → 4096 (caller path)

## Key Decisions
- Only these two constants changed; `_MAX_IMAGE_EDGE = 2048` left untouched (baseline gate confirmed).
- n_ctx remains 8192 — sharp images + 12-col tables need ~4k output tokens, still fits comfortably.
- No backend contract or frontend changes; this is a pure VLM adapter tuning.

## Test Coverage
- Root pytest: 119 passed (no regression).
- Existing VLM OCR tests continue to pass; no new tests added (slice scope: constant tuning only).

## Open Questions
- None. Slice complete.
