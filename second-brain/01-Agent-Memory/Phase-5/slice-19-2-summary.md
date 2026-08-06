# Slice 19.2 Summary — Queue Progression Behavior

**Date:** 2026-08-06  
**Status:** COMPLETE  
**Next:** Slice 19.3 (Preview panel and job management)

---

## What Changed

### Store (`frontend/src/stores/scan2text.store.ts`)
- Added `progress: number` field to `ScanJob` interface (0–100)
- Added `selectedJobId: string | null` to state with `setSelectedJobId` action
- Added status transition validation in `setStatus`: terminal states (`completed`, `failed`) reject all outgoing transitions
- Fake progress: when status → `processing`, starts a 30s interval that ramps 0→90%; on `completed` jumps to 100%; on `failed` stops
- Auto-select: completed jobs automatically become `selectedJobId`
- Added `startPolling` action: calls `pollJob`, retries on timeout every 60s, max 10 retries before marking failed
- `startUpload` now calls `startPolling` after successful upload
- `reset` cleans up all active progress timers
- `removeJob` cleans up progress timer and clears selection if removed job was selected

### New Module (`frontend/src/lib/progressManager.ts`)
- `startProgress(jobId, onUpdate)`: starts interval-based fake progress (0→90% over 30s)
- `stopProgress(jobId)`: clears the interval for a job
- `setProgress(jobId, _progress)`: stops timer (used internally)
- Uses `globalThis.setInterval`/`clearInterval` for testability with `vi.useFakeTimers()`

### QueuePanel (`frontend/src/components/layout/panels/QueuePanel.tsx`)
- Shows progress bar + percentage text during `processing` status
- Highlights selected job with `border-primary`
- Color-coded status badges: green (completed), red (failed), blue (processing), gray (others)
- New test IDs: `queue-item-progress`, `queue-item-progress-text`

---

## Files Created
- `frontend/src/lib/progressManager.ts`
- `frontend/src/lib/progressManager.test.ts`

## Files Modified
- `frontend/src/stores/scan2text.store.ts`
- `frontend/src/stores/scan2text.store.test.ts`
- `frontend/src/components/layout/panels/QueuePanel.tsx`
- `frontend/src/components/layout/panels/QueuePanel.test.tsx`
- `second-brain/00-Current-State.md`

---

## Tests Added (29 new tests)

### Status state machine (5)
- valid transition uploading → processing
- valid transition processing → completed
- valid transition processing → failed
- invalid transition completed → processing is rejected
- invalid transition failed → completed is rejected

### Fake progress (5)
- progress starts at 0 when job enters processing
- progress increments over time during processing
- progress does not exceed 90 before completion
- progress jumps to 100 on completed
- progress stops on failed

### Auto-select (4)
- completed job becomes selected
- failed job does not become selected
- most recent completed job overrides previous selection
- selectedJobId is stored in Zustand state as null initially

### Polling (5)
- polling starts after upload succeeds
- poll success with completed status updates job
- poll success with failed status updates job
- poll timeout triggers retry after 60s
- max 10 retries before marking error
- polling stops when job completes
- polling stops when job errors

### Timer cleanup (3)
- no active intervals after job completes
- no active intervals after job errors
- no active intervals after store reset

### QueuePanel UI (4)
- progress bar/percentage visible during processing
- completed status label shows "Completed"
- failed status label shows "Failed"
- selected job has border-primary class

### progressManager (3)
- calls onUpdate with increasing progress
- stops calling onUpdate after stopProgress
- allows restarting timer for same job

---

## Gotchas

### Timing and Fake Timers
- Progress manager uses `globalThis.setInterval` so vitest's `vi.useFakeTimers()` intercepts it correctly.
- Store's `startPolling` uses `globalThis.setTimeout` for the 60s retry delay — also intercepted by fake timers.
- All progress/polling tests use `vi.useFakeTimers()` / `vi.useRealTimers()` in beforeEach/afterEach.
- `createStore()` now resets `selectedJobId: null` to prevent state leakage between tests.

### Polling Timeout Handling
- `pollJob` re-throws timeout errors (`'timeout'` or `'max attempts'` in message) so `startPolling` can handle retries.
- Non-timeout errors in `pollJob` still mark the job as failed immediately (backward compatible).
- Existing `pollJob` tests continue to pass without modification.

### Status Transition Validation
- Only terminal states (`completed`, `failed`) are blocked from further transitions.
- All other transitions are allowed (e.g., pending → completed is permitted for testing flexibility).
- This preserves existing test behavior while enforcing the key invariant.

---

## Test Count Baseline
- **Before:** 268 passing
- **After:** 297 passing (+29 new tests)
