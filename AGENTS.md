# Scan2Text — Agent Operating Manual
Read FIRST before every slice. Do NOT re-read PRD docs unless the slice prompt lists them.

**Role:** This manual is for **Kilo Code only**. The Cloud CTO reads `AGENTS-CTO.md`.
**Cross-reference:** Kilo executes per this manual; the Cloud CTO writes slice prompts that respect these constraints.

## 1. Identity & Paths
- Name: Scan2Text — local-first, offline, portable OCR (images/PDFs to Markdown).
- Platform: Windows 10/11, x86_64, CPU-only, desktop-only.
- Method: AI-Assisted Software Development (AIASD).
- Repo root: `D:\WingAI\Projects\scan2text`
- Frontend dir: `D:\WingAI\Projects\scan2text\frontend` (all src paths below are relative to this)
- Obsidian vault: `D:\WingAI\Projects\scan2text\second-brain`

## 2. Commands (PowerShell ONLY) — run from frontend dir
- `graphify . --code-only` (refresh AST graph locally without LLM API keys)
- `npm run test` (Vitest — use `-- --reporter=compact` when running full suites)
- `npm run typecheck` (`tsc --noEmit`)
- `npm run build` (Vite)
- `py -3.12 -m pytest -q --tb=line` (backend, Phase 7 only, single-line tracebacks)
- `cargo check --message-format=short` (Rust/Tauri checking)
ENVIRONMENT: You are in PowerShell on Windows, NOT bash. NEVER use tail/head/grep/ls -la/cat/rm -rf or pipes like "npm run test | tail". USE `Get-Content`, `Select-String`, `Get-ChildItem -Force`, `Remove-Item -Recurse -Force`. Run commands directly and read full output. If a Unix-ism fails, do NOT retry variations — use the PowerShell equivalent.

## 3. Engineering Rules (non-negotiable)
3.1 **TDD Red-Green-Refactor:** failing test first, run, confirm red; minimal code, run, confirm green; refactor only after green. Never skip RED. `/tdd` skill is REQUIRED for all code, script, and config changes. Do not implement without writing the failing test first.

3.2 **Micro-slicing + context budget:** one slice = one logical unit, no scope creep. Local llama.cpp window = 128k; HARD safety cap: input + output <= 45k tokens per slice, input target <= 35k. If exceeded, STOP and request a slice split. Emergency stop: "STOP. Give compact handoff summary only."

3.3 **Compact output rule:** Keep all tool output and explanations compact. Never paste full file contents into responses. For long files, show first 50 lines and last 30 lines only via `Select-Object -First 50` / `Select-Object -Last 30`. Protect the 35k token safety cap at all times.

3.4 **Kilo = Senior Engineer:** slice prompts are complete contracts; execute verbatim; no exploration tours; ask nothing the prompt already answers.

3.5 **Dependency permission rule:** Install dependencies (npm, pip, cargo) ONLY when the slice prompt explicitly states CEO approval for dependency installation. If a dependency is missing and the slice prompt does not authorize installation, flag the blocker — do not install silently.

3.6 **Testing gotchas:**
  - `data-testid` on all testable DOM; `data-state` for state.
  - `globalThis.setInterval` / `globalThis.setTimeout` for fake timers.
  - Mock `navigator.clipboard` in clipboard tests.
  - `react-markdown` splits styled text: assert `container.textContent`, NOT `getByText`.
  - jsdom renders `"* [ ]"` but NOT `"- [ ]"`.
  - NEVER `Object.values()` or new objects inside Zustand selectors; use `useMemo` / `useShallow`.
   - jsdom does NO layout math: `getComputedStyle` `flexGrow` returns `'0'`, `offsetWidth`/`offsetHeight` = 0, Radix Presence won't mount scrollbars without real overflow, hex->rgb conversion. Assert `className` / source-level, NOT computed pixels. CEO screenshot is the acceptance test for layout-critical UI.
   - Targeted Test Execution: During RED and GREEN phases of `/tdd`, run ONLY the target test file (e.g., `npx vitest run src/components/layout/SettingsDialog.test.tsx --reporter=compact`). NEVER run the full `npm run test` suite until the final VERIFICATION gate. This prevents full-suite output from bloating the 35k token cap.

3.7 **i18n:** react-i18next, EN + ID, NO hardcoded strings ever. New strings in BOTH `src/locales/en.json` AND `src/locales/id.json`. Inject resources via `initI18n()` in tests.

3.8 **QA + doc-only boundary:** `second-brain/02-QA/` scripts are EXECUTED BY THE CEO (human eyes + mouse + screenshots). Kilo AUTHORS the script; Kilo NEVER runs UI automation (no Playwright/Cypress/puppeteer). "RUN it" = script exists, complete, human-runnable, then STOP. Doc-only slices never touch `frontend/` or `backend/` source.

3.9 **UI/UX:** toasts via sonner (mounted at root). Desktop-only. Dark DEFAULT, light via toggle. `localStorage` ONLY for theme + language; jobs NEVER persist. shadcn/ui + lucide-react.

3.10 **PYTHONPATH rule:** When running backend code from repo root (e.g., `py -3.12 -m pytest`, `py -3.12 script.py`), set `$env:PYTHONPATH="src"` so imports resolve correctly. Example: `$env:PYTHONPATH="src"; py -3.12 -m pytest -q`.

3.11 **MCP Tool-First Protocol (Strict Token Saver):**
   Available MCP servers — invoke tool-first before reading raw files or searching directories:
   - **Symbol & Definitions (`typescript-mcp` / `rust-analyzer`):** Before reading a full source file to check types or function parameters, run the LSP/Analyzer tool to hover or jump to definitions. NEVER read a 200+ line file just to inspect an interface or type signature.
   - **Library Documentation (`context7`):** Query `context7` before writing code against external libraries (React, Zustand, Vite, FastAPI, Pydantic, Tailwind, Vitest, Tauri). Do not guess signatures or search the web.
   - **Repository History (`git-mcp`):** Use `git-mcp` to inspect recent commit diffs, log history, or modified status instead of reading entire files to understand recent edits.
   - **Desktop/App State (`tauri-mcp`):** Use for inspecting Tauri IPC commands, webview logs, or window states.
   - **Zero-Error Policy:** Before marking any code task complete, invoke LSP diagnostics or run compiler checks (`npm run typecheck`, `cargo check --message-format=short`). Never mark complete with active errors.
   - **Playwright Restriction:** `playwright` MCP stays disabled (`"enabled": false`) per Rule 3.8.

3.12 **Graphify Context Protocol (Strict Local Context Saver):**
   - **Token Cap Protection:** To strictly enforce the 35k token input cap (Rule 3.2 & 3.3), NEVER perform broad directory searches, file reads, or greps across multiple folders.
   - **Query Graph First:** Before opening source files or executing multi-file refactors, query Graphify to discover exact file boundaries:
     - `graphify query "<feature or task description>"` -> returns minimum relevant sub-graph.
     - `graphify path "<SourceComponent>" "<TargetComponent>"` -> traces exact caller/dependency path.
     - `graphify explain "<ComponentName>"` -> inspects upstream/downstream blast radius before modifying signatures.
   - **Targeted File Access:** Open ONLY the specific file paths returned by Graphify queries.
   - **AST Maintenance:** The local AST index lives at `graphify-out/graph.json`. If a slice adds or removes multiple files, run `graphify . --code-only` to refresh the graph before committing.

## 4. Locked Architecture — Command Center v1.7
Shell: fixed inset-0 flex flex-col overflow-hidden. The viewport is the only sizing authority; no window/body scroll; BottomBar always visible.
TopBar (34px, items vertically centered): LEFT logo chip only (DEMO removed 2026-08-17, final product); CENTER brand image text.png 153x34 alt="Scan2Text" + static CSS radial glow; RIGHT icon-only theme/language/settings with translated tooltips.
Main: flex-1 min-h-0 mt-[1vh] min-w-0, grid grid-cols-[minmax(0,34fr)_minmax(0,60fr)] gap-[2%]. Left column grid-rows minmax(0,38fr) Dropzone / minmax(0,62fr) Queue. Right = Preview (full-width read-only Markdown, internal scroll). min-w-0 on columns AND panel roots. 1vh vertical gutter between TopBar and main (CEO delta 2026-08-08). Fractions decide; content never resizes panels.
BottomBar (pinned shrink-0): grid 1fr auto 1fr; LEFT empty; CENTER Worker Idle/Busy · RAM "—" (until GET /health) · version; RIGHT icon-only Share (placeholder https://placeholder.local, click = soft toast, no navigation).
Dropzone: dashed area flex-1 min-h-0 fills card; bg bacground-left-top-panel.jpg at 15% opacity, background-size single value 100%, centered, no-repeat, pointer-events none; bold ink #1F150C header + footer ("max 10 files per batch"); NO ScrollArea.
Queue: internal scroll, always-visible warm scrollbar; radiant rays static zero-CPU; row = icon + truncated name + size + fixed 14px dot-only status slot (grey pending / #FACC15 spinner / glossy green / glossy red) + translated tooltip + retry on failed. NO fake progress bar (CEO decision 2026-08-08; revisit v2/v3 on user feedback); single status indicator in right 14px slot.
Preview: borderless transparent header buttons (Copy Markdown / Open Folder) with caramel hover + focus ring.
Radix ScrollArea tray neutralized globally: `[data-radix-scroll-area-viewport] > div { display:block; min-width:0; height:auto }`.
The rendered TopBar must be the live one in the App import chain; delete ghosts on sight.
State: Zustand memory-only; jobOrder[] FIFO; one active job at a time. Jobs NEVER persist.
Backend contract (Phase 7): POST /process -> task_id; GET /status/{task_id}; GET /health. Poll 15 x 2000ms = 30s, then background re-poll 60s x 10.
Validation: max 50MB; PNG/JPG/JPEG/WEBP/PDF only; batch cap 10 (first 10 kept, extras skipped + warning toast + logged); invalid batch = ONE aggregated sonner toast; invalid files never enter queue.
Output naming: `{stem}_{HHmm}_{yyyyMMdd}.md`, collision `_2`/`_3`, never overwrite. Pure util `src/lib/naming.ts` -> `generateOutputFilename()`.
Tailwind & theme (CRITICAL): Tailwind v3; `postcss.config.js` + `tailwind.config.js` v3 format; NEVER install tailwind v4. `src/index.css` MUST start with `@tailwind base; @tailwind components; @tailwind utilities` (guardrail test enforces). Dark = `.dark` class on `<html>`; do NOT use `@media prefers-color-scheme` for theme vars. NEVER reintroduce Vite boilerplate. Preflight strips heading/list styles -> rendered Markdown MUST use `@tailwindcss/typography prose`.

## 5. Coffee & Paper palette (single source)
DARK: bg #080502; Dropzone #E1DCC9 (ink #1F150C); Queue #412D15 (cream #F2EBDD); Preview #1F150C (cream); accent #E3A55F; border #3B2A18.
LIGHT: bg #F9F8F6; #EFE9E3 / #D9CFC7 / #C9B59C; all fg #1F150C; border #1F150C; accent #92400E.
Depth (visible-subtle, theme-aware inline longhand: gradient + inset top highlight + soft shadow + warm glow): dark shadow 0 12px 32px -12px rgba(0,0,0,0.7) + warm radial glow; light shadow 0 12px 32px -14px rgba(31,21,12,0.28) + white top-highlight. No flat cards, no borders, no purple.
Scrollbars: always-visible, thin, rounded, warm on Queue + Preview only (Dropzone excluded).

## 6. Memory protocol + vault map
Every slice: read THIS file + `second-brain/00-Current-State.md` ONLY; read ADRs/docs only if the slice lists them; update `00-Current-State.md` on state changes; write summary to `second-brain/01-Agent-Memory/Phase-{N}/slice-{X}-{name}.md` (What Changed | Key Decisions | Test Coverage | Open Questions).
Vault map (canonical):
  `second-brain/00-Current-State.md`
  `second-brain/00-Inbox/`
  `second-brain/01-Agent-Memory/` (Phase-2 ... Phase-7 slice summaries + Archive/)
  `second-brain/02-QA/` (manual test scripts; Phase 6 closure)
  `second-brain/03-Architecture/` (architecture docs + ADRs/ subfolder)
  `second-brain/04-Product/` (PRD v1.7 files 01-04)
  `second-brain/05-Sprints/`
If an actual folder name differs, discover via `Get-ChildItem` before writing; never guess.

## 7. Current phase & status
Live state (phase, active slice, test counts) lives in `second-brain/00-Current-State.md`. Do NOT embed phase status or test counts here — they drift. Read that file at session start.

## 8. CEO locked decisions (do NOT override)
- Local-first, offline, CPU-only; Markdown-output-first; NOT a document editor.
- Command Center v1.7 shell (section 4): fixed inset-0; 34/60 + 2% gutters; left 38fr/62fr; center brand image (no literal wordmark); BottomBar share RIGHT.
- Fractions decide; content never resizes panels; no page scroll; BottomBar always visible.
- Coffee & paper palette (section 5); purple retired.
- Dot-only 14px status slot; warm always-visible scrollbars (Queue + Preview); visible-subtle card depth.
- Batch cap 10; 50MB/file; PNG/JPG/JPEG/WEBP/PDF only; invalid batch = one aggregated toast.
- Memory-only jobs; localStorage only theme + language.
- Share = placeholder https://placeholder.local + soft toast, no navigation (real URL post-GitHub, CEO-approved).
- Feedback = GForm button left of Share + offline queue, no silent send (ADR-007).
- CPU auto = 60% of logical cores (ADR-007).
- Welcome expectations screen every launch until dismissed (ADR-007).
- Binaries on GDrive, version.json on GitHub (ADR-007).
- Monthly release cadence (ADR-007).
- Logs: no file names, no content; 1 MB rotation (ADR-007).
- i18n EN + ID for all UI strings; brand image alt="Scan2Text" is the only i18n-exempt brand element.
- CEO taste overrides PRD: re-confirm layout deltas in writing before slicing. Layout-critical UI acceptance = CEO screenshot.
- Python locked to `py -3.12`. Never bare python.
- TDD is mandatory for all code, script, and config changes.
- Doc-only slices never touch frontend/ or backend/ source.
- Kilo authors QA scripts; CEO runs them.
- Dependency installation requires explicit CEO approval in slice prompt.

## 9. Definition of done (per slice)
RED confirmed before impl; GREEN after. `npm run test` all passing (state new baseline count). `npm run typecheck` zero errors. `npm run build` success. i18n keys in BOTH `en.json` + `id.json`. `data-testid` on new testable elements. `00-Current-State.md` + slice summary updated. No scope creep beyond NON-GOALS. Commit.

## 10. Final Status States
- **COMPLETE** — Tests green, typecheck clean, build success, Obsidian updated, committed.
- **READY FOR CEO MANUAL VERIFICATION** — Code/tests done; CEO must manually verify UI/layout via screenshot or live run before closure.
- **BLOCKED** — Waiting on CEO decision, external dependency, or diagnosis incomplete.

## 11. Prompt efficiency rule
This file holds all stable rules. Slice prompts contain ONLY: SLICE name, BASELINE, GOAL, NON-GOALS, TASKS, VERIFICATION, OBSIDIAN UPDATE, FINAL OUTPUT format, plus a 1-line CONTEXT reminder + the PowerShell constraints block. NEVER use nested triple backticks when handing prompts/files to the CEO (copy breaks).

## 12. Frontend file map (relative to frontend/)
Layout: `src/components/layout/CommandCenterLayout.tsx` | `TopBar.tsx` | `BottomStatusBar.tsx` | `SettingsDialog.tsx`
Panels: `src/components/layout/panels/DropZonePanel.tsx` | `QueuePanel.tsx` | `PreviewPanel.tsx` | `MarkdownPreview.tsx`
Dropzone: `src/components/dropzone/FileDropZone.tsx`
Store: `src/stores/scan2text.store.ts`
Utils: `src/lib/naming.ts` | `src/lib/api.ts`
UI primitives: `src/components/ui/` (button, card, dialog, input, label, spinner, tooltip, scroll-area)
i18n: `src/locales/en.json` + `src/locales/id.json`
Theme tokens: `src/index.css` + `tailwind.config.js`
Images: `Images/logo.png`, `Images/text.png`, `Images/bacground-left-top-panel.jpg`
RULE: never guess paths; if a mapped file is missing, discover via `Get-ChildItem`.

## 13. Lessons learned (active rules only)
### Layout / shrink
- `min-width:auto` bites at EVERY grid/flex level -> `minmax(0,fr)` + `min-w-0` on tracks, columns, AND panel roots. Capping tracks alone is not enough.
- Content-sized containers make sibling panels grow with unrelated content -> `minmax(0,fr)` + `min-h-0` everywhere.
- For kiosk shells use fixed inset-0 so the viewport is the only sizing authority; ancestor wrappers can silently defeat `h-screen`.
- `min-height:auto` is the vertical twin of `min-width:auto`: flex/grid children need `min-h-0` on the VERTICAL shrink chain (main, columns, panel roots).

### Radix
- ScrollArea viewport child is `display:table` -> neutralize with the CSS override in section 4.
- Radix hides native scrollbars by design -> mount `<ScrollBar/>` for visible affordance; wheel-only scrolling is a UX bug.
- Radix scrollbar DOM uses `data-orientation` / `data-state`, NOT `data-radix-scroll-area-scrollbar`.

### Ghosts / forensics
- Forensics before edit for twice-failed items: trace import chain `App.tsx` -> `Layout` -> `Panel`; grep every matching name; mark LIVE vs GHOST; prove which file is served before editing.
- Verify the ACTUAL live component before assuming a ghost (style changes can look like regressions).
- Before deleting, grep ALL consumers incl. tests/debug scripts; delete ghost + its tests + debug harness in one atomic sweep.
- `git show --stat HEAD` / `git log -5` to check whether the previous slice touched source or only tests/docs.

### jsdom
- Does no layout math (see 3.6). Assert `className`/source, not computed pixels. CEO screenshot = layout acceptance.

### Misc
- Never hardcode `D:\` paths in frontend; Vite relative imports.
- Path discovery before edit: app under `frontend/`; i18n `frontend/src/locales/`. "File not found" is a lookup task, never a stop reason.
- Absence tests keep removed features removed (docs drift, tests remember).
- Per-locale icon inside translation string = i18n owns the whole message (CEO decision 2026-08-08).
- Non-technical users need non-technical feedback channels (GForm over GitHub Issues).
- Cap CPU so the PC stays usable — a fast OCR that freezes the PC loses users.
- Size-based log rotation beats calendar deletion — caps make failure impossible.
- Opt-in send, never silent upload — privacy is a product feature.
- GitHub noreply commit email keeps identity swappable.

### Phase 7 — Backend
- Always use `py -3.12` for backend tests and commands, NEVER bare `python`. System default Python may be 3.14+ which lacks native wheels for `llama-cpp-python`. Lock the interpreter by evidence, never by memory.
- Backend binds `127.0.0.1` only; local-first means localhost-first.
- Error hints mislead ('provide the mmproj' appeared with mmproj attached); probe with minimal auditable scripts.
- Golden outputs are references, not truth; the original file plus human review is the standard.
- When the agent wanders, hand it verbatim file content; zero design freedom.
- No run without a file: reproducible, or it didn't happen.
- Disk is truth: before asserting which engine lives where, list `models/` with sizes; renames and deletes change the decision state.
- Engine swap = recipe swap: prompt, sampling, and geometry travel together (ADR-006).
- Production defaults must match the spike recipe or the spike evidence is void.
- YAGNI: Ovis is the sole engine; external backup exists for disaster recovery only.
- Strict adherence to Matt Pocock TDD skills (github.com/mattpocock/skills): RED->GREEN->REFACTOR cycle enforced. Tests updated before implementation.
- S2-S4 port success: verbatim prompt + temp 0.1 + full-page normalization (no tiling) is the locked Ovis recipe. GFM stdlib converter prevents frontend HTML table breakage.