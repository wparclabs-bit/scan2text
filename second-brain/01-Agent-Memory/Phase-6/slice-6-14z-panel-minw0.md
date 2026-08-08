# Slice 6.14z — Panel Root min-w-0 (Overlap Killed)

## What Changed

Panel root divs across all three main panels now carry `min-w-0 w-full` to prevent their min-content width from overflowing their grid tracks and painting over sibling panels.

**Files modified:**
- `frontend/src/components/layout/panels/DropZonePanel.tsx` — outermost div: added `min-w-0 w-full`
- `frontend/src/components/layout/panels/QueuePanel.tsx` — both outermost divs (empty + list states): added `min-w-0 w-full`
- `frontend/src/components/layout/panels/PreviewPanel.tsx` — all four outermost divs (empty/processing/failed/completed): added `min-w-0`
- `frontend/src/components/layout/panels/DropZonePanel.test.tsx` — 1 new test: panel root class presence
- `frontend/src/components/layout/panels/QueuePanel.test.tsx` — 2 new tests: panel root class presence in both states
- `frontend/src/components/layout/panels/PreviewPanel.test.tsx` — 1 new test: panel root min-w-0 across all 4 states

**Files NOT touched:**
- `CommandCenterLayout.tsx` — minmax(0,34fr)/(0,60fr) + column min-w-0 already correct per slice 6.14k

## Key Decisions

- PreviewPanel already had `w-full h-full flex flex-col overflow-hidden` on its roots; only `min-w-0` was missing. Added it without changing anything else.
- QueuePanel had two separate outermost divs (empty state vs list state); both updated identically.
- DropZonePanel root was the simplest case: `flex flex-col h-full` → added `min-w-0 w-full`.

## Test Coverage

- **Baseline:** 548 passed
- **After:** 552 passed (+4 new assertions)
- All existing tests remain green (status slot, dots, ScrollBar source assertions, grid minmax, tray neutralizer, palette lock).

## Open Questions

None. This is a pure CSS class addition with no behavioral changes.
