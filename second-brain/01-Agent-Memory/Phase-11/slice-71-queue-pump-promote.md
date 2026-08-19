# S11-FIX71 — Queue Pump Promote Fix

**Date:** 2026-08-20  
**Phase:** 11  
**Status:** COMPLETE

## Problem

The frontend queue stalls when:
1. **Background health check fails** (`store.ts:506-525`): After marking a job `failed` due to backend connection loss, `activeJobId` stays on the failed job and `promoteNextPending()` is never called. Pending jobs remain stuck in grey.
2. **Initial taskId is missing** (`store.ts:418-424`): `pollJob` called on a job with no `taskId` sets status to `failed` but returns without calling `startNextPendingJob()`.

## Root Cause

Both code paths used bare `set()` to mark the job `failed` then returned, without invoking the queue promotion methods. Other failure paths (e.g., upload failure at line 401, task failure at line 477, health check failure in main poll at line 571) already called `promoteNextPending()` correctly — these two were the missing ones.

## Fix

### store.ts line 508-525 (health check failure)
Added `get().promoteNextPending()` after the toast notification:
```typescript
toast.error(i18n.t('errors.backendLost'))
get().promoteNextPending()  // NEW
return
```

### store.ts line 418-424 (missing taskId)
Added `get().startNextPendingJob()` after the set:
```typescript
get().startNextPendingJob()  // NEW
return
```

### i18n (en.json + id.json)
Added `errors.backendLost` key:
- EN: "Backend connection lost"
- ID: "Koneksi backend terputus"

## TDD Evidence

- **RED:** New test "should promote next pending job when background health check fails" failed — `activeJobId` stayed on `job-1` instead of promoting to `job-2`.
- **GREEN:** After fix, all 96 tests pass (94 existing + 2 new).

## Files Modified

- `frontend/src/stores/scan2text.store.ts` — 2 lines added (promote calls)
- `frontend/src/stores/scan2text.store.test.ts` — 43 lines added (2 new tests)
- `frontend/src/locales/en.json` — 1 key added
- `frontend/src/locales/id.json` — 1 key added

## Verification

- Targeted tests: 96/96 passed
- TypeScript typecheck: zero errors
- No other source files modified
