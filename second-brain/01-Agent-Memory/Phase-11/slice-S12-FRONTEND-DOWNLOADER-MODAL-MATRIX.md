# S12-FRONTEND-DOWNLOADER-MODAL-MATRIX

**Date:** 2026-08-20
**Phase:** GATE5 (Frontend)
**Status:** COMPLETE

## Summary

Implemented the frontend 4-scenario downloader modal messaging matrix with full i18n support (EN + ID). The ModelDownloaderModal component now accepts `modelsMissing`, `isOnline`, and `versionJsonExists` props and renders the correct message based on a deterministic scenario matrix. Added 3 new i18n keys to both locale files and test-setup.ts.

## Tasks Completed

### 1. i18n Keys (en.json + id.json + test-setup.ts)
Added three new keys to the `downloader` namespace in BOTH English and Indonesian:

| Key | EN | ID |
|-----|----|----|
| `downloader.versionJsonMissing` | "Configuration file missing. Please reinstall or contact support." | "File konfigurasi hilang. Silakan instal ulang atau hubungi dukungan." |
| `downloader.offlineWarning` | "You are offline. Connect to the internet to download required models." | "Anda sedang offline. Hubungkan ke internet untuk mengunduh model yang diperlukan." |
| `downloader.downloadButton` | "Download Models" | "Unduh Model" |

Also preserved existing `downloader.error.versionJsonMissing` key for backward compatibility with `getErrorMessage()`.

### 2. Component Updates (ModelDownloaderModal.tsx)
- Extended `ModelDownloaderModalProps` interface with optional props: `modelsMissing`, `isOnline`, `versionJsonExists`
- Default values: `modelsMissing=true`, `isOnline=true`, `versionJsonExists=true` (backward compatible)
- Implemented 4-scenario rendering matrix:
  - **Scenario 1** (`modelsMissing=true, isOnline=true, versionJsonExists=true`): Standard download UI with progress bar and "Download Models" button
  - **Scenario 2** (`modelsMissing=true, isOnline=false, versionJsonExists=true`): Offline warning message
  - **Scenario 3** (`modelsMissing=true, versionJsonExists=false`): Configuration missing error (regardless of online status)
  - **Scenario 4** (`modelsMissing=false`): Returns null — no modal rendered
- Added `data-testid="download-button"` on the primary action button (replaced old `download-restart-btn`)
- Idle state now shows "Download Models" button that triggers `POST /api/download/start`
- Failed/cancelled states show "Restart Download" via same button

### 3. App.tsx Wiring
- Updated `<ModelDownloaderModal>` to pass new props:
  - `modelsMissing={!modelReady}` — derived from health check
  - `isOnline={!!navigator.onLine}` — browser online status
  - `versionJsonExists={true}` — placeholder (backend handles version.json detection)

### 4. Test Updates (ModelDownloaderModal.test.tsx)
- Added `initI18n` and `en` imports for clean i18n state in scenario tests
- Created `describe('4-scenario matrix')` block with 4 new tests:
  - Scenario 1: Renders standard download UI with `download-button` data-testid
  - Scenario 2: Renders offlineWarning i18n string, no download button
  - Scenario 3: Renders versionJsonMissing i18n string, no download button
  - Scenario 4: Returns null, no modal in DOM
- Fixed 6 existing tests that referenced old `download-restart-btn` data-testid → updated to `download-button`

## Test Results
- **ModelDownloaderModal:** 20/20 tests pass (14 existing + 4 new scenario + 2 fixed)
- **TypeScript typecheck:** 0 errors
- **i18n verification:** All 3 new keys confirmed in en.json, id.json, and test-setup.ts

## Files Changed
1. `frontend/src/locales/en.json` — Added 3 new downloader keys
2. `frontend/src/locales/id.json` — Added 3 new downloader keys
3. `frontend/src/test-setup.ts` — Added 3 new downloader keys (both en + id sections)
4. `frontend/src/components/layout/ModelDownloaderModal.tsx` — Extended props, implemented 4-scenario matrix
5. `frontend/src/components/layout/ModelDownloaderModal.test.tsx` — Added 4 scenario tests, fixed 6 data-testid references
6. `frontend/src/App.tsx` — Wired new props to ModelDownloaderModal

## Non-Goals (Respected)
- No backend/Python edits
- No Rust/Tauri edits
- No changes to download progress bar UI logic
- No full test suite run (deferred to GATE slice)

## Verification Commands
```powershell
cd frontend; npm run test -- ModelDownloaderModal  # 20/20 pass
npm run typecheck                                  # 0 errors
Get-Content src/locales/en.json | Select-String "versionJsonMissing"  # confirmed
Get-Content src/locales/id.json | Select-String "versionJsonMissing"  # confirmed
```
