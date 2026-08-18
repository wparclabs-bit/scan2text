# S11-FIX52-PollingEndurance

## What Changed
- Frontend polling endurance implemented per CEO LOCKED L10
- `pollJob` now starts background endurance loop after initial poll
- Health check before each status poll; health unreachable marks job failed with translated `errors.backendLost`
- 60s re-poll interval while processing
- One-time long-doc hint toast after 5 min via `queue.longDocHint`
- `startPolling` simplified to direct `pollJob` call
- `pollJob` initial poll failure is non-fatal; background loop continues
- Tests updated for new behavior

## Key Decisions
- Backend timeout is single authority; frontend never times out on its own
- Health check is mandatory before each status poll
- Long-doc hint fires once per task after 5 min elapsed
- No backend changes; no toast changes from FIX49

## Test Coverage
- `scan2text.store.test.ts` 91 tests passed
- Updated pollJob re-throw tests to expect resolve
- Updated startPolling retry tests to check getTaskStatus calls
- Updated stale timeout test to use background loop
- Typecheck clean, build success

## Open Questions
- None
