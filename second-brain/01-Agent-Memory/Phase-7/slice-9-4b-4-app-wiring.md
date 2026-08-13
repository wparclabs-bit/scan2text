# Slice 9.4b-4: App.tsx Wiring

## What Changed
- `src/App.tsx`: Imported `buildApiUrl` from `./lib/apiBase`; replaced 4 relative fetch URLs with `buildApiUrl()` calls:
  - `/api/settings` → `buildApiUrl('/api/settings')`
  - `/api/download/status?t=${Date.now()}` → `${buildApiUrl('/api/download/status')}?t=${Date.now()}` (cache-buster preserved)
  - `/api/download/start` (POST) → `buildApiUrl('/api/download/start')`
  - `/api/feedback/pending-count` → `buildApiUrl('/api/feedback/pending-count')`
- `src/App.test.tsx`: 4 RED tests added/confirmed for prod-mode URL construction; fixed mock implementations to stub all mount-time fetch calls so target calls actually fire; added `navigator.onLine: true` for feedback test.

## Key Decisions
- Strict TDD (CEO-approved Option A): tests existed from S9.4b-DIAG baseline; wired implementation to satisfy them.
- Cache-buster (`?t=`) preserved on `/api/download/status` — KILL-CACHE decision.
- Mock implementations stub all 3 mount-time fetch calls (settings, download/status, and target) so the effect chain completes and the asserted call fires.
- `navigator.onLine: true` required for feedback effect to run (App.tsx guards on `!navigator.onLine`).

## Test Coverage
- 4 new RED→GREEN tests in `App.test.tsx` `API URL construction via buildApiUrl` describe block:
  - `/api/settings` in dev mode
  - `/api/download/status` in prod mode
  - `/api/download/status` with `?t=` cache-buster in prod mode
  - `/api/download/start` (POST) in prod mode
  - `/api/feedback/pending-count` in prod mode
- Total frontend: 610 passed, 0 failures.

## Open Questions
- None. S9.4b (all 13 call sites across 6 files) is COMPLETE.
