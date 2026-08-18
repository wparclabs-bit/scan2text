# Scan2Text — Agent Operating Manual
Read FIRST before every slice. Do NOT re-read PRD docs unless the slice prompt lists them.

**Role:** Kilo Code only. Cloud CTO reads `AGENTS-CTO.md`.

## 0. Portable Root Structure (LOCKED)
```
Scan2Text/
  Scan2Text.exe          ← Tauri shell (desktop entry point)
  backend/
    scan2text-backend.exe ← PyInstaller folder-based artifact
    _internal/            ← pypdfium2_raw, Python libs, etc.
  models/                 ← external, downloaded at runtime
  output/                 ← generated .md files
  logs/                   ← 1 MB rotation, no filenames/content
  feedback/               ← offline queue
  settings.json           ← user config
```
**NEVER** use `dist/` for the runtime path. `backend/` is the target portable folder. `Scan2Text.exe` and `backend/` sit side-by-side in the root.

## 1. Paths & Commands (PowerShell ONLY)
- Repo root: `D:\WingAI\Projects\scan2text`
- Frontend: `frontend/` (all src paths relative to this)
- Obsidian vault: `second-brain/`
- PowerShell only. NO bash/grep/tail/ls. USE `Select-String`, `Get-Content`, `Get-ChildItem -Force`, `Remove-Item -Recurse -Force`.

| Command | Context |
|---|---|
| `graphify . --code-only` | refresh AST graph |
| `npm run test` | Vitest (`-- --reporter=compact` for full suites) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Vite |
| `py -3.12 -m pytest -q --tb=line` | backend tests (Phase 7+) |
| `cargo check --message-format=short` | Rust/Tauri |
| `$env:PYTHONPATH="src"; py -3.12 ...` | backend from repo root |

## 2. Engineering Rules (non-negotiable)
**2.1 TDD:** failing test first → run → confirm red → minimal code → run → confirm green → refactor only after green. `/tdd` skill REQUIRED for all code/script/config changes.

**2.2 Context budget:** input + output ≤ 45k tokens/slice; input target ≤ 35k. If exceeded, STOP and request slice split.

**2.3 Compact output:** never paste full files. First 50 / last 30 via `Select-Object` only.

**2.4 Dependency permission:** install deps ONLY when slice prompt explicitly authorizes. Otherwise flag blocker.

**2.5 Testing gotchas:**
- `data-testid` on all testable DOM; `data-state` for state.
- `globalThis.setInterval`/`setTimeout` for fake timers. Mock `navigator.clipboard` in clipboard tests.
- `react-markdown` splits styled text: assert `container.textContent`, NOT `getByText`.
- jsdom renders `"* [ ]"` NOT `"- [ ]"`. NEVER `Object.values()` or new objects inside Zustand selectors; use `useMemo`/`useShallow`.
- jsdom does NO layout math. Assert `className`/source, NOT computed pixels. CEO screenshot = layout acceptance.
- **Targeted execution:** during RED/GREEN run ONLY the target test file. NEVER full suite until VERIFICATION gate.

**2.6 i18n:** react-i18next, EN + ID. NO hardcoded strings. New strings in BOTH `src/locales/en.json` AND `src/locales/id.json`. Inject via `initI18n()` in tests.

**2.7 QA boundary:** `second-brain/02-QA/` scripts are CEO-executed. Kilo authors only. No Playwright/Cypress/puppeteer. Doc-only slices never touch `frontend/` or `backend/` source.

**2.8 UI/UX:** toasts via sonner (root-mounted). Desktop-only. Dark DEFAULT, light via toggle. `localStorage` ONLY for theme + language; jobs NEVER persist. shadcn/ui + lucide-react.

## 3. MCP Tool-First Protocol (STRICT)
Kilo MUST invoke these tools BEFORE reading raw files or searching directories:

| Tool | When |
|---|---|
| `graphify query|path|explain` | Discover exact file boundaries before opening source files or multi-file refactors. Query graph first. |
| `typescript-mcp` | Check TS types, signatures, definitions BEFORE reading full files. |
| `rust-analyzer` | Check Rust types, diagnostics, symbols BEFORE reading full files. |
| `context7` | Query library docs BEFORE writing code against external libs (React, Zustand, Vite, FastAPI, Pydantic, Tailwind, Vitest, Tauri). |

**Zero-Error Policy:** before marking complete, invoke LSP diagnostics or compiler checks (`npm run typecheck`, `cargo check --message-format=short`). Never complete with active errors.
**Playwright:** MCP stays disabled (`"enabled": false`) per Rule 2.7.

## 4. Graphify Context Protocol
- NEVER broad directory searches or multi-folder greps (protects 35k cap).
- `graphify query "<feature>"` → minimum sub-graph. `graphify path "<A>" "<B>"` → caller/dependency path. `graphify explain "<Component>"` → blast radius.
- Open ONLY paths returned by Graphify queries.
- AST index: `graphify-out/graph.json`. Run `graphify . --code-only` after adding/removing multiple files.

## 5. Locked Architecture — Command Center v1.7
- Shell: `fixed inset-0 flex flex-col overflow-hidden`. Viewport is the only sizing authority; no window/body scroll; BottomBar always visible.
- TopBar (34px): LEFT logo chip only; CENTER brand image `text.png` 153×34 `alt="Scan2Text"` + static CSS radial glow; RIGHT icon-only theme/language/settings with translated tooltips.
- Main: `flex-1 min-h-0 mt-[1vh] min-w-0`, grid `grid-cols-[minmax(0,34fr)_minmax(0,60fr)]` gap-[2%]. Left: `grid-rows [minmax(0,38fr)_minmax(0,62fr)]` Dropzone / Queue. Right: Preview (full-width read-only Markdown, internal scroll). `min-w-0` on columns AND panel roots. 1vh vertical gutter (CEO delta 2026-08-08).
- BottomBar (shrink-0): grid `1fr auto 1fr`; LEFT empty; CENTER Worker Idle/Busy · RAM "—" (until GET /health) · version; RIGHT icon-only Share (placeholder `https://placeholder.local`, click = soft toast, no navigation).
- Dropzone: dashed, flex-1 min-h-0 fills card; bg `bacground-left-top-panel.jpg` 15% opacity, `background-size: 100%`, centered, no-repeat, `pointer-events: none`; bold ink `#1F150C` header + footer ("max 10 files per batch"); NO ScrollArea.
- Queue: internal scroll, always-visible warm scrollbar; row = icon + truncated name + size + fixed 14px dot-only status slot (grey pending / `#FACC15` spinner / glossy green / glossy red) + translated tooltip + retry on failed. NO fake progress bar.
- Preview: borderless transparent header buttons (Copy Markdown / Open Folder) with caramel hover + focus ring.
- Radix ScrollArea neutralized: `[data-radix-scroll-area-viewport] > div { display:block; min-width:0; height:auto }`.
- Delete ghosts on sight; verify ACTUAL live component before assuming.
- State: Zustand memory-only; jobOrder[] FIFO; one active job. Jobs NEVER persist.
- Backend contract (Phase 7): `POST /process → task_id`; `GET /status/{task_id}`; `GET /health`. Poll 15×2000ms=30s, then background re-poll 60s×10.
- Validation: max 50MB; PNG/JPG/JPEG/WEBP/PDF only; batch cap 10 (first 10 kept, extras skipped + warning toast + logged); invalid batch = ONE aggregated sonner toast; invalid files never enter queue.
- Output naming: `{stem}_{HHmm}_{yyyyMMdd}.md`, collision `_2`/`_3`, never overwrite. Pure util `src/lib/naming.ts` → `generateOutputFilename()`.
- **Tailwind & theme (CRITICAL):** Tailwind v3; `postcss.config.js` + `tailwind.config.js` v3 format; NEVER install v4. `src/index.css` MUST start with `@tailwind base; @tailwind components; @tailwind utilities`. Dark = `.dark` class on `<html>`; NOT `@media prefers-color-scheme`. NEVER reintroduce Vite boilerplate. Preflight strips headings/lists → rendered Markdown MUST use `@tailwindcss/typography prose`.

## 6. Coffee & Paper Palette
**DARK:** bg `#080502`; Dropzone `#E1DCC9` (ink `#1F150C`); Queue `#412D15` (cream `#F2EBDD`); Preview `#1F150C` (cream); accent `#E3A55F`; border `#3B2A18`.
**LIGHT:** bg `#F9F8F6`; `#EFE9E3` / `#D9CFC7` / `#C9B59C`; all fg `#1F150C`; border `#1F150C`; accent `#92400E`.
**Depth:** dark `0 12px 32px -12px rgba(0,0,0,0.7)` + warm radial glow; light `0 12px 32px -14px rgba(31,21,12,0.28)` + white top-highlight. No flat cards, no borders, no purple.
**Scrollbars:** always-visible, thin, rounded, warm on Queue + Preview only.

## 7. Memory Protocol + Vault Map
Every slice: read THIS file + `second-brain/00-Current-State.md` ONLY; read ADRs/docs only if slice lists them; update `00-Current-State.md` on state changes; write summary to `second-brain/01-Agent-Memory/Phase-{N}/slice-{X}-{name}.md`.

```
second-brain/
  00-Current-State.md
  00-Inbox/
  01-Agent-Memory/  (Phase-2…Phase-7 slice summaries + Archive/)
  02-QA/            (manual test scripts)
  03-Architecture/  (docs + ADRs/)
  04-Product/       (PRD v1.7 files 01-04)
  05-Sprints/
```
If folder names differ, discover via `Get-ChildItem` before writing; never guess.

## 8. CEO Locked Decisions
- Local-first, offline, CPU-only; Markdown-output-first; NOT a document editor.
- Command Center v1.7 shell (section 5): fixed inset-0; 34/60 + 2% gutters; left 38fr/62fr; center brand image; BottomBar share RIGHT.
- Fractions decide; content never resizes panels; no page scroll; BottomBar always visible.
- Coffee & paper palette (section 6); purple retired.
- Dot-only 14px status slot; warm always-visible scrollbars (Queue + Preview); visible-subtle card depth.
- Batch cap 10; 50MB/file; PNG/JPG/JPEG/WEBP/PDF only; invalid batch = one aggregated toast.
- Memory-only jobs; localStorage only theme + language.
- Share = placeholder `https://placeholder.local` + soft toast, no navigation.
- Feedback = GForm button left of Share + offline queue, no silent send (ADR-007).
- CPU auto = 60% of logical cores (ADR-007).
- Welcome expectations screen every launch until dismissed (ADR-007).
- Binaries on GDrive, version.json on GitHub (ADR-007).
- Monthly release cadence (ADR-007).
- Logs: no filenames, no content; 1 MB rotation (ADR-007).
- i18n EN + ID for all UI strings; brand image `alt="Scan2Text"` is the only i18n-exempt element.
- CEO taste overrides PRD: re-confirm layout deltas in writing before slicing. Layout-critical UI acceptance = CEO screenshot.
- Python locked to `py -3.12`. Never bare `python`.
- TDD mandatory for all code, script, config changes.
- Doc-only slices never touch `frontend/` or `backend/` source.
- Kilo authors QA scripts; CEO runs them.
- Dependency installation requires explicit CEO approval in slice prompt.

## 9. Definition of Done
RED confirmed before impl; GREEN after. `npm run test` all passing (state new baseline count). `npm run typecheck` zero errors. `npm run build` success. i18n keys in BOTH `en.json` + `id.json`. `data-testid` on new testable elements. `00-Current-State.md` + slice summary updated. No scope creep beyond NON-GOALS. Commit.

## 10. Final Status States
- **COMPLETE** — Tests green, typecheck clean, build success, Obsidian updated, committed.
- **READY FOR CEO MANUAL VERIFICATION** — Code/tests done; CEO must manually verify UI/layout via screenshot or live run.
- **BLOCKED** — Waiting on CEO decision, external dependency, or diagnosis incomplete.

## 11. Prompt Efficiency
This file holds all stable rules. Slice prompts contain ONLY: SLICE name, BASELINE, GOAL, NON-GOALS, TASKS, VERIFICATION, OBSIDIAN UPDATE, FINAL OUTPUT format, plus a 1-line CONTEXT reminder + the PowerShell constraints block. NEVER use nested triple backticks when handing prompts/files to the CEO (copy breaks).

## 12. Frontend File Map (relative to frontend/)
```
src/components/layout/CommandCenterLayout.tsx | TopBar.tsx | BottomStatusBar.tsx | SettingsDialog.tsx
src/components/layout/panels/DropZonePanel.tsx | QueuePanel.tsx | PreviewPanel.tsx | MarkdownPreview.tsx
src/components/dropzone/FileDropZone.tsx
src/stores/scan2text.store.ts
src/lib/naming.ts | src/lib/api.ts
src/components/ui/  (button, card, dialog, input, label, spinner, tooltip, scroll-area)
src/locales/en.json | src/locales/id.json
src/index.css | tailwind.config.js
Images/logo.png | Images/text.png | Images/bacground-left-top-panel.jpg
```
RULE: never guess paths; discover via `Get-ChildItem`.

## 13. Lessons Learned (active rules)
### Layout / shrink
- `min-width:auto` at EVERY grid/flex level → `minmax(0,fr)` + `min-w-0` on tracks, columns, AND panel roots.
- Content-sized containers make siblings grow → `minmax(0,fr)` + `min-h-0` everywhere.
- Kiosk shells: `fixed inset-0` so viewport is the only sizing authority.
- `min-height:auto` is the vertical twin of `min-width:auto`: flex/grid children need `min-h-0` on the vertical shrink chain.

### Radix
- ScrollArea viewport child is `display:table` → neutralize with CSS override in section 5.
- Radix hides native scrollbars → mount `<ScrollBar/>`; wheel-only is a UX bug.
- Radix scrollbar DOM uses `data-orientation` / `data-state`, NOT `data-radix-scroll-area-scrollbar`.

### Ghosts / forensics
- Trace import chain `App.tsx` → `Layout` → `Panel`; grep every matching name; mark LIVE vs GHOST; prove which file is served before editing.
- Before deleting, grep ALL consumers incl. tests/debug scripts; delete ghost + tests + debug harness atomically.
- `git show --stat HEAD` / `git log -5` to check whether previous slice touched source or only tests/docs.

### jsdom
- No layout math (see 2.5). Assert `className`/source, not computed pixels. CEO screenshot = layout acceptance.

### Misc
- Never hardcode `D:\` in frontend; Vite relative imports.
- "File not found" is a lookup task, never a stop reason.
- Absence tests keep removed features removed.
- Per-locale icon inside translation string = i18n owns the whole message (CEO 2026-08-08).
- GitHub noreply commit email keeps identity swappable.

### Phase 7 — Backend
- Always `py -3.12`, NEVER bare `python`. System default may be 3.14+ lacking native wheels for `llama-cpp-python`.
- Backend binds `127.0.0.1` only; local-first means localhost-first.
- Error hints mislead ('provide the mmproj' appeared with mmproj attached); probe with minimal auditable scripts.
- Golden outputs are references, not truth; original file + human review is the standard.
- Disk is truth: list `models/` with sizes before asserting engine location.
- Engine swap = recipe swap: prompt, sampling, geometry travel together (ADR-006).
- Production defaults must match spike recipe or spike evidence is void.
- YAGNI: Ovis is the sole engine; external backup for disaster recovery only.
- Strict Matt Pocock TDD: RED→GREEN→REFACTOR. Tests updated before implementation.
- S2-S4 locked Ovis recipe: verbatim prompt + temp 0.1 + full-page normalization (no tiling). GFM stdlib converter prevents frontend HTML table breakage.
