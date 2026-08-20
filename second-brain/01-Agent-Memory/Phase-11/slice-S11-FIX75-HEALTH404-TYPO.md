# S11-FIX75-HEALTH404-TYPO

## Status
COMPLETE

## Date
2026-08-20

## Root Cause
`frontend/src/lib/api.ts:116` called `fetch(buildApiUrl('/health'))` — missing `/api/` prefix. Backend only serves `/api/health` (PRD-03 §14 + ADR-005).

## Impact
Background re-poll loop (`store.ts:507`) calls `getHealth()` every 60s. Each 404 incremented `consecutiveHealthFailures`. After 3 failures (FIX72 threshold), long-running PDF jobs were falsely marked as failed with `errors.backendLost` toast, while the backend actually completed and wrote .md files.

## Fix
- `api.ts:116`: `buildApiUrl('/health')` → `buildApiUrl('/api/health')` (one-line edit)
- `api.test.ts`: Added `getHealth()` describe block with 2 tests asserting canonical `/api/health` path via mocked fetch

## Test Gap Closure
All prior tests mocked `getHealth()` entirely or never exercised the URL path. The new test explicitly asserts `fetch` was called with `buildApiUrl('/api/health')`, which went RED before the fix and GREEN after — proving the gap existed and is now closed.

## TDD Loop
- **RED**: Test asserted `/api/health`, code called `/health`. Expected: `/api/health`, Received: `/health`.
- **GREEN**: After one-line edit, all 27 tests in `api.test.ts` passed.

## Verification
- `npm run test -- src/lib/api.test.ts`: 27/27 passed
- `npm run typecheck`: zero errors
- Full suite deferred to GATE slice per AGENTS.md Phase 7 clarification
- Frontend baseline: 647 passed, 0 failures (unchanged)

## Files Changed
- `frontend/src/lib/api.ts` — 1 line edit (typo fix)
- `frontend/src/lib/api.test.ts` — +29 lines (new `getHealth()` test block)

## Commit
`93600c5` — FIX75: fix health URL typo /health -> /api/health + add test gap closure

## Related Slices
- S11-DIAG-HEALTH404-BACKGROUND-REPOLL (diagnosis)
- S11-FIX72-HEALTH-RETRY-RESILIENCE (threshold logic)
- S11-FIX71-QUEUE-PUMP-PROMOTE (queue recovery on health failure)
