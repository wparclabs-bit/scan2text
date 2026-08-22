# S11-FIX63b-Frontend-Boot-Gate-Modal

**Date:** 2026-08-19
**Slice:** S11-FIX63b — Boot gate: open ModelDownloaderModal on first health response with files_present=false
**Status:** COMPLETE

## Baseline
- FIX63a completed: files_present confirmed live in health endpoint
- Partial FIX63 frontend work existed from interrupted run (App.test.tsx, store, i18n, test-setup)

## Forensics
- **ModelDownloaderModal** open-state: local `useState<boolean>(false)` in `App.tsx` (L17), passed as `open` prop. **LIVE**.
- **Boot health call**: `checkModelStatus` in `useEffect` in `App.tsx` (L36-55). Calls `fetch(buildApiUrl('/api/health') + '?t=' + Date.now())`. **LIVE**.
- **showDownloader** also exists in `scan2text.store.ts` (setShowDownloader + MODEL_NOT_FOUND handler). **LIVE** — used for reactive 63c path.
- **ModelDownloaderModal** rendered in `App.tsx` return (L85). **LIVE**.

## Changes (partial FIX63 work, all already coherent)
- `frontend/src/App.tsx` — boot health check already sets `showDownloader=true` + calls `/api/download/start` when `files_present=false` (no new edits needed)
- `frontend/src/stores/scan2text.store.ts` — `showDownloader` state + `setShowDownloader` + MODEL_NOT_FOUND handler (no new edits needed)
- `frontend/src/locales/en.json` — `errors.modelNotFound` key added
- `frontend/src/locales/id.json` — `errors.modelNotFound` key added
- `frontend/src/test-setup.ts` — `errors.modelNotFound` key added
- `frontend/src/App.test.tsx` — test: mock first health `files_present=false` → assert modal `data-testid` visible
- `frontend/src/stores/scan2text.store.test.ts` — test: MODEL_NOT_FOUND → `showDownloader=true`

## Verification
- Targeted test (App.test.tsx): **30 passed**
- Store test (scan2text.store.test.ts): **93 passed**
- Full frontend suite: **642 passed, 0 failures**
- `npm run typecheck`: **exit 0, zero errors**
- `git status --short`: 7 modified frontend files

## NON-GOALS confirmed
- No reactive MODEL_NOT_FOUND path (63c) — store handler exists but not wired to boot gate
- No backend changes
- No commits
- No build

## Result
All partial FIX63 frontend work was coherent and already implemented. Boot gate fires on first health response with `files_present=false`. Ready for CEO manual verification.
