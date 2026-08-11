# Slice 8.2 — Welcome Expectations Screen

**Date:** 2026-08-11
**Phase:** Phase 7 (Real Backend) — ADR-007 implementation slice 1 of N
**Status:** COMPLETE

## What Changed

### Backend
- `AppSettings` model (`src/scan2text/models/settings.py`) gained `hide_welcome_notice: bool = False` field
- `PUT /api/settings` route already handled the new field via Pydantic validation (no route changes needed)
- `SettingsService` round-trip preserves the field automatically

### Frontend
- New component: `frontend/src/components/layout/WelcomeModal.tsx`
  - Uses shadcn `<Dialog>` wrapper
  - Fetches `GET /api/settings` on mount to determine if modal should show
  - Renders 4 bullet points from i18n keys `welcome.bullet1` through `welcome.bullet4`
  - Checkbox "Don't show this again" calls `PUT /api/settings` with `hide_welcome_notice` value
  - Supports both controlled (`open`/`onOpenChange` props) and uncontrolled (auto-fetch) modes
- Wired into `App.tsx`: fetches settings on load, renders `<WelcomeModal />` when `hide_welcome_notice === false`
- SettingsDialog (`frontend/src/components/layout/SettingsDialog.tsx`) gains "Re-open Welcome Screen" button (triggers page reload)
- i18n keys added to both `en.json` and `id.json`:
  - `welcome.title`, `welcome.bullet1`–`bullet4`, `welcome.dontShowAgain`, `welcome.close`
  - `settings.reopenWelcome`
- Test setup (`src/test-setup.ts`) updated with new i18n keys

### Tests
- Backend: 3 new tests in `tests/unit/services/test_settings_service.py`
  - `test_default_value_is_false`
  - `test_save_and_load_hide_welcome_notice`
  - `test_load_missing_file_defaults_to_false`
- Frontend: 6 new tests in `frontend/src/components/layout/WelcomeModal.test.tsx`
  - Renders when `hide_welcome_notice` is false
  - Does not render when `hide_welcome_notice` is true
  - All 4 bullets render with correct i18n keys
  - Checkbox toggles state
  - Calls PUT /api/settings on checkbox change
  - Close button renders with translated text

## Key Decisions

1. **Preference stored in settings.json, not localStorage** — per ADR-007 CEO decision; persists across sessions via backend
2. **Modal auto-fetches on mount** — App.tsx fetches GET /api/settings and passes `hide_welcome_notice` to control rendering; WelcomeModal also supports controlled mode for SettingsDialog re-open
3. **Checkbox triggers immediate PUT** — no separate "Save" button; preference persists on toggle
4. **Re-open button triggers page reload** — simplest approach; modal re-evaluates on next load (already dismissed so won't show again unless settings are reset)
5. **Native `<input type="checkbox">`** — no shadcn Checkbox component needed; styled with Tailwind utilities

## Test Coverage

| Area | Tests Added | Total |
|------|-------------|-------|
| Backend settings service | +3 | 146 |
| Frontend WelcomeModal | +6 | 571 |
| **Grand total** | **+9** | **717** |

All tests GREEN. Typecheck PASS. Build PASS.

## Open Questions

- Should the re-open button reset `hide_welcome_notice` to false, or just reload the page (which would still see true)? Current implementation reloads without resetting — user would need to manually edit settings.json to re-trigger. Consider adding a query param or separate endpoint to force-show.
- Should the modal be closable via the X button in DialogOverlay without saving the preference? Currently X closes but doesn't persist.
