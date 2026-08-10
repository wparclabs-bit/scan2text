<!-- PHASE-7-IN-PROGRESS-STATE-2026-08-10 -->
# Scan2Text Current State — Phase 7 In Progress

Date: 2026-08-10
Phase: Phase 7 (Real Backend) IN PROGRESS
Baseline commit: ec9443d (Phase 6 closed)
Backend tests: 134 green (123 baseline + 11 postprocess_service tests)
Frontend tests: 565 green (unchanged; S3 is backend-only)
PRD: v1.9/v1.10 source of truth in second-brain/04-Product/
Next: Phase 7 continued — engine port slices S4-S6 per ADR-006.

- **2026-08-10 (S1):** ADR-006 signed. OvisOCR2 is the sole engine (GLM removed from codebase, external backup retained). S1 docs + cleanup complete. S2-S6 port planned.

- **2026-08-10 (S3):** Post-process service — postprocess_service.py added with convert_html_tables_to_gfm (HTML table→GFM, best-effort, no rowspan/colspan) and extract_and_save_image_crops (bbox coords scaled 0-1000, crops saved to {stem}_files/images/, markdown src rewritten to relative path). Integrated into VlmOcrAdapter.ocr() after worker returns raw string. Tests: 123 → 134 (+11). Two existing vlm_ocr tests patched to mock extract_and_save_image_crops (fake image bytes not valid PIL images).

- **2026-08-10 (S2):** OvisOCR2 adapter port — vlm_ocr.py rewritten: verbatim OvisOCR2 prompt, temperature=0.1 + repeat_penalty=1.0, full-page _prepare_views (no tiling; _MAX_IMAGE_EDGE=2880, _MAX_PIXELS=4M), deleted _tile_image. Tests: 122 → 123 (+1). Port check PASS (biaya.jpg: 83.1s wall, 4616 chars, 27 <tr>, all 11 numerics present). tools/port_check.py created.

---
## Phase Status

- **Current Phase:** Phase 7 (Real Backend) — IN PROGRESS

- **Current Slice:** OvisOCR2 engine swap spike completed; ADR-006 signed 2026-08-10. Port slices S2-S6 planned.

- **Next Phase:** Phase 7 continued — S2: vlm_ocr.py adapter rewrite for OvisOCR2; S3-S6 follow.

- **2026-08-10:** ADR-006 signed and EXECUTED on disk (OvisOCR2 primary at vlm.gguf/mmproj.gguf; GLM = external backup). Docs slice S1 landed; code port S2 next.

- **2026-08-09 (7.2g):** Real GLM-OCR wiring — vlm_ocr.py rewritten with MTMDChatHandler (vision projector mmproj), settings-driven engine knobs (n_ctx, n_threads, ocr_timeout_seconds, max_pdf_pages, worker_priority), PDF page rendering via pypdfium2+Pillow, three error constants (OCR_TIMEOUT/MODEL_NOT_FOUND/PDF_TOO_MANY_PAGES). New smoke.py manual E2E script. Pillow>=10.0 added as dep. Test: 118 → 119 (+1 routing test for PDF→rendered pages). Backend-only slice; frontend untouched.

- **2026-08-09 (7.2b):** AppSettings extended with engine knobs (language, theme, model_path, mmproj_path, n_ctx, n_threads, ocr_timeout_seconds, worker_priority). PathService gains app_root param + property; models_dir and assets_dir now resolve from app_root (not base_dir); resolve_model_path() added; ensure_runtime_dirs drops assets_dir. Test: 102 → 112 (+10). Backend-only slice; frontend untouched.

- **2026-08-08 (6.16c):** queue empty-state copy finalized by CEO ID review; per-locale icons inside strings — CEO decision (i18n owns full message including icon); EN → " Nothing here yet. Drop something tasty!" (leading space retained), ID → "🙈 Masih belum ada file tuh! Coba upload di atas!". No separate icon element in QueuePanel (confirmed via forensics). Tests: 564 → 565 (+1).

- **2026-08-08 (6.17 closure):** Phase 6 marked COMPLETE. QA re-run all green (previously failed checks 1.5, 2.3, 4.6, 5.1, 5.3, 5.5-superseded, 6.1, 7.2, 7.3 now PASS). Stale draft prd-early-dont-use.md quarantined to 00-Inbox.


## Frontend Baseline

- **Tests:** 564/564 passing (33 files; +10 from 6.16b: drag counter semantics, shell chain min-h-0, brand glow)

- **PRD v1.9 files 01-04:** COMMITTED as source of truth milestone (ADR-006 engine swap).

- **2026-08-08:** fake progress bar removed by CEO decision (v2/v3 candidate); toast copy trimmed; empty states centered. Tests: 552 → 554 (+2).
- **2026-08-08 (6.16b):** vertical shrink chain fixed (panel roots min-h-0); drag-over highlight with counter semantics + warm accent colors; brand glow radial gradient added to TopBar; 1vh gutter between TopBar and main. Tests: 554 → 564 (+10).

- **Typecheck:** PASS

- **Build:** PASS (zero source delta this slice)

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

- [x] Slice 6.14e: Queue status restore + dropzone taste + card depth + bottombar centering (2026-08-07). QueuePanel: spinner bright yellow (#FACC15) inline style, glossy 3-stop radial-gradient green dot (#86EFAC→#16A34A→#14532D) and red dot (#FCA5A5→#DC2626→#7F1D1D) with translated tooltip, thin progress bar retained, viewport overflow-y auto+min-h-0. DropZonePanel: bg opacity 0.15 (was 0.25), backgroundSize single-value '100%' (not 'cover'), header font-bold text-[#1F150C]. depthStyles.ts: per-panel dark/light recipes — left white-highlight gradient + soft shadow, center warm overlay + strong shadow, right darkest overlay + deepest shadow; light mode white top-highlight 0.5-0.6 alpha + brown fade bottom. BottomStatusBar: h-[36px] flex items-center for vertical centering. Tests: 527 → 543 (+16).

- [x] Slice 6.14f: Fixed status slot + bottombar pin + preview buttons + dropzone fill (2026-08-07). QueuePanel: fixed ~14px status slot always present after filename (grey dot pending #A8A29E/#78716C, yellow spinner processing/uploading #FACC15, green glossy completed, red glossy failed), no visible text labels in slot, tooltips retained, progress bar retained. BottomStatusBar: pinned with shrink-0, grid-cols-[1fr_auto_1fr] for centered telemetry, flex items-center for vertical centering. CommandCenterLayout: shell h-screen flex flex-col, main min-h-0. DropZonePanel: dashed area flex-1 min-h-0 w-full fills between header and hint. PreviewPanel: Copy/Open Folder buttons borderless transparent bg with caramel hover tint rgba(227,165,95,0.12). Tests: 543 → 558 (+15).

- [x] Slice 6.14g: Forensics-first live-tree fix (2026-08-07). Proved via import-chain trace that QueuePanel.tsx and DropZonePanel.tsx are LIVE; DropZone.tsx and debug-drop.test.tsx are GHOST (not imported by app tree). Fixed DropZonePanel hint text: added font-bold + text-[#1F150C] + shrink-0. Deleted 3 ghost files (DropZone.tsx, DropZone.test.tsx, debug-drop.test.tsx). Tests: 558 → 549 (-9 ghost tests). Typecheck + build green.

- [x] Slice 6.14h: Radix tray fix + dropzone fill + 10-file rule (2026-08-07). CSS override neutralizes Radix ScrollArea viewport child display:table (defeats min-w-0 truncation + percentage heights). DropZonePanel: ScrollArea removed entirely — panel no longer scrolls. Header test updated to query dropzone-header directly. i18n: dropzone.hint updated with "max 10 files per batch"; new key dropzone.maxFilesWarning added (en + id). FileDropZone: 10-file cap enforced after type+size validation — excess files skipped with warning toast + console log. ScrollAreas.test.tsx: replaced dead dropzone-scroll-area assertion with header/hint assertions. Tests: 549 → 551 (+2). Typecheck + build green.

- [x] Slice 6.14j: Absolute viewport lock — fixed inset-0 shell (2026-08-07). CommandCenterLayout root changed from h-screen flex flex-col to fixed inset-0 flex flex-col overflow-hidden so the viewport is the only sizing authority. Main uses flex-1 min-h-0 min-w-0 grid grid-cols-[34fr_60fr]. Left column uses min-h-0 grid grid-rows-[minmax(0,38fr)_minmax(0,62fr)] gap-3 so content can never stretch panels. Removed decorative radiant rays and ambient glow from layout component. Added data-testid="app-shell", "main-content", "left-column", "preview-column". palette-lock.test.ts: 4 new tests for [data-radix-scroll-area-viewport] > div neutralizer. Tests: 551 → 544 (-7 removed, +8 added). Typecheck + build green.

- [x] Slice 6.14k: True 34/60 widths + always-visible warm scrollbars (2026-08-07). Grid tracks changed to minmax(0,34fr)_minmax(0,60fr) + min-w-0 on both columns to prevent long filenames from stretching left panel. QueuePanel: removed inner overflow-y-auto div wrapper, added <ScrollBar orientation="vertical" />. PreviewPanel: added <ScrollBar orientation="vertical" />. CSS: appended always-visible warm scrollbar styles targeting [data-radix-scroll-area-viewport] [data-orientation="vertical"] — caramel thumb #E3A55F dark, coffee #92400E light via :not(.dark) selector. Tests: 544 → 548 (+4). Typecheck + build green.

- [x] Slice 6.14z: Panel root min-w-0 — overlap killed (2026-08-08). DropZonePanel, QueuePanel (both states), PreviewPanel (all 4 states) outermost divs now carry min-w-0 w-full to prevent grid item min-content overflow painting over sibling panels. Capping tracks alone (6.14k) was insufficient; every grid item in the truncation chain needs min-w-0. Tests: 548 → 552 (+4). Typecheck + build green.

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
       

