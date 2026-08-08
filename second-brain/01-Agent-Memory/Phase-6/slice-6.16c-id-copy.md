# Slice 6.16c — Finalize Queue Empty-State Copy, Per-Locale Icons (CEO ID Review)

## What Changed
- `frontend/src/locales/en.json`: `queue.emptyFriendly` updated to `" Nothing here yet. Drop something tasty!"` (leading space retained per CEO lock).
- `frontend/src/locales/id.json`: `queue.emptyFriendly` updated to `"🙈 Masih belum ada file tuh! Coba upload di atas!"` (CEO-approved Indonesian copy with monkey emoji).
- `frontend/src/test-setup.ts`: test fixtures synced to match new EN and ID values.
- `frontend/src/components/layout/panels/QueuePanel.test.tsx`: EN assertion updated to leading-space value; new ID locale test added asserting `🙈 Masih belum ada file tuh! Coba upload di atas!` via `i18next.changeLanguage('id')`.

## Key Decisions
- **Per-locale icons inside strings (CEO decision):** i18n owns the full message including its icon. No separate icon element in QueuePanel empty-state markup. Forensics confirmed no separate icon element existed — only `<p data-testid="queue-empty">{t('queue.emptyFriendly')}</p>`.
- **Leading space in EN:** Retained as locked by CEO (`" Nothing here yet..."`).
- **ID copy:** Replaced literal translation with CEO's funny line including 🙈 emoji, fully owned by the i18n string.

## Test Coverage
- RED confirmed: 2 tests failed (EN assertion mismatch + missing ID test).
- GREEN after fix: 565 passed (+1 new ID test), 0 failed.
- Typecheck: zero errors.
- New test: `queue empty state renders Indonesian copy with monkey emoji when language is id`.

## Open Questions
- Icon convention revisit only if user base/locale count grows beyond current EN+ID scope.
