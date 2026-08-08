# Slice 6.16b — Shell Vertical Shrink Chain + Drag-Over Highlight + Glow + 1vh Gutter

## What Changed

### Vertical Shrink Chain (Issue 1.5: BottomBar not visible at very short windows)
- `CommandCenterLayout.tsx`: main gains `mt-[1vh]` for TopBar gutter
- `DropZonePanel.tsx`: root div gains `min-h-0`
- `QueuePanel.tsx`: both root divs (empty + populated states) gain `min-h-0`
- `PreviewPanel.tsx`: all four root divs (empty/processing/failed/completed) gain `min-h-0`

Root cause: panel roots used `h-full` without `min-h-0`. At very short window heights, `h-full` collapses because the parent flex chain lacks a proper shrink constraint. The vertical twin of the 6.14z `min-w-0` fix.

### Drag-Over Highlight (Issue 4.6: dropzone drag-over highlight never triggers)
- `FileDropZone.tsx`: replaced boolean `state` with `dragCount` counter (enter +1 / leave -1, clamp 0)
- Added `onDragEnter` handler (was missing — only `onDragOver`/`onDragLeave` existed)
- `onDragOver` now only calls `preventDefault`/`stopPropagation` (no state mutation)
- `onDragLeave` decrements counter instead of resetting to idle (fixes flicker on child element traversal)
- `onDrop` resets counter to 0
- Highlight class changed from `border-primary bg-primary/10` to `ring-2 ring-accent/60 border-accent bg-[rgba(227,165,95,0.08)]`
- `data-state` value changed from `"drag-over"` to `"drag"`
- Removed dead `state === 'error'` branch (never set in component)

Root cause: no `onDragEnter` handler meant the counter never incremented on entry; `onDragLeave` immediately reset to idle causing flicker when hovering child elements.

### Brand Glow (Issue 2.3: brand glow too faint to see)
- `TopBar.tsx`: added `<div data-testid="brand-glow">` behind brand image
- Dark theme: `radial-gradient(ellipse 60% 120% at center, rgba(227,165,95,0.28) 0%, rgba(227,165,95,0.08) 50%, transparent 72%)`
- Light theme: `radial-gradient(ellipse 60% 120% at center, rgba(146,64,14,0.18) 0%, rgba(146,64,14,0.06) 50%, transparent 72%)`
- CSS-only, zero CPU, no animation

Root cause: no glow element existed at all in TopBar.

### 1vh Gutter (CEO delta 2026-08-08)
- `CommandCenterLayout.tsx`: main gains `mt-[1vh]` class
- No new DOM node; uses existing margin utility

## Key Decisions
- Drag counter semantics (not boolean) to handle nested element traversal without flicker
- Warm accent colors (#E3A55F ring + tinted bg) for drag highlight per coffee palette
- Glow is a separate positioned div behind the brand image, not a CSS pseudo-element (testable via data-testid)
- 1vh gutter applied as `mt-[1vh]` on main rather than padding on TopBar bottom (cleaner separation of concerns)
- Panel root `min-h-0` added alongside existing `h-full` — both are needed: `h-full` for normal sizing, `min-h-0` for shrink behavior

## Test Coverage
- `FileDropZone.test.tsx`: +4 tests (dragEnter highlight, drag counter double-enter/double-leave, dragOver preventDefault, updated dragOver → dragEnter state test)
- `CommandCenterLayout.test.tsx`: +4 tests (left-column min-h-0, panel-dropzone min-h-0, panel-queue min-h-0, panel-preview min-h-0, main 1vh gutter)
- `TopBar.test.tsx`: +2 tests (brand-glow element exists, radial-gradient style in dark theme)
- Total: 554 → 564 (+10)

## Open Questions
- None. All CEO-approved deltas implemented. Awaiting CEO re-run of manual QA script.
