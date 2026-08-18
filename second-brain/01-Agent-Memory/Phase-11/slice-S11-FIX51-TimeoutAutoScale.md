# S11-FIX51: TimeoutAutoScale

## What Changed
- Added `effective_ocr_timeout(base_seconds, int) -> int` pure helper in `src/scan2text/adapters/vlm_ocr.py`
- Formula: `max(base_seconds, pages * 30)` — short docs keep the 600s safety cap; long PDFs autoscale to hours
- Wired at enforcement site: `VlmOcrAdapter.ocr()` now passes `len(images)` as page count to the helper at `queue.get(timeout=...)`
- No new settings field; no frontend changes; no polling changes

## Key Decisions
- Helper lives in `vlm_ocr.py` alongside the enforcement site (co-located, minimal blast radius)
- `pages = len(images)` — for PDFs this equals rasterized page count; for single images equals 1
- `_PAGES_PER_SECOND = 30` constant; 30s/page is the budget (397-page book → 11910s)
- User's higher base value wins: `max(7200, 10*30) = 7200`

## Test Coverage
- `tests/test_timeout_autoscale.py` — 6 tests:
  - `test_short_doc_uses_base_cap` — effective_ocr_timeout(600, 1) == 600
  - `test_long_pdf_autoscales` — effective_ocr_timeout(600, 100) == 3000
  - `test_higher_user_value_wins` — effective_ocr_timeout(7200, 10) == 7200
  - `test_zero_pages_uses_base` — effective_ocr_timeout(600, 0) == 600
  - `test_exact_boundary` — effective_ocr_timeout(300, 10) == 300
  - `test_397_page_pdf_receives_autoscaled_timeout` — wiring: monkeypatched 397-page PDF + settings 600 → queue.get receives ≥11910s

## Open Questions
- None

## Backend Test Count
- 316 passed, 1 pre-existing failure (test_health_contract)
