# Slice 20.1: Multi-file Batch Validation & FIFO Queue

## Goal
Upgrade the Drop Zone and queue flow from single-file behavior to multi-file behavior. Valid files enter the queue in FIFO order. Invalid files are skipped with an aggregated toast.

## CEO-Approved Exceptions
- **TIFF/BMP Deferred:** Phase 6 prototype only accepts PNG, JPG, JPEG, WEBP, and PDF. TIFF/BMP support is deferred to Phase 7 to keep the prototype stable.

## Files Changed
- `src/lib/fileValidation.ts` (Added `validateFilesBatch`, `ValidationReason`, `SkippedFile`)
- `src/components/dropzone/FileDropZone.tsx` (Multi-file drop, `multiple` attribute, aggregated toast logic)
- `src/stores/scan2text.store.ts` (Added `jobOrder`, `registerJob`, `startNextPendingJob`, FIFO activation logic)
- `src/locales/en.json` & `src/locales/id.json` (Added batch error i18n keys)
- `src/stores/scan2text.store.test.ts` (FIFO queue tests)
- `src/components/dropzone/FileDropZone.test.tsx` & `FileDropZone.toast.test.tsx` (Multi-file & toast tests)
- `src/lib/fileValidation.test.ts` (Batch validation tests)

## Behavior Changes
1. **Drop Zone:** Now accepts multiple files via click or drag-and-drop.
2. **Validation:** Checks type before size. Rejects TIFF/BMP in Phase 6.
3. **Toast:** Shows one aggregated toast for skipped files (e.g., "2 files skipped: 1 unsupported, 1 too large"). Shows one warning toast if all files are invalid.
4. **Queue (FIFO):** Jobs are tracked in `jobOrder` array. Only one job processes at a time. When an active job completes/fails/is removed, `startNextPendingJob()` promotes the next pending job.

## Tests Added/Updated
- Added ~28 new tests across validation, DropZone, and store.
- Fixed a flawed FIFO test that expected impossible state transitions.
- Total test count increased from 320 to 348.

## Verification Results
- `npm run test`: 348/348 passing ✅
- `npm run typecheck`: PASS ✅
- `npm run build`: SUCCESS ✅

## Known Limitations / Cleanups
- Deleted temporary `debug-store.test.ts`.
- Removed unused `act` import in `FileDropZone.test.tsx`.