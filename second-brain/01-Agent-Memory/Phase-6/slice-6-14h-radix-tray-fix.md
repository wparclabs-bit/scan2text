# Slice 6.14h — Radix Tray Fix + Dropzone Fill + 10-File Rule

## What Changed

- **CSS override** appended to `frontend/src/index.css`: neutralizes Radix ScrollArea's hidden `display:table` wrapper div that defeats `min-w-0` truncation and percentage heights.
- **DropZonePanel.tsx**: `ScrollArea` component removed entirely. Panel no longer scrolls — content fills via flex layout. Header now has `data-testid="dropzone-header"`.
- **DropZonePanel.test.tsx**: header test updated from querying `dropzone-scroll-area` to `screen.getByTestId('dropzone-header')`.
- **ScrollAreas.test.tsx**: replaced dead `dropzone-scroll-area` assertion with two live assertions (`dropzone-header`, `dropzone-hint`).
- **i18n (en.json + id.json)**: `dropzone.hint` updated to include "max 10 files per batch"; new key `dropzone.maxFilesWarning` added in both languages.
- **FileDropZone.tsx**: after type+size validation, if more than 10 valid files remain, keeps first 10, fires `dropzone.maxFilesWarning` toast, logs skipped filenames to console.
- **FileDropZone.toast.test.tsx**: new test — dropping 12 valid files creates exactly 10 jobs + fires max-files warning toast.
- **test-setup.ts**: added `dropzone` keys to both en and id i18n resource blocks.

## Key Decisions

- CSS override uses `!important` on `display: block`, `min-width: 0`, `height: auto` for `[data-radix-scroll-area-viewport] > div` — safe because it only affects Radix's internal wrapper, not user-facing elements.
- DropZonePanel ScrollArea removal is intentional: this panel has fixed header + flexible dropzone + fixed hint; no content overflows.
- 10-file cap enforced at the UI layer (FileDropZone), not the store layer, keeping validation co-located with user interaction.
- Skipped file info logged as filename + byte count only (never content), per privacy rule.

## Test Coverage

- Baseline: 549 tests (33 files)
- After slice: 551 tests (33 files) — +2 (new max-files toast test + ScrollAreas refactor kept same count)
- All green. Typecheck zero errors. Build success.

## Open Questions

- None. Radix ScrollArea CSS override is a global fix that benefits any future ScrollArea usage.
