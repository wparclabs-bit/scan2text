# S11-FIX33b — SettingsDialog GREEN

## What Changed
- Fixed `SettingsDialog.test.tsx` import crash: `../../lib/i18n` → `../../i18n`
- Aligned `initI18n(...)` call to real signature: `initI18n({ en: { translation: en } })`
- Fixed SettingsDialog.tsx i18n key names:
  - `settings.savedToast` → `settings.saved`
  - `settings.saveFailedToast` → `settings.saveFailed`
  - `settings.loadFailedToast` → `settings.loadFailed`
  - `settings.cpuThreadsHint` → `settings.autoHint`
- Added new i18n keys to `en.json` + `id.json` + `test-setup.ts`:
  - `settings.save`, `settings.saved`, `settings.saveFailed`, `settings.loadFailed`
  - `settings.validationPages`, `settings.validationThreads`, `settings.autoHint`
- Fixed test-3 toast assertion: spies on `toast.success` instead of DOM lookup (sonner is mocked in test-setup)
- Fixed TS6133: unused `url` params prefixed with `_` in test file
- Fixed TS1484: `SettingsResponse` imported with `type` keyword in SettingsDialog.tsx
- Removed duplicate `save` key from locale files

## Key Decisions
- `api.ts` already had `getSettings()` and `saveSettings()` — no backend changes needed
- Test-3 changed from `screen.getByText(/settings.saved/i)` DOM assertion to `vi.spyOn(toast, 'success')` — because sonner is mocked in test-setup.ts and never renders to DOM
- Old toast keys (`savedToast`, `saveFailedToast`, `loadFailedToast`) removed from locales; new keys take precedence

## Test Coverage
- `SettingsDialog.test.tsx`: 5/5 passed
- `SettingsDialog.RED.test.tsx`: 5/5 passed (unchanged)
- Full suite: 634 passed, 0 failures

## Open Questions
- None

## Gates
- Targeted vitest: GREEN (5/5)
- Full suite: 634 passed, 0 failures
- Typecheck: exit 0
- Build: exit 0
