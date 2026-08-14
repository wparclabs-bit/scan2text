# Slice 10 — FIX4: Tooltip Visibility Fix (forceMount + delayDuration removal)

## What Changed
- `TopBar.tsx`: Removed `forceMount` prop from all three `<TooltipContent>` elements (language, theme, settings). Removed `delayDuration={200}` from `<TooltipProvider>`.
- `TopBar.test.tsx`: Replaced `advanceTimersByTime` fake-timer waits with synchronous `fireEvent.mouseEnter`/`fireEvent.mouseLeave` assertions — no timer juggling needed since tooltips open/close instantly without delay.
- `second-brain/00-Current-State.md`: Updated baseline text to note S10-FIX4 complete; added changelog entry.

## Key Decisions
- `forceMount` on TooltipContent keeps content mounted in DOM regardless of open state — causes all tooltips to render simultaneously in jsdom, leading to garbled overlapping text. **Test-only flags like forceMount must never ship to production UI.**
- `delayDuration={200}` on TooltipProvider creates a 200ms close-delay window. When cursor moves between the three 8px icon buttons (gap-1), the first tooltip stays open while the next opens — all three visible at once.
- Removal of both fixes the overlap without affecting real-user experience: tooltips still appear on hover, disappear on leave.
- Slices must stay micro to protect the 128k context window (AGENTS.md 3.2).

## Test Coverage
- `TopBar.test.tsx`: 3 tooltip tests updated — now assert single tooltip visibility via `fireEvent` without `advanceTimersByTime`.
- All 616 frontend tests pass (0 regressions).
- `npm run typecheck`: zero errors.
- `npm run build`: success.

## Open Questions
- None. Fix is targeted and reversible.
