# PDF Guardrail Forensics Diagnostic

## Verdict
GUARDRAIL_PRESENT

## Evidence
- The PDF inspection occurs in `vlm_ocr.py`'s `_render_pdf` method (`src/scan2text/adapters/vlm_ocr.py`, lines 284-320).
- Before rendering, it calls `check_page_limit` and `check_pdf_size` from `pdf_service.py` (`src/scan2text/services/pdf_service.py`).
- `check_page_limit` (lines 34-44) compares page count to `max_pages` (default 50, but read from live settings via `self._settings_service.load().max_pdf_pages`).
- `check_pdf_size` (lines 46-55) compares file size to `MAX_PDF_SIZE_BYTES` (20 MB).
- If either check fails, it returns a dict with `"error": "FILE_TOO_COMPLEX"` and an error message.
- The rendering of the PDF (using `pypdfium2.PdfDocument`) happens only after these checks, inside the `with pdfium.PdfDocument(str(path)) as pdf:` block (lines 312-320).
- Therefore, rejection occurs before rasterization or OCR processing.
- The existing targeted backend test `tests/test_pdf_guard_settings.py` verifies the guardrail works and passes (6 passed).

## Exact Guardrail Location
- Guard seam: `src/scan2text/services/pdf_service.py` functions `check_page_limit` and `check_pdf_size`.
- Adapter integration: `src/scan2text/adapters/vlm_ocr.py` method `_render_pdf` (lines 284-320).
- Error code: `FILE_TOO_COMPLEX` is returned in the error dict from `_render_pdf` and propagated up through the queue service to the task store.

## Next Recommended Step
Rebuild the backend PyInstaller artifact and redeploy to ensure the latest guardrail is used, as the baseline indicates the deployed backend artifact is stale (FIX56). After rebuilding, perform a smoke test with a PDF over 50 pages or over 20 MB to confirm immediate rejection with `FILE_TOO_COMPLEX` error.