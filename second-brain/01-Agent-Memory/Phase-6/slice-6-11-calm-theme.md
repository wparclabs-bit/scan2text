# Slice 6.11 — Calm Theme

## What Changed

- **index.css**: Replaced flat black surfaces with layered zinc tokens. Dark: `--background:#09090b`, `--card:#18181b`, `--border:#27272a`, `--foreground:#fafafa`. Light: `--background:#ffffff`, `--card:#fafafa`, `--border:#e4e4e7`, `--foreground:#09090b`. Purple locked: `--primary:#aa3bff` (light) / `--c084fc` (dark). Added `@font-face` for Quantico-Regular.ttf with `font-display:swap`. Added `--font-display` and `--font-body` CSS vars. Added swap-font comment block at top. Updated `--radius` to `0.75rem`.
- **tailwind.config.js**: Added `fontFamily.display` and `fontFamily.sans` extending theme with CSS var tokens.
- **TopBar.tsx**: Replaced text-label buttons with icon-only (Sun/Moon, Globe+EN/ID, Settings) wrapped in shadcn Tooltip with translated tooltip text. Preserved all data-testid attributes.
- **CommandCenterLayout.tsx**: Added `bg-background`, panel wrapper divs with `border-r border-border`, flex-col for card containers.
- **DropZonePanel.tsx**: Wrapped FileDropZone in `bg-card border border-border rounded-xl p-4 shadow-sm`.
- **QueuePanel.tsx**: Wrapped job list in `bg-card border border-border rounded-xl p-3 shadow-sm`. Queue empty state also card-styled.
- **PreviewPanel.tsx**: Wrapped entire preview in `bg-card border border-border rounded-xl shadow-sm`. Empty/processing/failed states also card-styled.
- **MarkdownPreview.tsx**: Added `prose-base`, `text-foreground`, `prose-headings:font-display`, `prose-a:text-primary` for visible headings and purple links.
- **BottomStatusBar.tsx**: Added `font-display` class to footer.
- **en.json / id.json**: Added 6 new i18n keys for tooltip text (theme toggle dark/light, language toggle EN/ID, settings).

## Key Decisions

- Kept existing CSS variable names; changed only values.
- Quantico @font-face src points to `/src/assets/fonts/Quantico-Regular.ttf` — Vite copies it to dist/assets during build.
- TooltipProvider wraps the entire TopBar with `delayDuration={200}` for smoother UX.
- Panel dividers use `border-r border-border` on wrapper divs (not on panels directly) to maintain 20/35/45 ratios.
- prose-headings:font-display ensures headings use Quantico without breaking other prose styles.

## Test Coverage

- Baseline: 410 tests. Final: 410/410 passing. Zero regressions.
- All data-testid attributes preserved on TopBar buttons, Queue items, Preview panel, Bottom bar.
- MarkdownPreview test verifying `prose` + `dark:prose-invert` classes still passes.

## Open Questions

- None. Next slice 6.12 handles left border and DropZone resize.
