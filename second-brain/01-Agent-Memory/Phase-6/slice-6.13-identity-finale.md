# Slice 6.13: Identity Finale + Vite __dirname Fix

## What Changed

### Part 1 — Top Bar Identity
- Replaced plain `<h1>` title in TopBar with a logo pictogram chip (`logo.png`) + live-text wordmark ("scan" + accent "2" + "text")
- DEMO badge retains amber styling with updated `data-testid="topbar-demo-badge"`
- Logo chip has `aria-label` for accessibility
- Wordmark uses `font-display` class; accent digit uses `text-accent` theme token

### Part 2 — Static Radiant Rays (Center Panel)
- Added static SVG decorative element in center panel only, behind QueuePanel content
- 12 warm-toned radial lines using `hsl(var(--accent))` at low opacity
- `pointer-events-none`, `aria-hidden="true"`, `data-state="static"`
- Zero CPU: pure static SVG markup, no animation, no timers, no requestAnimationFrame

### Part 3 — Settings Switch Locked
- Added locked demo mode switch row in SettingsDialog General section
- Custom `LockedSwitch` component: visual toggle with `aria-disabled="true"`, reduced opacity, cursor-not-allowed
- 🔒 lock emoji indicator with `title` tooltip using i18n key
- No state persistence, no localStorage, no backend calls

### Part 4 — Vite __dirname Fix
- Replaced `__dirname` with `import.meta.dirname` in both `vite.config.ts` and `vite.test.config.ts`
- Eliminates Vite config warning during test runs

## Key Decisions

- **Logo import**: `import logoUrl from '../../../Images/logo.png'` resolves correctly via Vite asset pipeline
- **Wordmark casing**: i18n values are lowercase ("scan", "2", "text") matching brand identity; App.test.tsx updated to use `textContent` assertion instead of `getByText('Scan2Text')`
- **Radiant rays placement**: Wrapped center grid child in `relative` container; rays div is `absolute inset-0` behind a new inner `relative` wrapper holding QueuePanel
- **Switch primitive**: No shadcn Switch existed; built minimal CSS-only toggle with Tailwind classes rather than adding a dependency
- **i18n merge**: Added keys to both en.json and id.json; updated test-setup.ts with matching translations

## Test Coverage

- **Baseline**: 442 passing
- **After slice**: 459 passing (+17 new tests)
- New TopBar tests (7): logo chip, logo.png source, wordmark, accent digit, DEMO badge, font-display class, aria-label
- New CommandCenterLayout tests (6): radiant rays presence, single instance, aria-hidden, pointer-events-none, data-state="static", no animate classes
- New SettingsDialog tests (4): locked switch presence, aria-disabled, lock indicator, accessible title
- Fixed App.test.tsx (2): updated title assertions to use `textContent` for split wordmark

## Open Questions

- None. All validation gates green (tests, typecheck, build).
