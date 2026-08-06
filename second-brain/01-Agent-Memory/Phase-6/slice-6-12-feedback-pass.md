# Slice 6.12 — CEO Visual Feedback Pass

## What Changed

- **Dark mode utilities fix**: Added `darkMode: ['class']` to `tailwind.config.js` so `dark:` prefixed Tailwind utilities activate under the `.dark` class strategy used by the theme store.
- **Panel ratios 20/20/60**: Updated `CommandCenterLayout.tsx` grid from `grid-cols-[20%_35%_45%]` to `grid-cols-[20%_20%_60%]`. Removed `border-r border-border` divider wrappers. Added `p-3 gap-3` to the layout container so three rounded cards float calmly on the background.
- **DropZone fills left panel**: `DropZonePanel.tsx` now uses `flex-1 h-full` with the drop card stretching full height (`flex-1` on inner FileDropZone). Hint text stays below.
- **Queue status redesign**: Removed Remove button entirely (and its i18n keys). During upload/processing: shadcn Spinner + thin progress bar. Completed: glossy green dot (`radial-gradient(circle at 35% 35%, #86efac, #16a34a)`) with tooltip. Failed: red dot (`radial-gradient(circle at 35% 35%, #fca5a5, #dc2626)`) with tooltip. Retry button retained for failed jobs.
- **Preview header centered**: Action header changed from `justify-end` to `justify-center` — Copy Markdown + Open Folder row always horizontally centered.
- **AGENTS.md surgery**: Updated locked panel ratio mention from 20/35/45 to 20/20/60 with CEO approval note.
- **i18n cleanup**: Removed `queue.remove` key from both `en.json` and `id.json`. Updated `resources.test.ts` accordingly.
- **shadcn Spinner installed**: Added `src/components/ui/spinner.tsx` (Loader2Icon wrapper).

## Key Decisions

- `darkMode: ['class']` matches the `.dark` class toggle pattern used by the preferences store (no provider needed since we control the class directly).
- Status dots use inline `radial-gradient` styles for the glossy 3D effect rather than Tailwind classes (Tailwind v3 doesn't support arbitrary radial-gradient in utility form without config extension).
- Remove button removed from MVP scope per CEO decision; `removeJob` action stays in Zustand store (no store architecture changes).
- Preview action header uses `justify-center` always (not conditional) per spec.

## Test Coverage

- Baseline: 410 tests → 413 tests (+3 new)
- New tests in `QueuePanel.test.tsx`:
  - `shows green status dot for completed jobs`
  - `shows red status dot for failed jobs`
  - `does not show status dot for pending jobs`
  - `shows spinner and progress bar during processing`
  - `shows spinner and progress bar during uploading`
  - `does not show progress bar for completed jobs`
- Removed tests: 3 old remove-button tests replaced with status-dot/spinner tests.
- All 27 test files pass. Typecheck clean. Build green.

## Open Questions

- None.

## PRD Delta (CEO approved 2026-08-07)

- Ratios changed from 20/35/45 to 20/20/60.
- Remove button removed from MVP scope.
- Earlier: thumbnail removed from queue rows.
- PRD v1.4 changelog pending.
