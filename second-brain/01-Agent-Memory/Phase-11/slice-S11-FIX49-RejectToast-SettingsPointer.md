# S11-FIX49 — RejectToast + SettingsPointer

## What Changed
- `frontend/src/lib/api.ts`: extended `TaskStatusResponse` and `FailedTaskStatusResponse` with `error_code?: string`
- `frontend/src/stores/scan2text.store.ts`: in the `isTaskFailed` branch of `pollJob`, fires `toast.info(i18n.t('errors.pdfTooComplex'))` when `error_code === 'PDF_TOO_COMPLEX'`, and `toast.info(i18n.t('errors.fileTooComplex'))` when `error_code === 'FILE_TOO_COMPLEX'`. Red dot + Retry tooltip remain (informational only).
- `frontend/src/locales/en.json`: added `errors.pdfTooComplex` and `errors.fileTooComplex`
- `frontend/src/locales/id.json`: added Indonesian translations
- `frontend/src/test-setup.ts`: added both locale keys to test i18n bootstrap
- `frontend/src/stores/scan2text.store.test.ts`: +3 tests (PDF_TOO_COMPLEX toast, FILE_TOO_COMPLEX toast, other error_code no toast)

## Key Decisions
- Used `toast.info` (not `.warning` or `.error`) — the red dot + tooltip already convey the failure; the toast is informational guidance.
- Checked `error_code` before falling back to generic failure handling — preserves existing behavior for all other error codes.
- Imported `i18n` from `../i18n` (not `useTranslation` hook) since Zustand stores are non-React.

## Test Coverage
- `on PDF_TOO_COMPLEX should fire translated info toast` — verifies `toast.info` called with EN string
- `on FILE_TOO_COMPLEX should fire translated info toast` — verifies `toast.info` called with EN string
- `on other error_code should not fire a new toast` — verifies no toast for unknown error codes
- Total: 636 passed (was 633)

## Open Questions
- None. Visual proof deferred to FIX53 smoke.
