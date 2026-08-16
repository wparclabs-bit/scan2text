# S10-FIX11b: Green PollJob

## What Changed
- \src/stores/scan2text.store.ts\: pollJob catch re-throws all errors (was setting 'failed' for non-timeout); startPolling pre-poll guard skips only 'completed'; startPolling catch handles ALL errors with retry logic
- \src/stores/scan2text.store.test.ts\: updated 2 pollJob rejection tests to expect re-thrown errors; fixed circular mock in stale timeout test via vi.importActual

## Key Decisions
- Transient network errors keep job as 'processing' — no irreversible failed state from pollJob
- 'failed' only on backend terminal status or background exhaustion (max retries)
- startPolling retry fires for ALL errors, not just timeout/max-attempts

## Test Coverage
- Frontend: 85 passed, 0 failures (was 83 passed, 2 failed)

## Open Questions
- None

## Status
COMPLETE
