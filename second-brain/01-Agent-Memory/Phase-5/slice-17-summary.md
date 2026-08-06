# Slice 17 - DropZone UI Wiring

Date: 2026-08-05  
Phase: Phase 5 - UI and State Integration  
Status: COMPLETE

## Objective
Wire the DropZone UI to the new Phase 5 Zustand store and trigger polling.

## Changes
- DropZone.tsx now uses useScan2TextStore instead of old Sprint 1 fileStore
- On file drop, calls startUpload({ file }) then fire-and-forget pollJob({ jobId })
- DropZone.test.tsx updated to mock new Zustand store with vi.hoisted()
- debug-drop.test.tsx updated to new store mocks

## Test Count Change
- Before Slice 17: 97 tests
- After Slice 17: 95 tests
- Net loss: 2 tests (intentional cleanup of old Sprint 1 WebSocket/assignTaskId tests)

## Verification
- TypeScript typecheck: PASS
- Frontend tests: 95/95 passing

## Next Slice
Slice 18: Render OCR results and Jobs page stub.
