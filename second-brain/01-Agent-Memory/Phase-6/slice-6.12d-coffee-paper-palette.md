# Slice 6.12d — Coffee-and-Paper Palette + Right Margin Fix

## What Changed

- **Right margin regression fix**: `CommandCenterLayout.tsx` grid changed from `grid-cols-[20%_20%_60%]` to `grid-cols-[2fr_2fr_6fr]`. Percentage-based columns plus CSS gap cause the total to exceed 100%, pushing the right card away from the window edge. `fr` units make the browser account for gaps automatically, giving identical left/right padding.
- **CEO locked palette applied** to `src/index.css`: purple retired everywhere. New "paper and coffee" warm identity:
  - Dark: bg `#000000`, surface-left `#E1DCC9` fg `#1F150C`, surface-center `#412D15` fg `#F2EBDD`, surface-right `#1F150C` fg `#F2EBDD`, border `#3B2A18`, accent `#E3A55F`
  - Light: bg `#F9F8F6`, surface-left `#EFE9E3`, surface-center `#D9CFC7`, surface-right `#C9B59C`, all fg `#1F150C`, border `#1F150C`, accent `#92400E`
- Per-surface foreground colors: left card uses ink (`#1F150C`) in dark mode; center/right use cream (`#F2EBDD`). Light mode: dark text everywhere.
- Vertical gradient sheen recomputed over new base colors (top stop ~7% lighter in dark, subtle white lift in light).
- TopBar/BottomStatusBar inherit theme background/foreground/border via shadcn tokens — no changes needed.
- `AGENTS.md` updated: purple retired, coffee-and-paper palette locked with full hex table.
- `tsconfig.app.json`: added `"node"` to types so palette-lock test can read CSS file.

## Key Decisions

- Used `fr` units instead of percentages for grid columns — this is the bulletproof fix because CSS Grid `gap` is subtracted from each column's share, unlike percentage columns where gap is additive.
- Kept legacy `:root` block (Vite template boilerplate) but updated its variables to match new palette since `color: var(--text)` and `background: var(--bg)` are still referenced.
- Per-surface text color implemented as direct `.dark .surface-* { color: ... }` rules rather than new CSS custom properties — minimal and explicit.
- Palette-lock test reads raw `index.css` via Node `fs` — catches accidental purple reintroduction.

## Test Coverage

- **New**: `src/theme/palette-lock.test.ts` — 13 tests asserting 6 hex values per theme + no purple remaining.
- **New**: `src/App.test.tsx` — layout regression test asserting `grid-cols-[2fr_2fr_6fr]`.
- **Baseline**: 419 → **433** tests passing.
- typecheck: zero errors. build: success.

## Open Questions

- None. Slice complete.
