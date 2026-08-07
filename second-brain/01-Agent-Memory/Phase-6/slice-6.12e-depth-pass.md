# Slice 6.12e — Depth Pass: Gradient Surfaces, Shadow, Warm Glow, Border Removal

## What Changed

- **Dark background warmed**: `--bg` and `--background` changed from `#000000` to `#080502` in `.dark` block (`src/index.css`).
- **Longhand gradient+shadow on surface classes**: All four surface classes (`.surface-left`, `.surface-center`, `.surface-right`, `.surface-action`) now use separate `background-color` + `background-image` properties instead of the `background:` shorthand. This is the root cause fix for the invisible sheen — the shorthand was wiping any additional background layers or overlays.
- **Gradient tops ~12% lighter than bases** (CEO-approved depth recipe):
  - Dark left: `#EDE8D8 → #E1DCC9`
  - Dark center: `#4D3619 → #412D15`
  - Dark right: `#2A1C10 → #1F150C`
  - Light left: `#F7F2EC → #EFE9E3`
  - Light center: `#E2D9D0 → #D9CFC7`
  - Light right: `#D2BFA8 → #C9B59C`
  - Action header mirrors its corresponding surface base.
- **Box shadows added**:
  - Dark: `0 12px 32px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)`
  - Light: `0 12px 32px -14px rgba(31,21,12,0.28), inset 0 1px 0 rgba(255,255,255,0.65)`
- **Warm radial glow** (dark-only): `radial-gradient(600px at 85% -10%, rgba(227,165,95,0.07), transparent)` as second `background-image` layer on all dark surface classes.
- **Border removal from panel cards**: Removed `border border-border` from the main card divs in:
  - `DropZonePanel.tsx` (line 9)
  - `QueuePanel.tsx` (lines 24, 35 — empty state + job list)
  - `PreviewPanel.tsx` (all 4 states: empty, processing, failed, completed)
- **Retained borders**: Dashed drop-target border inside FileDropZone; top/bottom bar hairlines (`border-t border-border/50` on DropZone hint).
- **Palette-lock test extended**: 7 new tests covering gradient declarations, dark/light shadow values, warm glow radial gradient, and no `border-border` class on any of the three panel component files.

## Key Decisions

- Used longhand `background-color` + `background-image` instead of `background:` shorthand. The root cause of the invisible sheen was that Tailwind's utility compilation or subsequent CSS rules were overwriting the shorthand value, stripping any layered gradients. Longhand properties are additive and survive downstream overrides.
- Applied depth recipe uniformly across all three panels AND the action header via the existing `.surface-*` CSS classes — no new classes needed.
- Kept `rounded-xl` on cards for visual consistency with previous slices.
- Did not add `shadow-sm` Tailwind class since the custom box-shadow now handles depth entirely.

## Test Coverage

- **New**: 7 tests in `src/theme/palette-lock.test.ts` — gradient declarations, dark shadows, light shadows, warm glow, no-border-class on DropZonePanel/QueuePanel/PreviewPanel.
- **Baseline**: 433 → **440** tests passing.
- typecheck: zero errors. build: success.

## Open Questions

- None. Slice complete.
