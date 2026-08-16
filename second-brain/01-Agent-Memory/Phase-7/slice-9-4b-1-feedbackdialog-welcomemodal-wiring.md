# Slice S9.4b-1: FeedbackDialog + WelcomeModal buildApiUrl Wiring

## What Changed
Forensics confirmed both `FeedbackDialog.tsx` and `WelcomeModal.tsx` were already wired with `buildApiUrl()` from their original commits:
- `FeedbackDialog.tsx` (commit 8156378): imports `buildApiUrl` from `@/lib/apiBase`, calls `fetch(buildApiUrl('/api/feedback'), ...)` on submit.
- `WelcomeModal.tsx` (commit 195d2e5): imports `buildApiUrl` from `@/lib/apiBase`, calls `fetch(buildApiUrl('/api/settings'))` on mount (GET) and on checkbox toggle (PUT).

No source changes were made. Both files had prod-mode tests already asserting against `buildApiUrl()` outputs.

## Key Decisions
- No code changes required — the slice premise ("0 production call sites wired yet") was based on stale discovery data. Both call sites were wired at component creation time.
- 6 pre-existing test failures remain in b-2/b-3/b-4 target files (api.test.ts ×3, uploadService.test.ts ×2, ModelDownloaderModal.test.tsx ×1). These are out of scope for this slice.

## Test Coverage
- FeedbackDialog.test.tsx: 7 tests, all passing (incl. "uses buildApiUrl in prod mode")
- WelcomeModal.test.tsx: 7 tests, all passing (incl. "uses buildApiUrl for /api/settings in prod mode")
- Total frontend baseline: 598 passed, 6 pre-existing failures

## Open Questions
- None for this slice. b-2/b-3/b-4 (ModelDownloaderModal, api.ts, uploadService.ts) remain to be wired in subsequent slices.
