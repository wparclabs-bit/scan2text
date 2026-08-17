# Slice: S11-FIX36-NoText-Guard

## What Changed
- Added `has_no_text(text: str) -> bool` pure function in `src/scan2text/services/output_service.py`
- Added `OutputService._has_raw_text(ocr_result)` static method to check raw page texts before rendering
- Wired guard into `OutputService.write()`: when raw OCR text has no alphabet letters, saved `.md` content becomes `"No text detected / Tidak ada teks terdeteksi\n"`
- Job status stays `DONE` (green dot) — no status contract change
- Zero frontend changes

## Key Decisions
- Detection on **raw page texts** (not rendered markdown) to avoid false negatives from `--- Page N ---` headers containing "Page"
- Bilingual notice line avoids UI-language resolution in backend
- Guard is L3 (backend service) per CEO locked decision — saved file must not ship garbage

## Test Coverage
- 9 new tests in `tests/test_no_text_guard.py`:
  - 6 pure detector tests: empty, whitespace, digits-only, mixed text+digits, single letter, punctuation-only
  - 3 integration tests: digits-only writes notice, real text unchanged, empty OCR writes notice
- Backend: 275 passed, 1 pre-existing failure (test_health_contract)
- Frontend: 629 passed, 0 failures (unchanged)
- Typecheck: clean
- Build: success

## Open Questions
- None

## Files Changed
- `src/scan2text/services/output_service.py` — added `has_no_text()`, `_has_raw_text()`, guard wire
- `tests/test_no_text_guard.py` — new test file (9 tests)
