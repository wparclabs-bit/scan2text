# Slice S11-FIX54: TwoMinHint-Repeating-Green

## What Changed
- **Store** (`scan2text.store.ts`): Changed long-doc hint from one-time 5-min toast to repeating 2-min toast. Variable `longDocHintFired` (boolean) replaced with `lastlongDocHintAt` (timestamp). Interval check: `elapsed - lastlongDocHintAt >= 2 * 60 * 1000`.
- **API** (`lib/api.ts`): Added missing `getHealth()` export — was imported in store but never defined.
- **Tests** (`scan2text.store.test.ts`): Fixed dangling test — moved inside main `describe('scan2text store')` block, added `toast`/`i18n` imports, used outer `store` instance instead of creating a new one. Added `beforeEach`/`afterEach` timer management.

## Key Decisions
- CEO decision 2026-08-18 overrides S11-FIX52's one-time 5-min hint: repeating 2-min toast is the locked behavior.
- `getHealth()` added to `api.ts` as a simple `/health` fetch with error throwing — matches store usage pattern.
- Test uses fake timers (`vi.useFakeTimers`) with `advanceTimersByTimeAsync` to verify toast firing at 2min, 4min, 6min intervals.

## Test Coverage
- New test: `should fire long-doc hint every 2 minutes while processing` — asserts toast.info called at 2min (1x), 3min (still 1x), 4min (2x), 6min (3x).
- Frontend total: 637 passed, 0 failures (was 636 before fix).

## Open Questions
- None.
