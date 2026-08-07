# Slice 6.14k — True 34/60 Widths + Always-Visible Warm Scrollbars

## What Changed

### CommandCenterLayout.tsx
- Main grid tracks changed from `grid-cols-[34fr_60fr]` to `grid-cols-[minmax(0,34fr)_minmax(0,60fr)]`
- Left column div gained `min-w-0` class
- Preview column div gained `min-w-0` class
- These prevent long filenames from stretching the left column and ensure proper flex shrink behavior

### QueuePanel.tsx
- Imported `ScrollBar` alongside `ScrollArea` from `@/components/ui/scroll-area`
- Removed inner `<div className="min-h-0 overflow-y-auto">` wrapper that was double-scrolling
- Job rows are now direct children of `ScrollArea`
- Added `<ScrollBar orientation="vertical" />` as last child inside ScrollArea

### PreviewPanel.tsx
- Imported `ScrollBar` alongside `ScrollArea` from `@/components/ui/scroll-area`
- Added `<ScrollBar orientation="vertical" />` as last child inside ScrollArea
- No inner overflow wrapper to remove (PreviewPanel never had one)

### index.css
- Appended always-visible warm scrollbar styles targeting Radix ScrollArea DOM
- Dark mode thumb: `#E3A55F` (caramel)
- Light mode thumb: `#92400E` (coffee) — selector: `:not(.dark)`
- Track: 8px wide, transparent background, opacity/visibility forced to 1
- Thumb: 9999px border-radius (pill shape)

### Tests Updated
- **CommandCenterLayout.test.tsx**: Added assertions for `grid-cols-[minmax(0,34fr)_minmax(0,60fr)]`, `min-w-0` on both columns
- **QueuePanel.test.tsx**: Replaced old "viewport has overflow-y auto" test with two new tests:
  - Renders 12 jobs and verifies all items present + source contains ScrollBar import/usage
  - Verifies NO descendant div with `overflow-y-auto` class remains
- **PreviewPanel.test.tsx**: Added ScrollBar presence test (source-level assertion)
- **App.test.tsx**: Updated grid class expectation from `grid-cols-[34fr_60fr]` to `grid-cols-[minmax(0,34fr)_minmax(0,60fr)]`

## Key Decisions

1. **Radix scrollbar DOM attributes**: Radix uses `data-orientation="vertical"` and `data-state="visible|hidden"`, NOT `data-radix-scroll-area-scrollbar`. CSS and tests must target the correct attributes.

2. **jsdom overflow limitation**: jsdom does no layout math, so Radix's Presence component never mounts scrollbars in tests (no overflow detected). Tests use source-level assertions instead of DOM-level scrollbar presence checks.

3. **Light theme selector**: App uses `.dark` class toggling. Light mode is the default (no class). Selector: `:not(.dark)`.

4. **Inner wrapper removal**: The `<div className="min-h-0 overflow-y-auto">` wrapper in QueuePanel was causing double-scrolling (Radix viewport + inner div both scrolling). Removing it lets the Radix viewport be the sole scroller.

## Test Coverage

- Baseline: 544 tests
- After slice: 548 tests (+4 new)
- All 548 passing, typecheck green, build green

## Open Questions

None.
