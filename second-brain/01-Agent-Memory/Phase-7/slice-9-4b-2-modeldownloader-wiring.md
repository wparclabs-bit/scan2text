# Slice S9.4b-2 — ModelDownloaderModal Wiring

**Date:** 2026-08-13
**Phase:** 7 — Frontend API Wiring (S9.4b micro-slice b-2 of 4)

## What Changed
- `ModelDownloaderModal.tsx`: imported `buildApiUrl` from `@/lib/apiBase`; replaced 3 hardcoded/relative fetch URLs with `buildApiUrl()` calls:
  - `pollProgress`: `` `/api/download/progress?t=${Date.now()}` `` → `buildApiUrl(\`/api/download/progress?t=${Date.now()}\`)`
  - `handleCancel`: `'/api/download/cancel'` → `buildApiUrl('/api/download/cancel')`
  - `handleRestart`: `'/api/download/start'` → `buildApiUrl('/api/download/start')`
- `ModelDownloaderModal.test.tsx`: added 2 RED tests for PROD-mode URL verification (cancel + start).

## Key Decisions
- TDD enforced: 2 failing tests added first, then implementation, then GREEN.
- No changes to `api.ts`, `uploadService.ts`, or `App.tsx` (reserved for b-3/b-4).
- `buildApiUrl` not modified (slice scope).

## Test Coverage
- ModelDownloaderModal: 10 passed (was 7 passed + 1 failed).
- Full frontend suite: 601 passed, 5 failures remaining (api.test.ts ×3, uploadService.test.ts ×2).

## Open Questions
- None.
