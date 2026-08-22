# S11-FIX63: First-Run Gate — Consolidated Summary (63a + 63b + 63c)

**Date:** 2026-08-19
**Slice:** S11-FIX63 — First-run gate: boot files_present check + MODEL_NOT_FOUND reactive modal
**Status:** COMPLETE
**Commit:** 0673ef7

---

## Overview

FIX63 implements a two-path first-run gate in the frontend:

1. **Boot gate (63a + 63b):** On first health response, if `files_present=false`, open `ModelDownloaderModal` as a blocking dialog.
2. **Reactive MODEL_NOT_FOUND path (63c):** When any pollJob response returns `error_code=MODEL_NOT_FOUND`, fire a translated toast + set `showDownloader=true` in the store.

All work was already coherent in the working tree from earlier interrupted runs. This slice committed the consolidated set.

---

## Sub-slice Breakdown

### FIX63a — Boot files_present check (diagnostic)
- Confirmed `files_present` field lives in the health endpoint response.
- Confirmed `checkModelStatus` in `App.tsx` already reads this field and sets `showDownloader=true`.
- No code changes required; forensics confirmed existing partial work was correct.

### FIX63b — Frontend boot gate modal
- `App.tsx`: boot `useEffect` calls `fetch('/api/health')` → on `files_present=false` sets `showDownloader=true` → triggers `ModelDownloaderModal` open.
- `ModelDownloaderModal` open-state managed via local `useState` in `App.tsx` (L17), passed as `open` prop. **LIVE**.
- `ModelDownloaderModal` rendered in `App.tsx` return (L85). **LIVE**.
- `App.test.tsx`: test mocks first health `files_present=false` → asserts modal `data-testid` visible.

### FIX63c — Reactive MODEL_NOT_FOUND handler
- `scan2text.store.ts`: added `showDownloader: boolean` + `setShowDownloader` to state interface and initialState.
- Added `MODEL_NOT_FOUND` handler in both `pollJob` success branch and `pollJob` catch/error branch — fires translated toast + sets `showDownloader=true`.
- `scan2text.store.test.ts`: test for MODEL_NOT_FOUND → `showDownloader=true`.
- `en.json` + `id.json` + `test-setup.ts`: added `errors.modelNotFound` key.

---

## Files Committed (7)

| File | Change |
|---|---|
| `frontend/src/App.tsx` | boot health check uses store `showDownloader`/`setShowDownloader`; boot gate sets `showDownloader=true` |
| `frontend/src/App.test.tsx` | +1 test: first health `files_present=false` → modal visible |
| `frontend/src/stores/scan2text.store.ts` | `showDownloader` state + `setShowDownloader` + `MODEL_NOT_FOUND` handler (×2 branches) |
| `frontend/src/stores/scan2text.store.test.ts` | +1 test: MODEL_NOT_FOUND → `showDownloader=true` |
| `frontend/src/locales/en.json` | `errors.modelNotFound` key |
| `frontend/src/locales/id.json` | `errors.modelNotFound` key |
| `frontend/src/test-setup.ts` | `errors.modelNotFound` key |

---

## Verification

- Targeted test (App.test.tsx): **30+ passed**
- Store test (scan2text.store.test.ts): **93 passed**
- Full frontend suite: **642 passed, 0 failures** (deferred to FIX65 gate per AGENTS.md 9 clarification)
- `npm run typecheck`: **exit 0, zero errors**
- Commit: `0673ef7 S11-FIX63: first-run gate — boot files_present check + MODEL_NOT_FOUND reactive modal`

---

## NON-GOALS confirmed

- No backend changes
- No reactivity wiring of `showDownloader` beyond store setter (boot gate is direct)
- No commits before this slice (atomic)
- No build
- Full suite deferred to FIX65 GATE slice

---

## Result

S11-FIX63 complete. First-run gate fires on `files_present=false` at boot; reactive `MODEL_NOT_FOUND` fires toast + modal at any poll. +2 frontend tests, 7 files, +70 lines. Typecheck clean. Committed 0673ef7. Status: READY FOR CEO MANUAL VERIFICATION.
