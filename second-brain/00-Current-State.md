## Phase Status

- **Current Phase:** Phase 6 (Prototype & Demo Mode) — RECOVERY DONE

- **Current Slice:** Slice 6.14d (Visual Hotfix — Brand Image + BottomBar + Viewport Lock)

- **Next Slice:** Slice 20.6 (Share button)


## Frontend Baseline

- **Tests:** 527/527 passing

- **Typecheck:** PASS

- **Build:** PASS

- **Visuals:** Demo Mode active. TopBar shows amber "DEMO" badge + Settings icon. Bottom bar ticker shows Worker/RAM/Version with vertical dividers. Side-by-side preview panel renders with 30%/70% split. Action header with Copy and Open Folder buttons visible on completed jobs. Settings Dialog with General section (Language/Theme selectors) and locked Processing section (Output Dir, Max PDF Pages, CPU Threads). Tailwind utilities now load correctly; full-width layout enabled via neutral #root rule. Markdown now styled with prose classes. DropZone centered vertically with file-type hint. Panel dividers added between main sections. @tailwindcss/typography@0.5.16 declared in frontend/package.json devDependencies.
  2026-08-07: repo rehomed to scan2text, Projects-level git retired to .git-backup"


## Phase 6 Progress

- [x] Slice 6.x: Tailwind pipeline hotfix (@tailwind directives added, hostile Vite #root rule replaced with full-width neutral container).

- [x] Slice 20.1: Multi-file drop, batch validation, aggregated toast, FIFO queue.

- [x] Slice 20.2: Demo Mode core (mock OCR, rich Markdown, visible badge).

- [x] Slice 20.3: Preview panel docs compliance (side-by-side layout).

- [x] Slice 20.4: Naming utility & preview panel action header (Copy + Open Folder).

- [x] Slice 20.5: Full fake system chrome (worker status, RAM, settings modal).

- [x] Slice 6.9: Visual polish — thumbnail wiring verified, panel dividers added, typography prose installed, DropZone centered with i18n hint.

- [x] Slice 6.10: Thumbnail path fix — data-testid attributes added to img elements in PreviewPanel and QueuePanel for testability.

- [x] Slice 6.10b: Recovery — fixed red test (removeJob cleanup > should call stopProgress on job removal) by mocking progressManager module in store test; @tailwindcss/typography declared; audit shows zero leftover thumbnail references.

- [x] Slice 6.14d: Visual hotfix — TopBar brand image wordmark (text.png, alt="Scan2Text", h-34px), BottomBar rebuilt with centered telemetry + Share icon right, viewport lock via html/body overflow-hidden CSS, DropZone background image at 0.25 opacity, queue status dots + progress bars verified. Tests: 521 → 527 (+6).

- [x] Slice 6.11: Calm theme — zinc layered surfaces (#09090b/#18181b/#27272a dark, #fafafa/#e4e4e7 light), Quantico @font-face with swap comment, font-display/font-body CSS vars + Tailwind fontFamily tokens, icon-only TopBar with shadcn Tooltip + i18n keys, rounded-xl card wrappers on DropZone/Queue/Preview panels, prose-base headings via prose-headings:font-display + purple prose-a links, BottomStatusBar font-display.

- [x] Slice 6.12: CEO visual feedback pass — darkMode class strategy fix, ratios 20/20/60 (CEO approved 2026-08-07), border-r dividers removed in favor of p-3 gap-3 floating cards, DropZone fills panel height, Queue status dots (glossy green/red radial-gradient) with tooltips + Spinner during processing, Remove button removed from MVP, Preview action header centered, i18n queue.remove cleaned up, shadcn Spinner installed.

- [x] Slice 6.12b: Alignment + gradient surfaces + light-mode fix (2026-08-07). Light-mode bug root cause: @media (prefers-color-scheme: dark) overrode :root vars; removed media query block. Per-panel neutral gradient surfaces: surface-left / surface-center / surface-right / surface-action classes with dark/light theme variants. Panel h-full wrappers in CommandCenterLayout for uniform column height. DropZone hint moved inside card (mt-auto), click label bigger/bold font-display semibold. Action header gets surface-action background. Regression test added for theme toggle class flip.

- [x] Slice 6.12c: Uniform spacing + vertical gradient sheen + right panel lightening + DropZone dedupe + full-height empty cards (2026-08-07). Grid p-3 gap-3 uniform on all sides. All surface gradients changed from 135deg diagonal to to-bottom vertical (lighter top, base bottom). Right panel dark surface lightened two steps (#202024→#18181b). DropZone inner area icon-only (upload SVG, no text); single heading text retained at card top. PreviewPanel all states (empty/processing/failed/completed) use flex-1 surface-right card with min-w-0 box-border for pixel-perfect bottom alignment. QueuePanel card gains min-w-0 box-border. DropZonePanel card gains min-w-0 box-border.

- [x] Slice 6.12d: CEO locked coffee-and-paper palette 2026-08-07 — purple retired. Dark: bg #000000, surface-left #E1DCC9/fg #1F150C, surface-center #412D15/fg #F2EBDD, surface-right #1F150C/fg #F2EBDD, border #3B2A18, accent #E3A55F. Light: bg #F9F8F6, surface-left #EFE9E3, surface-center #D9CFC7, surface-right #C9B59C, all fg #1F150C, border #1F150C, accent #92400E. Right margin fix: grid-cols changed from percentage-based [20%_20%_60%] to fr-based [2fr_2fr_6fr] so gaps are accounted for and right card has identical window-edge distance as left. Per-surface foreground colors applied (ink on left paper, cream on center/right in dark). Vertical sheen gradients recomputed over new base colors. Palette-lock test + layout regression test added.

- [x] Slice 6.12e: Depth pass — dark background warmed to #080502. All three panel cards + action header: longhand background-color + background-image (vertical gradient, ~12% lighter top stop), box-shadow (dark: 0 12px 32px -12px rgba(0,0,0,0.7)+inset highlight; light: 0 12px 32px -14px rgba(31,21,12,0.28)+inset highlight), warm radial glow dark-only. Border-border removed from all three panel cards in both themes. Dashed drop-target border and bar hairlines retained. Palette-lock test extended with depth recipe checks + no-border-class assertions.

- [x] Slice 6.12f: Overflow hygiene — CommandCenterLayout grid children get min-w-0 overflow-hidden so columns never expand past 20/20/60. QueuePanel filename element already had truncate+min-w-0 (verified). MarkdownPreview article gets min-w-0 break-words so long tokens inside Markdown can't push the right panel. Regression tests: CommandCenterLayout grid child class check + QueuePanel 60-char spaceless name truncate assertion.

- [x] Slice 6.13: Identity finale + Vite __dirname fix — TopBar identity chip with logo.png pictogram + live-text wordmark (scan + accent "2" + text) + DEMO badge; static SVG radiant rays in center panel only (zero CPU, pointer-events-none, aria-hidden); SettingsDialog locked demo mode Switch with 🔒 lock indicator; vite.config.ts + vite.test.config.ts __dirname → import.meta.dirname. New i18n keys: topbar.logoAlt, topbar.wordmarkScan/Two/Text, topbar.demoBadge, settings.demoModeSwitch, settings.locked. Tests: 442 → 459 (+17).

- [x] Slice 6.13b: Depth & presence pass — TopBar separator line removed, header gets warm gradient + downward shadow; lockup chip redesigned as physical stamp tile (h-8 w-8 rounded-lg, warm gradient bg, inset highlight, outer shadow) replacing pill/border wrapper; wordmark gains tracking-wider; BottomBar separator line removed; all three panel cards gain depth utility classes (.depth-panel-left/center/right) with layered vertical gradient overlay (top-darker fade), inset top highlight, soft outer shadow; workspace container gets ambient warm radial glow (dark: 0.14 opacity accent, light: 0.04); DropZone dashed area stretched to w-full; ambient glow marker div added for testability. New CSS classes: .topbar-header, .chip-tile, .depth-panel-left, .depth-panel-center, .depth-panel-right, .workspace-container. Tests: 459 → 472 (+13).

- [x] Slice 6.14a: Literal wordmark + floating 34/60 layout — Wordmark rendered as literal spans "scan"+"2"+"text" (no i18n indirection); color uses exact right-panel cream/ink token (#F2EBDD dark / #1F150C light). Layout rebuilt: workspace grid 34fr/60fr with 2% gutters and 2% padding; left column stacks dropzone (38% height, min-h 240px) + queue (flex-1); right column preview full-height. Overflow hygiene contract: grid wrappers min-w-0 without overflow-hidden; cards get overflow-hidden+min-w-0. Depth shadows tuned to gutters: 0 8px 20px -8px rgba(0,0,0,0.55) dark / rgba(31,21,12,0.22) light. Radiant rays move with queue card. Tests: 512 → 514 (+2).

- [x] Slice 6.14b: ScrollAreas + file type icons — @radix-ui/react-scroll-area installed (new dep). shadcn-style ScrollArea component created at src/components/ui/scroll-area.tsx. Three regions wrapped: dropzone (data-testid="dropzone-scroll-area"), queue job list (data-testid="queue-scroll-area"), preview Markdown (data-testid="preview-scroll-area"). Queue + preview use h-full+min-h-0 chain for actual overflow scroll; dropzone present for future-proofing. Warm-styled thin scrollbars via CSS (caramel thumb dark #E3A55F / coffee light #92400E, 4px width, zero CPU idle). fileKind.ts already existed with 8 test cases covering all requirements. lucide-react FileImage/FileText glyphs already wired with data-testid="queue-icon-image" and "queue-icon-pdf". Regression test added: clicking completed job switches preview Markdown content. Tests: 514 → 521 (+7).
      
