# Slice 8.7b — Frontend Model Downloader UI (Full-Screen Modal)

Date: 2026-08-11
Phase: Phase 7
Status: COMPLETE

## What Changed

### Backend
- Added `GET /api/download/status` endpoint to `src/scan2text/routes/download.py` — returns current download state without triggering anything.
- Tests: `tests/test_api_download.py` gained 2 tests (`TestDownloadStatus`).

### Frontend
- New component: `frontend/src/components/layout/ModelDownloaderModal.tsx`
  - Full-screen fixed overlay (`fixed inset-0 z-50 bg-black/80 flex items-center justify-center`)
  - Card showing title, description, progress bar, byte counters ("X MB / Y MB")
  - Polls `GET /api/download/progress` every 1s while status is 'downloading' or 'verifying'
  - Closes modal on 'complete'
  - Shows "Restart Download" button on 'failed' or 'cancelled'
  - Cancel button calls `POST /api/download/cancel`
- New tests: `frontend/src/components/layout/ModelDownloaderModal.test.tsx` (6 tests)
- i18n keys added to `en.json` and `id.json`: `downloader.title`, `downloader.description`, `downloader.progress`, `downloader.cancel`, `downloader.restart`, `downloader.failed`, `downloader.verifying`
- Test setup updated: `frontend/src/test-setup.ts` includes downloader i18n resources
- App.tsx integration:
  - On mount: calls `GET /api/download/status`
  - If NOT 'complete': calls `POST /api/download/start` and opens modal
  - Welcome Screen renders ONLY after model download is 'complete'

## Key Decisions

1. **Modal blocks entire app** — user cannot interact with CommandCenterLayout until download completes or they cancel (and restart).
2. **Cancel state persists** — if cancelled, modal stays open with "Download cancelled" message and "Restart Download" button; app remains blocked.
3. **Backend unavailable = skip** — if `/api/download/status` fails (no backend), sets `modelReady=true` and proceeds to Welcome Screen (handles demo/offline mode).
4. **i18n in test-setup.ts** — added downloader keys to both EN and ID resource blocks so tests render translated text without mocking `useTranslation`.

## Test Coverage

- Backend: +2 tests (status endpoint) → 188 total
- Frontend: +6 tests (modal render, progress display, cancel, restart on cancelled/failed, close on complete) → 589 total
- All tests GREEN, typecheck PASS, build PASS

## Open Questions

- None. First-run flow verified: Download Modal → (complete) → Welcome Screen → App Ready.
