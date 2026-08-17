# S11-FIX28c — DynamicThemeTooltip

## What Changed
- `TopBar.tsx`: Fixed inverted ternary in theme-toggle tooltip (line 67). Dark mode now renders `t('actions.themeTooltipDark')` ("Switch to light mode"); light mode renders `t('actions.themeTooltipLight')` ("Switch to dark mode").
- `TopBar.test.tsx`: +2 tests — asserts tooltip content for dark theme (switch-to-light) and light theme (switch-to-dark).

## Key Decisions
- Reused existing i18n keys `actions.themeTooltipDark` / `actions.themeTooltipLight` from the `actions` namespace (no new keys needed — keys existed since S10-FIX3, only the ternary was inverted).
- No locale file changes required — keys already present in both en.json and id.json.
- TDD red-green: tests added first (RED confirmed on main), fix applied, GREEN confirmed.

## Test Coverage
- `theme tooltip shows switch-to-light string in dark theme` — sets `mockState.theme = 'dark'`, fires pointerEnter, asserts tooltip text includes "Switch to light mode".
- `theme tooltip shows switch-to-dark string in light theme` — sets `mockState.theme = 'light'`, fires pointerEnter, asserts tooltip text includes "Switch to dark mode".
- All 630 existing tests remain green.

## Open Questions
- None. Kitchen Sink QA 5.4 verified: tooltip is now dynamic and describes the TARGET theme on hover.
