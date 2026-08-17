# S11-FIX44: VlmOcr-Pdfium-Import Fix

**Date:** 2026-08-18
**Status:** COMPLETE

## What Changed
- Restored `import pypdfium2 as pdfium` to `src/scan2text/adapters/vlm_ocr.py` import block (after `import psutil`).
- Added regression test `tests/test_vlm_ocr_pdfium_import.py` asserting `hasattr(vlm_ocr, "pdfium")`.

## Key Decisions
- Bare-name usage at line 275 (`pdfium.PdfDocument()`) requires a direct module import; keeping `pdf_service.py`'s own import untouched (it uses its own binding).
- TDD red-first: test failed before fix, passed after.

## Test Coverage
- `tests/test_vlm_ocr_pdfium_import.py::test_vlm_ocr_has_pdfium_attribute` — RED → GREEN.
- Full backend: 284 passed, 1 pre-existing failure (`test_health_contract`).

## Open Questions
- None.
