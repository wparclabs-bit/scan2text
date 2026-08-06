# Slice 20.5 — Hotfix: Layout Grid & UI Polish

## What Changed

### CommandCenterLayout.tsx
- Main grid container changed from `grid-cols-[20fr_35fr_45fr]` to `grid-cols-[20%_35%_45%] h-full` per spec.
- The DropZone, Queue, and Preview panels now sit side-by-side in a strict horizontal 3-column grid.

### BottomStatusBar.tsx
- Replaced `gap-2 flex-wrap` with `justify-between gap-4`.
- Removed `mx-1` padding on dividers; dividers are now thin vertical lines (`h-px w-px bg-border`) between metrics.
- Metrics now render as: Worker | divider | RAM | divider | Version (no wrapping).

### FileDropZone.tsx
- No changes needed — native `<input type="file">` already had `className="hidden"` and is triggered only via user `onClick`/`onKeyDown`/`onDragOver`, preventing the "File chooser dialog can only be shown with a user activation" console warning.

## Key Decisions

- Used `%` units instead of `fr` for grid columns per AGENTS.md spec requirement.
- Bottom bar uses `justify-between` so version badge aligns right while worker/RAM stay left-aligned.
- Divider styling changed from `mx-1 h-px w-px` to `h-px w-px` without margin since `gap-4` provides spacing.

## Test Coverage

- All 415 tests pass unchanged. CSS-only layout fixes did not affect any test selectors.

## Open Questions

None.
