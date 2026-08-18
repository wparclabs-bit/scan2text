# Slice S11-FIX59-Align-Error-Codes-BlackDot-20MB

## Summary
Aligned backend error code PDF_TOO_MANY_PAGES → FILE_TOO_COMPLEX, lowered global file size limit to 20 MB, implemented Black Dot UI for non-retryable rejections, and verified with typecheck and tests.

## Changes
- Backend: `src/scan2text/models/errors.py` ErrorCode enum renamed; `src/scan2text/adapters/vlm_ocr.py` returns FILE_TOO_COMPLEX; tests updated.
- Frontend: `src/lib/fileValidation.ts` MAX_FILE_SIZE = 20 MB; validation message updated.
- Locales: `src/locales/en.json` / `id.json` dropzone hint “max 20MB per file”, errors.fileTooLarge updated, errors.fileTooComplexRejected added.
- Store: `src/stores/scan2text.store.ts` ScanJob.errorCode added, stored on failure.
- UI: `src/components/layout/panels/QueuePanel.tsx` Black/Dark Grey dot #3F3F46 for FILE_TOO_COMPLEX, tooltip, retry hidden.
- Tests: fileValidation.test.ts and resources.test.ts updated to 20 MB.

## Verification
- `npm run typecheck` clean
- `npm run test` 637 passed
- Select-String backend for PDF_TOO_MANY_PAGES → 0 matches
- Select-String locales for 50MB → 0 matches

## Status
COMPLETE — READY FOR CEO MANUAL VERIFICATION
