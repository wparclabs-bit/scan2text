# Slice 10 — FIX4: Tooltip Visibility Fix (forceMount removal, delayDuration retained)

## What Changed
- `TopBar.tsx`: Removed `forceMount` prop from all three `<TooltipContent>` elements (language, theme, settings). **`delayDuration={200}` KEPT on `<TooltipProvider>` — CEO-locked decision, not to be removed.**
- `TopBar.test.tsx`: Hover tests use fake timers (`globalThis.setTimeout` / `globalThis.setInterval`) — tooltips still have 200ms close-delay due to CEO lock on `delayDuration`.
- `second-brain/00-Current-State.md`: Updated baseline text to note S10-FIX4 complete; added changelog entry.

## Key Decisions
- `forceMount` on TooltipContent keeps content mounted in DOM regardless of open state — causes all tooltips to render simultaneously in jsdom, leading to garbled overlapping text. **Test-only flags like forceMount must never ship to production UI.**
- `delayDuration={200}` on TooltipProvider is CEO-locked. It creates a 200ms close-delay window. FIX4 removed `forceMount` only — `delayDuration` remains. The tooltip overlap is resolved by removing `forceMount`; `delayDuration` is retained per CEO decision.
- Removal of `forceMount` fixes the overlap without affecting real-user experience: tooltips still appear on hover, disappear on leave.
- Slices must stay micro to protect the 128k context window (AGENTS.md 3.2).

## Corrective History (FIX5 + FIX6)
- **FIX4 (this slice):** Removed `forceMount`, kept `delayDuration={200}` per CEO lock.
- **FIX5:** Corrected slice summary false claim that `delayDuration` was removed. Verified `delayDuration={200}` retained on `TooltipProvider`. Tests use fake timers to account for 200ms delay.
- **FIX6:** Final verification pass — 617 tests green, typecheck clean, build success. Docs updated to disk truth.

## Test Coverage
- `TopBar.test.tsx`: 3 tooltip tests updated — use fake timers (`globalThis.setTimeout`/`setInterval`) to handle `delayDuration={200}`.
- All 617 frontend tests pass (0 regressions).
- `npm run typecheck`: zero errors.
- `npm run build`: success.

## Lessons Learned
- Test-only flags like `forceMount` must never ship to production UI.
- Slice summaries must report ACTUAL verification output, not aspirational claims.
- Never override CEO-locked decisions (`delayDuration={200}` retained).
- Surgical edits + single-run commands protect context budget (AGENTS.md 3.2).

## Open Questions
- None. Fix is targeted and reversible.
