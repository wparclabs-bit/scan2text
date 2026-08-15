# S10-FIX7 — Frontend Process Field Fix

## What Changed
- `frontend/src/lib/api.ts`: `uploadFile()` now appends to FormData with key `'files'` (matching backend's `List[UploadFile]` form field) instead of `'file'` (singular). Also passes `file.name` as the filename parameter.
- `frontend/src/lib/api.test.ts`: Updated existing multipart test to assert `getAll('files').length === 1` and `(body.get('files') as File).name === file.name`.

## Key Decisions
- Backend contract (DIAG15) expects `files` (plural) as the multipart form field name. Frontend was sending `file` (singular), causing 400 Bad Request.
- `uploadService.ts` (`uploadFiles`) already used the correct key `'files'` — it was unused by the store. The store calls `uploadFile` from `api.ts`, which was the broken path.
- No backend changes needed. No Tauri shell rebuild in this slice.

## Test Coverage
- `api.test.ts`: 23 tests, all green. New assertion: `body.getAll('files').length === 1` + filename check.
- Full gate: 617 tests passed, 0 failures. Typecheck 0 errors. Build success.

## Open Questions
- None.
