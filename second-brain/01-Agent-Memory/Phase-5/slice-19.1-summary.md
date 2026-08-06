# Slice 19.1 Summary — Real DropZone Capture/Validation/Toast Flow

## What Changed

Replaced the left-panel DropZone placeholder with a real file capture component that validates files, shows visual states (idle/drag-over/error), and creates visible queue items on valid accept.

### Files Created
- `frontend/src/lib/fileValidation.ts` — Pure validation utility; checks MIME type + extension fallback, enforces 50MB max
- `frontend/src/lib/fileValidation.test.ts` — 14 tests covering all allowed types, size boundary, invalid types, empty MIME fallback
- `frontend/src/components/dropzone/FileDropZone.tsx` — Real DropZone component with drag-and-drop, click picker, keyboard access, error shake animation
- `frontend/src/components/dropzone/FileDropZone.test.tsx` — 15 tests covering render, states, interactions, validation, multi-file handling, timer reset

### Files Modified
- `frontend/src/components/layout/panels/DropZonePanel.tsx` — Replaced i18n text placeholder with `<FileDropZone />`
- `frontend/src/index.css` — Added `@keyframes shake` and `.animate-shake` utility class

### Files Unchanged
- `frontend/src/components/DropZone.tsx` — Old standalone component preserved (not used in Command Center)
- `frontend/src/components/DropZone.test.tsx` — Old tests preserved
- `frontend/src/debug-drop.test.tsx` — Debug test preserved

## Key Decisions

1. **Validation strategy**: Checks both MIME type AND file extension as fallback. This handles browsers that report empty MIME types while still rejecting clearly wrong types like `.txt`.

2. **Single-file enforcement**: Multi-file drops are handled by taking `files[0]` only. No queue orchestration for multiple files yet.

3. **Error state with auto-reset**: Invalid files trigger `data-state="error"` with a CSS shake animation, then auto-reset to idle after 1500ms via `setTimeout`. Tests use `vi.useFakeTimers()` + `act()` + `vi.advanceTimersByTimeAsync()`.

4. **Queue item creation**: Valid files call `addJob({ id, fileName })` from the Zustand store, creating a pending queue item. Upload/polling is deferred to later slices.

5. **Test ID requirements met**: `data-testid="dropzone"` on root, `data-testid="dropzone-input"` on hidden input, `data-state` attribute for deterministic state testing.

## Test Coverage

**fileValidation.test.ts** (14 tests):
- Allowed types: PNG, JPG, JPEG, WEBP, PDF
- Size boundary: exactly 50MB valid, 50MB+1 byte invalid
- Rejected types: TXT, MP4
- Empty MIME fallback to extension check

**FileDropZone.test.tsx** (15 tests):
- Render: dropzone/testid, hidden input, default idle state
- Drag states: drag-over set/reset, drag leave reset
- Click/keyboard: Enter, Space open picker
- Validation: invalid file shows error state, no addJob called
- Valid accept: addJob called with correct fileName, onFileAdd callback fired
- Multi-file: only first file processed
- Timer reset: error auto-resets to idle after delay
- Accessibility: role="button", tabIndex="0"

**Total**: 215 tests passing (186 baseline + 29 new)

## Open Questions

- Toast notification component not yet implemented (placeholder text shown in error state only); real toast system deferred to next slice.
- Queue panel does not yet display the newly added pending jobs — center panel wiring is Slice 19.2+.

## Completion Patch

Slice 19.1 was partially implemented but missing several required behaviors. This patch completes the remaining scope.

### What Was Missing

1. **Toast errors** — No toast notification system; invalid files only showed inline text
2. **i18n error messages** — No translated keys for validation/upload errors or queue empty state
3. **Valid file flow** — Valid files called `addJob` but did not trigger `startUpload`
4. **Queue item UI** — Center Queue panel was a static i18n placeholder
5. **File size formatting** — No utility to format bytes into human-readable strings
6. **Thumbnail handling** — No image thumbnail generation or PDF generic icon
7. **Object URL cleanup** — No helper to revoke blob URLs on unmount

### What Was Fixed

#### Files Created
- `frontend/src/lib/formatBytes.ts` — Formats bytes to B/KB/MB with deterministic rounding
- `frontend/src/lib/formatBytes.test.ts` — 7 tests covering 0, bytes, KB, MB boundaries
- `frontend/src/lib/cleanupObjectURLs.ts` — Revokes only blob: URLs, handles null/undefined safely
- `frontend/src/lib/cleanupObjectURLs.test.ts` — 6 tests for blob revocation, non-blob skip, null safety
- `frontend/src/components/dropzone/FileDropZone.toast.test.tsx` — 8 toast/integration tests
- `frontend/src/components/layout/panels/QueuePanel.test.tsx` — 11 queue panel tests

#### Files Modified
- `frontend/src/locales/en.json` — Added `errors.*` and `queue.*` translation keys
- `frontend/src/locales/id.json` — Added Indonesian translations for all new keys
- `frontend/src/test-setup.ts` — Mocked sonner Toaster; added i18n test resources
- `frontend/src/App.test.tsx` — Added scan2text.store mock for QueuePanel integration
- `frontend/src/i18n/resources.test.ts` — Added tests for new error/queue keys and structure matching
- `frontend/src/stores/scan2text.store.ts` — Added `fileSize` and `thumbnailUrl` to ScanJob interface; updated addJob/startUpload signatures
- `frontend/src/components/dropzone/FileDropZone.tsx` — Integrated startUpload, toast errors, thumbnail creation
- `frontend/src/components/layout/panels/QueuePanel.tsx` — Full job list rendering with name/size/thumbnail-or-PDF-icon/status
- `frontend/src/main.tsx` — Mounted `<Toaster />` component
- `frontend/src/stores/scan2text.store.test.ts` — Added 4 tests for thumbnailUrl/fileSize fields

### New Tests Added

| File | Tests | Coverage |
|------|-------|----------|
| formatBytes.test.ts | 7 | 0 B, bytes, KB, MB boundaries |
| cleanupObjectURLs.test.ts | 6 | blob revocation, non-blob skip, null safety |
| FileDropZone.toast.test.tsx | 8 | invalid MIME toast, invalid ext toast, oversized toast, startUpload call, upload failure toast, thumbnailUrl for images/PDFs |
| QueuePanel.test.tsx | 11 | empty state, name/size/status display, thumbnail, PDF icon, sorting, URL cleanup |
| scan2text.store.test.ts | 4 | thumbnailUrl/fileSize in addJob and startUpload |
| resources.test.ts | updated | en/id structure matching for errors and queue keys |

**Total new tests: 36**

### Final Test Count

- **268/268 passing** (up from 215)
- TypeScript typecheck: PASS
- Build: PASS

## Next Steps (Slice 19.2)

- Auto-select completed job in right panel
- Job retry/removal UI in queue panel
- Persist jobs to localStorage
