# S11-FIX31 — Downloader Dead Button + Graceful Error

## What Changed
- `ModelDownloaderModal.tsx`: fetch rejections in `pollProgress` now set `{status: 'failed', error_message: 'network_error'}` instead of silent log.
- Button rendering expanded: retry button now shown in `idle || failed || cancelled` (was `failed || cancelled` only), eliminating the dead-button gap in idle state.
- Added `handleRetry()` alias to `handleRestart()` for semantic clarity.
- Added `getErrorMessage()` mapper: network sentinel → `downloader.error.network`; size/mismatch → `downloader.error.sizeMismatch`; disk/full → `downloader.error.diskFull`; cancel → `downloader.error.userCancelled`; else → `downloader.errorGeneric` with raw message.
- `formatBytes(0)` replaced with `t('downloader.progressUnknown')` — no more "0 B of 0 B" when total_bytes is unknown.
- `en.json` + `id.json`: added `downloader.progressUnknown`, `downloader.retry`, `downloader.error.*` (4 keys), `downloader.errorGeneric`.

## Key Decisions
- Used sentinel `'network_error'` for fetch-rejection state rather than passing the JS Error object through i18n — keeps the mapper clean and testable.
- Kept `t('downloader.restart')` for the button label in failed/cancelled to preserve existing test assertions; added `downloader.retry` as parallel key (same value) for semantic completeness.
- No backend changes — the frontend handles network errors locally since the backend is unreachable when version.json 404s.

## Test Coverage
- `shows translated network error and retry button when fetch rejects` — asserts `download-restart-btn` present + translated error key text after fetch rejection.
- `re-triggers fetch when retry button is clicked after network error` — asserts `mockFetch` called twice (initial poll + retry click).
- `does not render literal "0 B of 0 B" when total_bytes is unknown` — asserts regex match absent from DOM.

## Open Questions
- None. Scope locked to dead-button fix + translated graceful error only (per CEO FR-17). Full download-function restoration deferred to post-public-push.
