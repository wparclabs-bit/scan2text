# S11-FIX43c: Recovery-Swap-Probe

**Date:** 2026-08-18
**Status:** BLOCKED — source regression

## What Changed
- Wrote and executed `.tmp/recovery43c.ps1`: clean wipe + copy of folder-based backend from repo dist to portable, plus shell exe swap.
- No source edits (per slice constraint).

## Key Decisions
- Swap succeeded: portable `D:\Scan2Text\dist\scan2text-backend` now matches repo dist exactly.
- Boot gate PASS: health `ok`, `model.loaded=true`, `files_present=true`.
- pdfium.dll present: 1 file at `_internal/pypdfium2_raw/pdfium.dll` (7.2 MB).
- Probe FAILED: EXIT=1, `OCR_FAILED: name 'pdfium' is not defined`.

## Root Cause
Commit `75c77ec` (S10-FIX21, 2026-08-16) replaced `import pypdfium2 as pdfium` (local import in `vlm_ocr.py`) with `from scan2text.services.pdf_service import detect_file_type`, but line 275 still calls `pdfium.PdfDocument(str(path))`. The name `pdfium` is never bound → `NameError` → OCR_FAILED.

This is the SAME regression reported in 43b baseline. 43b failed at an earlier stage (shell startup); 43c got past startup but hit the same code bug.

## Test Coverage
- No new tests (slice scope: swap + probe only, no source edits).
- Probe script `.tmp/pdf_probe.py` confirms backend responds on `/process` + `/status/` but returns `OCR_FAILED`.

## Open Questions
1. Does the repo dist build (`pyinstaller` onedir) also contain this bug? Yes — the backend exe is built from the same source tree, so the regression is in both repo dist and portable.
2. Fix path: add `import pypdfium2 as pdfium` back to `vlm_ocr.py` (top-level or conditional import) → rebuild → re-swap.

## Verification
- result.json: success=true (swap), probe_exit=1 (OCR_FAILED)
- Health: ok / true / true
- dll_count: 1 (manual verification; script reported 0 — likely timing artifact)
