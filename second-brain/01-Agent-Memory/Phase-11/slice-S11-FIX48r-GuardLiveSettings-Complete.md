# S11-FIX48r: Guard Reads Live Settings + Noise Filter Recovered

**Date:** 2026-08-18
**Phase:** 11
**Status:** COMPLETE

## What Changed

### Source (2 files)
- **`src/scan2text/adapters/vlm_ocr.py`**
  - Guard in `_render_pdf` now calls `self._settings_service.load()` at call time instead of using `self._max_pdf_pages` cached at `__init__` time. This fixes Wall-1: user-raised `max_pdf_pages` (FIX33) now takes effect without restart.
  - Added `filter_noise_lines` import from `postprocess_service`.
  - Applied noise filter in post-processing chain: `convert_html_tables_to_gfm → filter_noise_lines → extract_chart_crops`.
- **`src/scan2text/services/postprocess_service.py`**
  - Recovered `filter_noise_lines()` function (+45 lines) — drops maximal runs of ≥4 consecutive bare-integer lines with consecutive values (e.g. page-number lists "1\n2\n3\n…\n16"). Short runs, non-consecutive numbers, and non-integer lines are preserved.

### Tests (2 files, relocated to flat `tests/`)
- **`tests/test_pdf_guard_settings.py`** — 6 tests. Direct seam tests for `check_page_limit` + adapter-level live-settings seam test (`test_guard_reads_live_settings_not_stale_cache`).
- **`tests/test_noise_filter.py`** — 15 tests. Covers consecutive-run dropping, threshold boundary (3 kept / 4 dropped), mixed input, whitespace, negatives, floats.

### Test layout normalization
- Moved `tests/unit/services/test_pdf_guard_settings.py` → `tests/test_pdf_guard_settings.py`
- Moved `tests/unit/services/test_noise_filter.py` → `tests/test_noise_filter.py`
- Repo convention is flat `tests/` folder.

## Key Decisions

1. **Wall-1 root cause:** `_render_pdf` used `self._max_pdf_pages` (cached at `__init__`). Fixed by calling `self._settings_service.load()` fresh at guard time. No other architectural change needed — the partial guard from the dead FIX48 session was already correct in placing the live-read call.
2. **Test mock fix:** The adapter-level test's `with pdfium.PdfDocument(...) as pdf:` bound `pdf` to `mock_pdf_doc.__enter__()` which returns a *new* MagicMock (not `mock_pdf_doc`), so `len(pdf)` returned 0. Fixed by explicitly setting `__enter__`/`__exit__` on the mock.
3. **Noise filter integration point:** Applied in the post-processing chain after GFM table conversion, before crop extraction — same pipeline stage where the dead FIX48 session had placed it.

## Test Coverage

- Target tests: 21 passed (6 guard + 15 noise filter)
- Full suite: 310 passed, 1 pre-existing failure (`test_health_contract`)
- No new failures introduced.

## Open Questions

- None. Wall-1 is confirmed fixed. Noise filter is green.

## Verdict

**Wall-1 confirmed and fixed.** `max_pdf_pages` user-raisable now actually takes effect without restart. Noise filter recovered from dead session and fully green.
