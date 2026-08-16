# Archived from AGENTS.md diet on 2026-08-13; see backup in 00-Inbox/backups.

## Archived Section 4 (Locked Architecture — Command Center v1.7)
Shell: fixed inset-0 flex flex-col overflow-hidden. The viewport is the only sizing authority; no window/body scroll; BottomBar always visible.
TopBar (34px, items vertically centered): LEFT logo chip + DEMO badge (no literal wordmark); CENTER brand image text.png 153x34 alt="Scan2Text" + static CSS radial glow; RIGHT icon-only theme/language/settings with translated tooltips.
Main: flex-1 min-h-0 mt-[1vh] min-w-0, grid grid-cols-[minmax(0,34fr)_minmax(0,60fr)] gap-[2%]. Left column grid-rows minmax(0,38fr) Dropzone / minmax(0,62fr) Queue. Right = Preview (full-width read-only Markdown, internal scroll). min-w-0 on columns AND panel roots. 1vh vertical gutter between TopBar and main (CEO delta 2026-08-08). Fractions decide; content never resizes panels.
BottomBar (pinned shrink-0): grid 1fr auto 1fr; LEFT empty; CENTER Worker Idle/Busy · RAM "—" (until GET /health) · version; RIGHT icon-only Share (placeholder https://placeholder.local, click = soft toast, no navigation).
Dropzone: dashed area flex-1 min-h-0 fills card; bg bacground-left-top-panel.jpg at 15% opacity, background-size single value 100%, centered, no-repeat, pointer-events none; bold ink #1F150C header + footer ("max 10 files per batch"); NO ScrollArea.
Queue: internal scroll, always-visible warm scrollbar; radiant rays static zero-CPU; row = icon + truncated name + size + fixed 14px dot-only status slot (grey pending / #FACC15 spinner / glossy green / glossy red) + translated tooltip + retry on failed. NO fake progress bar (CEO decision 2026-08-08; revisit v2/v3 on user feedback); single status indicator in right 14px slot.
Preview: borderless transparent header buttons (Copy Markdown / Open Folder) with caramel hover + focus ring.
Radix ScrollArea tray neutralized globally: [data-radix-scroll-area-viewport] > div { display:block; min-width:0; height:auto }.
The rendered TopBar must be the live one in the App import chain; delete ghosts on sight.
State: Zustand memory-only; jobOrder[] FIFO; one active job at a time. Jobs NEVER persist.
Demo Mode (Phase 6): IS_DEMO_MODE flag in src/lib/demoMode.ts intercepts the API; PDF -> rich sample, images -> simple; in-memory task map; amber DEMO badge.
Backend contract (Phase 7): POST /process -> task_id; GET /status/{task_id}; GET /health. Poll 15 x 2000ms = 30s, then background re-poll 60s x 10.
Validation: max 50MB; PNG/JPG/JPEG/WEBP/PDF only; batch cap 10 (first 10 kept, extras skipped + warning toast + logged); invalid batch = ONE aggregated sonner toast; invalid files never enter queue.
Output naming: {stem}_{HHmm}_{yyyyMMdd}.md, collision _2/_3, never overwrite. Pure util src/lib/naming.ts -> generateOutputFilename().
Fake progress: 0 -> 90% over 30s eased; jump 100% on complete; red on fail; pulse ~90% in background.
Tailwind & theme (CRITICAL): Tailwind v3; postcss.config.js + tailwind.config.js v3 format; NEVER install tailwind v4. src/index.css MUST start with @tailwind base; @tailwind components; @tailwind utilities (guardrail test enforces). Dark = .dark class on <html>; do NOT use @media prefers-color-scheme for theme vars. NEVER reintroduce Vite boilerplate. Preflight strips heading/list styles -> rendered Markdown MUST use @tailwindcss/typography prose.

## Archived Section 7 (Current phase & status)
Phases 1-6 COMPLETE (Phase 6 closed 2026-08-08 @ 75bc720, 565 tests). Phase 7 NEXT: real backend kickoff; first target GET /health telemetry; ASR parked until Scan2Text ships.
See second-brain/00-Current-State.md for live test counts and active slice.

## Archived MCP Block (from section 13)

Local models MUST dynamically invoke the following installed MCP servers before completing tasks:

### 1. Code Diagnostics & Type Checking (`typescript-lsp` & `python-lsp`)
- **BEFORE outputting code or completing a task:** ALWAYS run `typescript-lsp` (for `.ts`/`.tsx` files) or `python-lsp` / `pyright-lsp` (for `.py` files) to check for diagnostics.
- **Zero-Error Policy:** NEVER mark a task complete if the LSP tool returns syntax, type, or compilation errors. Resolve them first.

### 2. Live Documentation Lookup (`context7`)
- **BEFORE writing code for external libraries:** Query `context7` to fetch up-to-date documentation for React 19, FastAPI, Zustand 5, Pydantic v2, Tailwind CSS, or Vitest.
- Do NOT guess API signatures or use deprecated methods—verify with `context7` first.

### 3. UI & Browser Inspection (`playwright`)
- **WHEN building or refactoring UI components:** Use `playwright` to render the DOM, inspect component layouts, and check browser console errors (especially for `pywebview` integration).

## Archived Phase-6 Visual Misc Lines
- Brand wordmark is an IMAGE; tests assert alt="Scan2Text", not literal text.
- Decorative bg layers: backgroundSize single value '100%' (never 'cover' or '100% 100%').
- Depth must be visible-subtle, not garish.
- Drag-over highlight needs enter/leave counter + onDragOver preventDefault (boolean flickers on child traversal).
