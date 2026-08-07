# Slice 6.12b — Alignment, Gradient Surfaces, Light-Mode Fix

## What Changed

- **Light-mode bug fix**: Removed `@media (prefers-color-scheme: dark)` block from `src/index.css`. This media query was overriding `:root` CSS variables with dark values when the system was in dark mode. Toggling to light removed the `.dark` class but the media-query-set `:root` values remained dark, making light mode non-functional.
- **Per-panel gradient surfaces**: Added four CSS classes to `src/index.css` — `.surface-left`, `.surface-center`, `.surface-right`, `.surface-action` — each with a `.dark` variant. Subtle linear-gradient(135deg) sheen (lighter top-left fading to base).
- **Panel alignment**: Wrapped all three panels in `<div className="h-full">` inside `CommandCenterLayout` grid cells so cards share identical top/bottom edges.
- **DropZone card**: Moved hint text inside the card div pinned at bottom (`mt-auto`, `border-t`). Made click label bigger and bold (`text-base font-display font-semibold`).
- **Action buttons**: Preview action header now uses `.surface-action` background class.

## Key Decisions

- Neutral gray/black surfaces only — no purple in panel backgrounds. Purple remains accent-only (--primary/--accent).
- Gradient direction: 135deg (top-left to bottom-right) for consistent sheen across all surfaces.
- Light mode swaps left/right surface values relative to dark mode (left gets darker, right gets lighter).
- i18n keys added: `dropzone.clickLabel`, `dropzone.dropLabel` (both en.json and id.json).

## Surface Hex Values (per theme)

| Token | Dark Mode Gradient | Light Mode Gradient |
|-------|-------------------|---------------------|
| surface-left | `#2e2e34 → #27272a` | `#e4e4e7 → #d4d4d8` |
| surface-center | `#1e1e22 → #18181b` | `#d4d4d8 → #c4c4cc` |
| surface-right | `#111114 → #0a0a0c` | `#c4c4cc → #b4b4be` |
| surface-action | `#1e1e22 → #18181b` | `#f0f0f3 → #e4e4e7` |

## Test Coverage

- New regression test in `preferencesStore.test.ts`: verifies `.dark` class flips on toggle and theme state updates correctly.
- All 414 tests passing (baseline 413 + 1 new).
- typecheck: zero errors. build: success.

## Open Questions

- CEO to confirm light-mode left/right swap is visually correct (current: left=darkest, right=lighter in light mode).
- Panel dividers between the three main panels were removed in slice 6.12; may need re-adding as subtle borders or gaps.
