# S11-FIX40 — Downloader Retry UX

**Date:** 2026-08-18
**Slice:** S11-FIX40
**Status:** COMPLETE

## What Changed

Three bugs in `ModelDownloaderModal.tsx` fixed:

1. **`getErrorMessage()` raw string leak:** Added explicit handler for `error_message === 'version.json not found'` returning `t('downloader.error.versionJsonMissing')` BEFORE the generic fallback. Previously fell through to `errorGeneric` → "Error: version.json not found".

2. **Doubled progress interpolation:** When `total_bytes === 0`, progress JSX now renders `t('downloader.progressUnknown')` directly instead of `t('downloader.progress', { downloaded: formatBytes(0), total: formatBytes(0) })` which produced "Waiting for download info… of Waiting for download info…".

3. **Dead restart button:** Added `retrying` local state. On restart click, button becomes disabled with translated "Retry Download" text while the `POST /api/download/start` request is in flight, then reverts on settle.

## Key Decisions

- **Retry state local, not global:** `retrying` is a separate `useState` from `DownloadState` to avoid competing with poll-driven state updates.
- **`finally` block for cleanup:** `setRetrying(false)` in `finally` ensures cleanup on both success and error paths.
- **Disabled button + opacity shift:** Tailwind `disabled:opacity-50 disabled:cursor-not-allowed` provides visible feedback without custom spinner component (minimal change).
- **Pre-existing test fix:** Existing test at line 190 used `/downloader\.error\.network/` regex that only matched because i18n fallback returned the key path. Now that error keys are in test-setup.ts, updated to assert the actual rendered translated string.

## Test Coverage

**Frontend** (`frontend/src/components/layout/ModelDownloaderModal.test.tsx`):
- `renders translated versionJsonMissing error instead of raw string` — asserts rendered text equals translation, raw string absent
- `shows single progressUnknown line when total_bytes is 0, not doubled` — asserts exactly 1 match of progressUnknown, no `/Waiting.*of.*Waiting/` pattern
- `enter visible retrying state on restart click while request in flight` — mocks start endpoint as pending promise, asserts button is disabled during flight, re-enabled after resolve

**i18n:** Added `downloader.error.versionJsonMissing` to both `en.json` and `id.json` + test-setup.ts.

## Gates

| Gate | Result |
|------|--------|
| Frontend targeted | 16 passed (13 existing + 3 new) |
| Frontend full suite | 633 passed, 0 failures |
| Typecheck | exit 0 |
| Build | exit 0 |

## Open Questions

None. FIX41 smoke verification pending (visual proof of retrying state).

## Files Changed

- `frontend/src/components/layout/ModelDownloaderModal.tsx` — getErrorMessage handler, progress JSX, retrying state
- `frontend/src/components/layout/ModelDownloaderModal.test.tsx` — +3 tests, fix pre-existing regex test
- `frontend/src/test-setup.ts` — added downloader error keys + progressUnknown to both locales
- `frontend/src/locales/en.json` — added `downloader.error.versionJsonMissing`
- `frontend/src/locales/id.json` — added `downloader.error.versionJsonMissing`
