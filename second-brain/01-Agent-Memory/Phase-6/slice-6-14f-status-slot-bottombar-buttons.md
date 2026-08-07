# Slice 6.14f — Status Slot + BottomBar Pin + Preview Buttons + DropZone Fill

**Date:** 2026-08-07
**Commit:** 930b794
**Baseline:** 543 tests
**Final:** 552 tests (+9)

## What Changed

### QueuePanel — Fixed Status Slot
- Added a fixed ~14px wide `data-testid="queue-item-status-slot"` div after the filename/size block in every queue row.
- Slot content by status:
  - **pending:** warm grey dot (#A8A29E dark / #78716C light) with translated tooltip
  - **uploading/processing:** bright yellow Spinner (#FACC15) with translated tooltip + thin progress bar retained below metadata
  - **completed:** glossy green radial-gradient dot (#86EFAC→#16A34A→#14532D) with tooltip
  - **failed:** glossy red radial-gradient dot (#FCA5A5→#DC2626→#7F1D1D) with tooltip + retry button retained
- Removed visible text label span for pending/uploading/processing statuses (was `data-testid="queue-item-status"`).
- Dot-only in slot; no text content inside the slot element.

### BottomStatusBar — Pinned + Centered
- Footer gets `shrink-0` class for pinned layout.
- Inner layout changed from `flex justify-between` to `grid grid-cols-[1fr_auto_1fr] items-center` so Worker/RAM/Version is truly centered both horizontally and vertically.
- Share button moved into right grid zone with `justify-end`.

### CommandCenterLayout — Shell Structure Fix
- Added `min-h-0` to `<main>` to prevent flex overflow at narrow window heights.
- TopBar implicitly shrink-0 via flex-col parent; BottomBar explicitly shrink-0.

### DropZonePanel — Dashed Area Fill
- Inner flex container: `flex flex-col gap-3 p-4 h-full` (removed `justify-center`).
- Header text: `shrink-0`.
- FileDropZone receives `className="flex-1 min-h-0 w-full"` prop so it fills between header and hint.
- FileDropZone accepts optional `className` prop and spreads it onto the root div.

### PreviewPanel — Borderless Buttons
- Copy Markdown and Open Folder buttons changed from `bg-primary/text-primary-foreground` and `bg-secondary/text-secondary-foreground` to `border-none bg-transparent`.
- Hover state: `hover:bg-[rgba(227,165,95,0.12)] hover:text-[#E3A55F]` (caramel tint).
- Focus-visible ring: `focus-visible:ring-2 focus-visible:ring-accent/50`.

## Test Coverage

### New Tests (+9)
1. QueuePanel: grey status dot for pending jobs (computed color rgb(168,162,158))
2. QueuePanel: fixed status slot always present with w-[14px] + shrink-0 classes
3. QueuePanel: processing row shows yellow spinner in status slot
4. QueuePanel: no visible text label in status slot for any status (pending/uploading/processing/completed/failed)
5. CommandCenterLayout: shell is h-screen flex flex-col
6. CommandCenterLayout: main has min-h-0
7. CommandCenterLayout: bottom bar has shrink-0
8. CommandCenterLayout: bottom bar contains grid-cols layout
9. CommandCenterLayout: bottom bar items vertically centered with flex items-center
10. DropZonePanel: dashed upload area has flex-1 class
11. PreviewPanel: copy button borderless + transparent bg
12. PreviewPanel: open folder button borderless + transparent bg
13. PreviewPanel: both header buttons are real <button> elements with translated labels
14. BottomStatusBar (new file): 6 structural tests (shrink-0, flex items-center, grid-cols, share button, worker label, version string)

### Updated Tests
- QueuePanel: "does not show status dot for pending jobs" → "shows grey status dot for pending jobs"

### Regression Tests Verified
- Card gradients (all three panels)
- BG image 15% opacity
- Queue internal scroll + warm scrollbar
- Viewport lock (h-screen, overflow-hidden)
- File type icons (image/pdf)
- Progress bar for processing jobs
- Retry button for failed jobs
- Theme toggle class flip

## Open Questions
- None. All slice requirements met.
