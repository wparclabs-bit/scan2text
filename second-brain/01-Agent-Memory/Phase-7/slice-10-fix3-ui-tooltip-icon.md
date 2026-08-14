# Slice 10: Fix3 UI Tooltip & Icon Centering

## What Changed
- **TopBar.tsx:93** — Fixed swapped ternary: `language === 'en'` now maps to `t('actions.langTooltipEn')` (target: Bahasa), not `t('actions.langTooltipId')`. Added `forceMount` to all 3 TooltipContent components for jsdom testability.
- **FileDropZone.tsx:125** — Fixed className merging: default centering classes (`w-full flex-1 flex flex-col items-center justify-center gap-2 p-4`) always emitted; prop `className` appended when truthy instead of replacing defaults.
- **TopBar.test.tsx** — Added react-i18next mock (for reliable `t()` resolution in tests), added 3 new tests: language-toggle data-testid, language tooltip en, language tooltip id.
- **FileDropZone.test.tsx** — Added 3 new tests: centering classes with prop className, gap-2/p-4 always, flex/w-full always.
- **test-setup.ts** — Added `langTooltipEn`/`langTooltipId` i18n keys to en and id resources.

## Key Decisions
- Used `forceMount` on Radix TooltipContent (v1.2.16 supports it) to make tooltips visible in jsdom for testing.
- Mocked `react-i18next` in TopBar.test.tsx to provide deterministic translation resolution (test-setup.ts i18next instance wasn't resolving in TopBar's `useTranslation()` due to react-i18next singleton behavior).
- Option D placement for dropzone icon: centered via flexbox defaults, layered above background art (DropZonePanel handles background).

## Test Coverage
- New tests: 6 (TopBar: 3, FileDropZone: 3)
- Total: 610 → 616 passed
- All test files: 38 passed

## Open Questions
- None. Both bugs fully resolved and tested.
