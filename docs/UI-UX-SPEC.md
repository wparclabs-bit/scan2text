# UI/UX Specification — Scan2Text Command Center v1.7

## 1. Purpose + Authority

This document is the canonical UI/UX specification for Scan2Text's Command Center shell. It expands and supersedes the layout mechanics described in AGENTS.md sections 5–6. Where this spec and AGENTS.md disagree, this spec is authoritative for layout and visual decisions; AGENTS.md remains the source of truth for engineering rules, paths, and commands.

**Authority chain:** CEO taste overrides PRD → this spec → AGENTS.md section 5–6 → all other documentation.

**Acceptance protocol:** Layout acceptance is CEO screenshot via `npm run tauri dev`. jsdom Vitest asserts `className` and source only — never computed pixels. A test suite passing does NOT mean layout is done. CEO visual sign-off is required before any slice claiming layout work is marked COMPLETE.

## 2. Shell and Grid Geometry

The entire application is a fixed kiosk shell. The viewport is the only sizing authority; there is no window scroll and no body scroll.

### Shell
```
fixed inset-0 flex flex-col overflow-hidden
```

### TopBar (34px, shrink-0)
- LEFT: logo chip only
- CENTER: brand image `text.png` 153×34 `alt="Scan2Text"` + static CSS radial glow
- RIGHT: icon-only theme / language / settings with translated tooltips

### Main Area
```
flex-1 min-h-0 mt-[1vh] min-w-0
grid grid-cols-[minmax(0,34fr)_minmax(0,60fr)] gap-[2%]
```

- Left column (`34fr`): `grid-rows [minmax(0,38fr)_minmax(0,62fr)]` → Dropzone / Queue
- Right column (`60fr`): Preview (full-width read-only Markdown, internal scroll)
- `min-w-0` on columns AND panel roots
- 1vh vertical gutter between TopBar and Main (CEO delta 2026-08-08)

### BottomBar (shrink-0)
```
grid grid-cols-[1fr_auto_1fr]
```
- LEFT: empty
- CENTER: Worker Idle/Busy · RAM "—" (until GET /health) · version
- RIGHT: icon-only Share (placeholder `https://placeholder.local`, click = soft toast, no navigation)

### Min-size rule
`min-w-0` AND `min-h-0` on every track, column, and panel root. This prevents content from forcing panel resize.

## 3. Flex Height Chain Rule

`flex-1` stretches a child to fill its parent **only when every ancestor up to the sizing authority is a flex container with real height**. If any link in the chain breaks (e.g., a parent is `display:block` with no explicit height, or `min-h:auto`), the child becomes content-sized and the dashed box collapses.

### Fill-the-card checklist
Before declaring a component fills its card, verify:

1. **Shell** is `fixed inset-0 flex flex-col overflow-hidden` ✓
2. **TopBar** is `shrink-0` with explicit height (34px) ✓
3. **Main** has `flex-1 min-h-0` ✓
4. **Column track** uses `minmax(0,fr)` (not `auto`) ✓
5. **Panel root** has `flex-1 min-h-0 min-w-0` ✓
6. **Inner container** has `flex-1 min-h-0` ✓
7. **Target element** has `flex-1 min-h-0` ✓

**One broken link = content-sized box.** The dropzone regression was caused by a missing `min-h-0` somewhere in this chain.

## 4. Dropzone Spec

The dropzone is the left-top panel. It must fill the card from below the title to above the footer.

### Root element
```
flex flex-col h-full min-h-0 min-w-0 w-full
```

### Inner dashed container
```
h-full flex-1 rounded-xl overflow-hidden flex flex-col min-h-0 min-w-0 box-border
```

### Content area (between title and footer)
```
relative z-10 flex-1 min-h-0 flex flex-col gap-1 px-4 pt-1 pb-1
```

### Background
- Image: `bacground-left-top-panel.jpg`
- Opacity: 15%
- `background-size: 100%`
- Position: centered
- Repeat: no-repeat
- `pointer-events: none`

### Typography
- Header and footer text: bold, ink color `#1F150C`
- Footer text: "max 10 files per batch"

### Gap
- `gap-1` (~4px) between title and content area (inside content div), and between content div and footer (on inner dashed container). Horizontal padding: `px-4`. Vertical margins: `pt-1 pb-1` on content div.

### Scroll
- **NO ScrollArea** in the dropzone. Native overflow is acceptable if content overflows.

## 5. Scroll and Overflow Spec

### Queue Panel
- Internal scroll (content overflows within panel)
- Always-visible warm scrollbar (thin, rounded)
- Mounted via `<ScrollBar/>` component (Radix hides native scrollbars)

### Preview Panel
- Internal scroll (read-only Markdown)
- **Native warm scrollbar** — always visible, thin, rounded
- Class: `scrollbar-warm` (or equivalent Tailwind utility)

### Per-block horizontal scroll (1B rule)
- Tables and code blocks get `overflow-x-auto` wrappers
- Wrapper has `data-testid="md-table-scroll"`
- This applies to rendered Markdown output, NOT to source text
- Text content never shifts sideways

### break-words BANNED
- `break-words` is banned on preview article elements
- Use `overflow-x-auto` wrappers for wide content instead
- Text wraps naturally; tables/code scroll horizontally

## 6. Palette Reference

### Dark Theme (default)
| Element | Color |
|---|---|
| Background | `#080502` |
| Dropzone | `#E1DCC9` (ink `#1F150C`) |
| Queue | `#412D15` (cream `#F2EBDD`) |
| Preview | `#1F150C` (cream) |
| Accent | `#E3A55F` |
| Border | `#3B2A18` |

### Light Theme
| Element | Color |
|---|---|
| Background | `#F9F8F6` |
| Surface variants | `#EFE9E3` / `#D9CFC7` / `#C9B59C` |
| Foreground (all) | `#1F150C` |
| Border | `#1F150C` |
| Accent | `#92400E` |

### Depth Shadows
- **Dark:** `0 12px 32px -12px rgba(0,0,0,0.7)` + warm radial glow
- **Light:** `0 12px 32px -14px rgba(31,21,12,0.28)` + white top-highlight
- No flat cards, no borders, no purple

### Scrollbars
- Always-visible, thin, rounded, warm tone
- Queue + Preview only

## 7. Recurring Regression Anti-Patterns

### Radix measurement traps
- Radix ScrollArea viewport child is `display:table` → neutralize with CSS override:
  ```css
  [data-radix-scroll-area-viewport] > div { display:block; min-width:0; height:auto }
  ```
- Radix hides native scrollbars → always mount `<ScrollBar/>` for wheel-only UX

### break-words soup
- Adding `break-words` to fix overflow looks like a fix but silently shifts text layout
- Use `overflow-x-auto` wrappers with `data-testid="md-table-scroll"` instead
- `break-words` is banned on preview article elements

### jsdom layout blindness
- jsdom does NO layout math — it cannot compute flex stretch or grid fractions
- Assert `className` and source, NOT computed pixels
- CEO screenshot via `npm run tauri dev` is the only layout acceptance test

### Content-sized containers
- `min-width:auto` or `min-height:auto` at any grid/flex level breaks the shrink chain
- Use `minmax(0,fr)` for tracks and `min-w-0`/`min-h-0` on every child
- Content-sized containers make siblings grow unexpectedly

### Dev-only plumbing differences
- Dev Vite proxy unified to production backend port (47351) — no separate dev port
- Port 47351 is the locked contract port; dev and prod both use 47351
- Always verify which port a request actually hits

## 8. Acceptance Protocol

### Targeted className assertions (RED/GREEN)
During implementation, assert `className` strings on key elements:
- Dropzone root: `flex flex-col h-full min-h-0 min-w-0 w-full`
- Inner dashed: `flex-1 min-h-0`
- Content area: `flex-1 min-h-0 gap-1 px-4 pt-1 pb-1`
- Scrollbar wrappers: `data-testid="md-table-scroll"`

These are fast, deterministic, and jsdom-safe.

### Full suite gate
Before marking any slice COMPLETE:
1. `npm run test` — all tests passing (record new baseline count)
2. `npm run typecheck` — zero errors
3. `npm run build` — success

### Layout acceptance
- **CEO screenshot via `npm run tauri dev`** is required for any layout-critical change
- Never claim layout is done from tests alone
- CEO red-rectangle = spec; CEO screenshot = acceptance

### i18n gate
- New UI strings must appear in BOTH `src/locales/en.json` AND `src/locales/id.json`
- Brand image `alt="Scan2Text"` is the only i18n-exempt element
