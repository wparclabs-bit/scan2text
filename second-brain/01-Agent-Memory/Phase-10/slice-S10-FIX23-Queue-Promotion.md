# S10-FIX23: Queue Promotion on Terminal Transition

## What Changed
Fixed two critical bugs in `scan2text.store.ts`:

1. **Nested `set` calls in `pollJob`** — The completed/failed branches called `set()` inside another `set()` callback, corrupting Zustand's internal state and causing `getState()` to return `undefined`. Refactored to use flat `set({...})` calls with explicit `get().jobs` reads.

2. **Queue promotion on terminal transition** — When active job completes/fails via `pollJob`, the oldest pending job with a `taskId` is now promoted to `'processing'` state (FIFO). Added `promoteNextPending()` method wired into:
   - `pollJob` completed branch
   - `pollJob` failed branch
   - `startUpload` catch block

## Key Decisions
- `promoteNextPending()` checks if active job is in terminal status before promoting; skips if active job is still non-terminal
- Uses `jobOrder.find()` to preserve FIFO order
- Requires `taskId !== null` to ensure job was successfully uploaded before promotion
- Tests updated to use `mockResolvedValueOnce()` for the immediate `startPolling` call after promotion

## Test Coverage
- Frontend: 88/88 store tests passing (was 55 failing, now all green)
- Full suite: 627 tests passing across 38 test files
- New tests added in previous slice: promotion on complete, promotion on fail, upload-fail promotion

## Open Questions
None. S10-FIX23 is complete.
