# Slice 20.1-final Summary

## What Changed
- `frontend/src/stores/scan2text.store.test.ts`: Replaced the body of `should start next pending job when active job fails` test.
- Old logic: set `mockUploadFile.mockRejectedValue` before first upload, causing job-1 to fail immediately and activate job-2 before job-2's upload even started — making the assertion `activeJobId === 'job-1'` after starting job-2 impossible.
- New logic: mirrors the adjacent "completes" test — both uploads resolve successfully, then `setStatus('job-1', 'failed')` is called manually to trigger FIFO promotion of job-2.

## Key Decisions
- Minimal fix: only changed the failing test body; no other code touched.
- Pattern consistency: the corrected test now matches the "completes" test structure exactly, differing only in the status transition (`completed` vs `failed`).

## Test Coverage
- All 86 store tests pass.
- TypeScript typecheck passes.
- Frontend build succeeds.

## Open Questions
- None.
