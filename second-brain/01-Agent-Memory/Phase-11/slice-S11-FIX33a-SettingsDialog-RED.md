# S11-FIX33a — SettingsDialog RED

## What Changed
- Created `frontend/src/components/layout/SettingsDialog.test.tsx` with 5 API-integration tests:
  1. `populates inputs from GET /api/settings` — expects `settings-output-dir` populated from mock GET
  2. `fires PUT with merged payload when save button clicked` — mocks PUT, verifies merged payload with changed `max_pdf_pages: 30`
  3. `shows translated success toast on save` — asserts `/settings.saved/i` in DOM after save
  4. `does NOT render language or theme selects` — asserts language/theme labels absent (CEO locked decision)
  5. `blocks PUT when max_pdf_pages < 1` — asserts PUT not called when value is `0`
- Import path is `../../lib/i18n` (deliberate RED — source has `../i18n`; GREEN will fix)
- `initI18n('en')` called in `beforeEach` with mock fetch for `/api/settings`

## Key Decisions
- Test file replaces previous 11-test skeleton (S11-FIX33) with 5 focused API-integration tests
- `waitFor` used for all async assertions (GET fetch + render)
- `vi.spyOn(globalThis, 'fetch')` for all API mocking
- `data-testid` targets: `settings-output-dir`, `settings-max-pdf-pages`, `settings-save-btn`

## Test Coverage
- RED: Suite fails at module resolution (`../../lib/i18n` does not exist)
- 0 tests executed; 1 failed suite

## Open Questions
- Import path fix: `../../lib/i18n` → `../i18n` (GREEN phase)
- `initI18n` signature mismatch: test passes string `'en'`, function expects `Record<string, { translation }>`. May need `initI18n({ en: { translation: {} } })` or mock adjustment in GREEN.

## Commit
- Test: `df6d33e` — test(S11-FIX33a): RED - SettingsDialog 5-test skeleton with API integration tests
- State: `d681d88` — doc(S11-FIX33a): update 00-Current-State for RED
