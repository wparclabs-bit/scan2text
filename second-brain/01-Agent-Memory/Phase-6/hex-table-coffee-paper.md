# CEO Locked Palette — Hex Table (Final Depth Values)

> Single source of truth for palette tuning. Last updated: 2026-08-07 (Slice 6.12e).

## Dark Theme

| Token | Top Stop | Base Stop | Foreground | Shadow |
|-------|----------|-----------|------------|--------|
| Background | — | `#080502` | `#F2EBDD` | — |
| Surface Left | `#EDE8D8` | `#E1DCC9` | `#1F150C` | `0 12px 32px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)` |
| Surface Center | `#4D3619` | `#412D15` | `#F2EBDD` | `0 12px 32px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)` |
| Surface Right | `#2A1C10` | `#1F150C` | `#F2EBDD` | `0 12px 32px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)` |
| Surface Action | `#2A1C10` | `#1F150C` | — | `0 12px 32px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)` |
| Border | — | `#3B2A18` | — | — |
| Accent | — | `#E3A55F` | `#1F150C` | — |
| Warm Glow (dark-only) | `rgba(227,165,95,0.07)` at `85% -10%` → transparent | — | — | — |

## Light Theme

| Token | Top Stop | Base Stop | Foreground | Shadow |
|-------|----------|-----------|------------|--------|
| Background | — | `#F9F8F6` | `#1F150C` | — |
| Surface Left | `#F7F2EC` | `#EFE9E3` | `#1F150C` | `0 12px 32px -14px rgba(31,21,12,0.28), inset 0 1px 0 rgba(255,255,255,0.65)` |
| Surface Center | `#E2D9D0` | `#D9CFC7` | `#1F150C` | `0 12px 32px -14px rgba(31,21,12,0.28), inset 0 1px 0 rgba(255,255,255,0.65)` |
| Surface Right | `#D2BFA8` | `#C9B59C` | `#1F150C` | `0 12px 32px -14px rgba(31,21,12,0.28), inset 0 1px 0 rgba(255,255,255,0.65)` |
| Surface Action | `#F2EEE8` | `#EFE9E3` | — | `0 12px 32px -14px rgba(31,21,12,0.28), inset 0 1px 0 rgba(255,255,255,0.65)` |
| Border | — | `#1F150C` | — | — |
| Accent | — | `#92400E` | `#F9F8F6` | — |

## Notes

- All surface gradients are vertical (`to bottom`): lighter top stop → darker base stop (~12% lightness delta).
- No borders on the three main panel cards (both themes). Dashed drop-target border and bar hairlines retained.
- Purple (`#aa3bff`, `#c084fc`) retired everywhere.
- Warm radial glow is dark-only: second `background-image` layer on `.dark .surface-*`.
