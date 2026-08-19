# S11-FIX72-HEALTH-RETRY-RESILIENCE

**Phase:** 11
**Date:** 2026-08-20
**Status:** COMPLETE

## Problem
FIX71 (12617c5) added `promoteNextPending()` after health-check failure but the background loop still marks a job `failed` on a SINGLE thrown `getHealth()`. CEO retest: `biaya.jpg` showed red + translated `errors.backendLost` toast while backend completed and wrote the output file. Machine at 94% RAM during OCR caused transient health probe misses.

## Root Cause
Background loop (store.ts ~506-525): `await getHealth()` with no retry. Any single rejection (network spike, GC pause, RAM pressure) → immediate `set({ status: 'failed' })` + toast + `promoteNextPending()`.

## Fix
Added `consecutiveHealthFailures: number` (default `0`) to `ScanJob`. Background loop now:
- **On health OK:** resets counter to 0
- **On health rejection:** increments counter; only fails job at threshold ≥ 3
- Resets counter to 0 on any successful probe

## Files Changed
- `frontend/src/stores/scan2text.store.ts` — added `consecutiveHealthFailures` field, threshold-3 health logic, refactored `startUpload` inline job creation to use `createDefaultJob()`
- `frontend/src/stores/scan2text.store.test.ts` — 3 new/modified tests in `background health check failure` describe
- `frontend/src/components/layout/panels/QueuePanel.integration.test.tsx` — added `consecutiveHealthFailures: 0` to all test job fixtures

## TDD Results
- **RED:** 2 new tests failed (job stayed background after 1 rejection; 3-rejection → failed + toast + promotion)
- **GREEN:** 97/97 tests passing (all store tests)
- **Typecheck:** zero errors

## Test Cases
1. **ONE rejection → job stays background:** Single `getHealth()` rejection during background loop does NOT mark job `failed`; job remains `processing`; no `toast.error`
2. **3 consecutive rejections → fail + toast + promote:** Three consecutive `getHealth()` rejections mark job `failed` with `errors.backendLost`, fire toast, and call `promoteNextPending()`
3. **Legacy toast test:** Toast fires after 3 consecutive rejections (previously fired after 1)

## Notes
- `getHealth()` uses raw `fetch()` with default browser timeout (~30s). NOT changed this slice.
- Counter is per-job, stored in `ScanJob.consecutiveHealthFailures`
- `QueuePanel.integration.test.tsx` required `consecutiveHealthFailures: 0` on all test fixtures (typecheck compliance)
- Full test suite deferred to GATE slice
