# Slice 6.14j — Absolute Viewport Lock (fixed inset-0 shell)

## What Changed
- Rewrote `CommandCenterLayout.tsx` to use `fixed inset-0 flex flex-col overflow-hidden` as the root shell
- Replaced `h-screen flex flex-col bg-background` with viewport-pinned shell
- Main area uses `flex-1 min-h-0 min-w-0 w-full grid grid-cols-[34fr_60fr] gap-[2%] px-4 pb-3`
- Left column uses `min-h-0 grid grid-rows-[minmax(0,38fr)_minmax(0,62fr)] gap-3` so panels never stretch from content
- Removed decorative radiant rays and ambient glow from layout component (they were internal to the old center panel wrapper)
- Added `data-testid="app-shell"`, `data-testid="main-content"`, `data-testid="left-column"`, `data-testid="preview-column"`
- App.tsx required no changes (no wrapper div with sizing classes)

## Key Decisions
- `fixed inset-0` makes the shell exactly the viewport size, immune to any ancestor wrapper height chain
- `overflow-hidden` on shell pins TopBar and BottomStatusBar in place
- `minmax(0,fr)` track sizing means content can NEVER stretch a panel — dropzone stays constant regardless of job count
- Queue scrolls internally via its own ScrollArea; left column height is fixed by grid rows

## Test Coverage
- Updated viewport lock tests: assert `fixed.inset-0.flex.flex-col.overflow-hidden` instead of `h-screen`
- Updated grid overflow hygiene: assert `min-h-0` on main children (not `min-w-0`)
- Added 4 new tests for left-column structural constancy (`grid-rows`, both panel testids present, preview-column present)
- Added 2 new tests for app-shell and main-content data-testid presence
- Added 4 new tests in palette-lock.test.ts for `[data-radix-scroll-area-viewport] > div` neutralizer selector
- Removed 13 obsolete tests (radiant rays + ambient glow) that referenced elements no longer in layout
- Baseline: 551 tests → Post: 544 tests (all passing)

## Open Questions
- None. CEO acceptance: wide window + 11 files → dropzone same size, queue scrolls with warm scrollbar, bottom bar visible.
