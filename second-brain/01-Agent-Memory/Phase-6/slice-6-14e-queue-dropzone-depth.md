# Slice 6.14e — Queue Status Restore + Dropzone Taste + Card Depth + BottomBar Centering

## What Changed

### QueuePanel (frontend/src/components/layout/panels/QueuePanel.tsx)
- **Spinner color**: Changed from `text-primary` class to inline `style={{ color: '#FACC15' }}` for bright yellow during uploading/processing in both themes.
- **Status dots**: Green dot (completed) updated to full 3-stop glossy radial gradient: `radial-gradient(circle at 30% 30%, #86EFAC, #16A34A 60%, #14532D)`. Red dot (failed) updated to: `radial-gradient(circle at 30% 30%, #FCA5A5, #DC2626 60%, #7F1D1D)`. Both ~10px (w-2.5 h-2.5).
- **Tooltips**: Added `translate-y-[-2px]` className to TooltipContent for translated positioning.
- **Progress bar**: Thin fake progress bar retained under row metadata for active jobs.
- **Scroll viewport**: Inner div inside ScrollArea gets `min-h-0 overflow-y-auto` so rows scroll inside the card; ancestor overflow-hidden preserved.

### DropZonePanel (frontend/src/components/layout/panels/DropZonePanel.tsx)
- **Background opacity**: Reduced from 0.25 to 0.15.
- **Background size**: Changed from `'cover'` to `'100%'` (single-value, prevents distortion).
- **Header text**: Changed from `font-semibold text-foreground` to `font-bold text-[#1F150C]` for readable ink color in both themes.

### depthStyles.ts (frontend/src/lib/depthStyles.ts)
- Complete rewrite of per-panel depth recipes:
  - **Dark left** (#E1DCC9): `linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0) 40%, rgba(31,21,12,0.10))`; shadow: `inset 0 1px 0 rgba(255,255,255,0.4), 0 8px 20px rgba(0,0,0,0.35)`
  - **Dark center** (#412D15): `linear-gradient(180deg, rgba(227,165,95,0.18), rgba(0,0,0,0.25))`; shadow: `inset 0 1px 0 rgba(242,235,221,0.12), 0 10px 24px rgba(0,0,0,0.45)`
  - **Dark right** (#1F150C): `linear-gradient(180deg, rgba(227,165,95,0.10), rgba(0,0,0,0.30))`; shadow: `inset 0 1px 0 rgba(242,235,221,0.08), 0 10px 24px rgba(0,0,0,0.5)`
  - **Light panels**: Same structure with white top-highlight (0.5-0.6 alpha) + rgba(31,21,12,0.10-0.15) bottom fade + soft brown outer shadow.

### BottomStatusBar (frontend/src/components/layout/BottomStatusBar.tsx)
- Added `h-[36px] flex items-center` to footer for fixed-height vertical centering.
- Inner div changed to `w-full` for horizontal stretch.

## Test Coverage
- **Baseline**: 527 tests
- **Final**: 543 tests (+16 new)
- New tests added:
  - QueuePanel: yellow spinner, glossy green/red dot gradients, progress bar presence, viewport overflow-y, status dot tooltip class
  - DropZonePanel: bg opacity 0.15, single-value background-size, bold ink header
  - CommandCenterLayout: inline backgroundImage + boxShadow on all 3 cards
  - BottomStatusBar: fixed height + flex centering, w-full inner wrapper

## Key Decisions
1. Spinner color uses inline `style` prop instead of Tailwind class because jsdom doesn't resolve arbitrary value classes on SVG elements consistently.
2. Status dot gradients use rgb() in tests because jsdom converts hex to rgb in computed styles.
3. Depth recipes use per-panel lookup table instead of shared overlay logic for clearer intent and easier future tuning.
4. DropZone background-size uses single `'100%'` (not `'cover'`) to maintain aspect ratio per CEO spec.

## Open Questions
- None.

## Commit
- `e5f9f2f` — 6.14e queue status restore + dropzone taste + card depth + bottombar centering
