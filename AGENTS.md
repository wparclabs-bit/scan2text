# Scan2Text — Agent Operating Manual

> Read this file FIRST before every slice. Do NOT re-read PRD docs unless explicitly listed in the slice prompt.

---

## 1. Project Identity

Name: Scan2Text
Goal: Local-first, offline, portable OCR: images/PDFs to Markdown
Platform: Windows 10/11, x86_64, CPU-only, desktop-only
Method: AI-Assisted Software Development (AIASD)
Repo Root: D:\WingAI\Projects\scan2text
Frontend Dir: D:\WingAI\Projects\scan2text\frontend
Obsidian Vault: D:\WingAI\Projects\scan2text\second-brain

---

## 2. Commands (PowerShell ONLY)

Run from the frontend dir:
- npm run test (Vitest unit + integration)
- npm run typecheck (tsc --noEmit)
- npm run build (Vite production build)
- python -m pytest -q (backend, Phase 7 only)

ENVIRONMENT CONSTRAINTS — READ CAREFULLY
You are in PowerShell on Windows. You are NOT in bash/zsh/Linux.
- NEVER use: tail, head, grep, ls -la, cat, rm -rf, or pipes like "npm run test | tail".
- USE INSTEAD: Get-Content, Select-String, Get-ChildItem -Force, Remove-Item -Recurse -Force.
- Run commands directly and read the full output.
- If a command fails because of a Unix-ism, do NOT retry variations. Stop and use the PowerShell equivalent.

---

## 3. Engineering Rules (Non-Negotiable)

3.1 TDD: Red-Green-Refactor
- Write the FAILING test first. Run it. Confirm it fails.
- Write minimal code to pass. Run it. Confirm it passes.
- Refactor only after green. Never skip RED.

3.2 Micro-Slicing & Context Limit
- Agent context limit: 128k tokens. Stop at ~115k and output a compact handoff summary.
- Emergency stop command: "STOP. Give compact handoff summary only."
- One slice = one logical unit. No scope creep.

3.3 Code Quality
- Small atomic commits. No files outside slice scope.
- Skip generated files (node_modules, build output, caches).
- Pure utility functions separated from UI components.
- Store actions handle side effects; components stay declarative.

3.4 Testing Rules
- data-testid on all testable DOM elements. data-state for state testing.
- Use globalThis.setInterval / globalThis.setTimeout for fake timer compatibility.
- Mock navigator.clipboard in clipboard tests.
- react-markdown splits styled text: assert via container.textContent, NOT getByText.
- jsdom renders "* [ ]" but NOT "- [ ]". Avoid "- [ ]" in demo Markdown.
- NEVER use Object.values() or create new objects inside Zustand selectors. Use useMemo or useShallow from zustand/react/shallow.

3.5 i18n
- react-i18next. EN + ID. NO hardcoded strings in components. Ever.
- New strings go in BOTH src/locales/en.json AND src/locales/id.json.
- Inject resources via initI18n() in tests.

3.6 UI/UX Rules
- Toasts via sonner (mounted at app root).
- Desktop-only. Dark mode DEFAULT. Light via toggle.
- localStorage ONLY for theme + language. Jobs NEVER persist.
- shadcn/ui for standard components. lucide-react for icons.

---

## 4. Locked Architecture (The Command Center)

4.1 Layout
TOP BAR: Scan2Text title | theme toggle | language toggle | settings gear | DEMO badge
LEFT 20%: Drop Zone
CENTER 20%: Queue (FIFO)
RIGHT 60%: Preview (30% source | 70% Markdown) + Action Header when completed (CEO approved 2026-08-07)
BOTTOM BAR: Worker status | RAM usage | version | (share button, slice 20.6)

4.2 State Management
- Zustand, memory-only jobs. jobOrder[] for FIFO. One active job at a time.

4.3 Demo Mode (Phase 6)
- IS_DEMO_MODE flag in src/lib/demoMode.ts intercepts the API layer.
- PDF gets rich Markdown sample; images get simple Markdown.
- In-memory Map demo task store. Amber DEMO badge in TopBar.

4.4 Backend Contract (Phase 7, not wired yet)
- POST /process -> task_id. GET /status/{task_id}. GET /health.
- Polling: 15 x 2000ms = 30s, then background re-poll every 60s, max 10.

4.5 File Validation
- Max 50MB. PNG/JPG/JPEG/WEBP/PDF only (TIFF/BMP deferred to Phase 7).
- Invalid batch: ONE aggregated sonner toast. Invalid files never enter queue.

4.6 Output Naming
- {stem}_{HHmm}_{yyyyMMdd}.md with _2/_3 collision suffixes.
- Pure utility: src/lib/naming.ts -> generateOutputFilename().

4.7 Fake Progress
- 0 to 90% over 30s eased. Jump to 100% on completion. Red on failure. Pulse at 90% in background.

4.8 TAILWIND & THEME PIPELINE (CRITICAL — learned 2026-08-07)
- Tailwind is v3. postcss.config.js + tailwind.config.js are v3 format. NEVER install tailwindcss v4.
- src/index.css MUST start with the three directives: @tailwind base; @tailwind components; @tailwind utilities. A guardrail test enforces this. NEVER remove them.
- Dark mode = ".dark" class on <html> toggled by the preferences store. Do NOT use @media (prefers-color-scheme) for theme variables.
- NEVER reintroduce Vite template boilerplate (#root width:1126px, giant h1/h2 sizes, #social rules, code styling).
- Tailwind Preflight strips heading/list styles: rendered Markdown MUST use @tailwindcss/typography prose classes (added in slice 6.9).
- CEO locked palette 2026-08-07: "paper and coffee" warm identity. Purple retired. Dark: background #080502; surface-left #EDE8D8→#E1DCC9 fg #1F150C; surface-center #4D3619→#412D15 fg #F2EBDD; surface-right #2A1C10→#1F150C fg #F2EBDD; border #3B2A18; accent #E3A55F. Light: background #F9F8F6; surface-left #F7F2EC→#EFE9E3; surface-center #E2D9D0→#D9CFC7; surface-right #D2BFA8→#C9B59C; all foregrounds #1F150C; border #1F150C; accent #92400E. Depth: dark shadow 0 12px 32px -12px rgba(0,0,0,0.7)+inset highlight; light shadow 0 12px 32px -14px rgba(31,21,12,0.28)+inset highlight; warm radial glow dark-only. See second-brain hex table for full reference.

4.9 Key Patterns
- No React Router. Single-page state navigation.
- act() warnings in some QueuePanel tests are non-blocking.
- Vite config __dirname warning is non-blocking (fix in Phase 7).

---

## 5. Memory Protocol (Every Slice MUST)

1. Read AGENTS.md (this file) + second-brain/00-Current-State.md ONLY.
2. Read only ADRs/docs explicitly listed in the slice prompt.
3. Update 00-Current-State.md on state changes.
4. Create summary at second-brain/01-Agent-Memory/Phase-6/slice-{X}-{name}.md
   Format: What Changed | Key Decisions | Test Coverage | Open Questions

---

## 6. Current Phase & Status

Phases 1-5: COMPLETE. Phase 6: IN PROGRESS. Baseline: 415/415 tests, typecheck + build green.

Phase 6 slices:
- 19.4-patch DONE: Zustand infinite loop fix
- 20.1 DONE: multi-file batch validation + FIFO queue
- 20.2 DONE: Demo Mode core
- 20.3 DONE: Preview side-by-side 30/70
- 20.4 DONE: naming utility + Copy/Open Folder actions
- 20.5 DONE: fake system chrome + Settings Dialog
- 6.x DONE: Tailwind pipeline hotfix (directives added, Vite boilerplate removed, .dark consolidated, purple preserved)
- 6.9 NEXT: Visual Polish (thumbnail wiring, panel dividers, typography prose, DropZone hint)
- 20.6 QUEUED: Share button (bottom bar right, popup + shortened link + copy)
- Then: Phase 6 COMPLETE -> Phase 7 real backend

---

## 7. Known Tech Debt / Warnings

1. Vite __dirname warning (Phase 7).
2. act() warnings QueuePanel (non-blocking).
3. PDF-to-image pipeline unverified for the VLM.
4. Fake progress not wired to real backend.
5. No React Router; desktop-only.
6. Demo thumbnail object URL not yet wired into preview 30% column (fix in 6.9).
7. Panel dividers missing between the 3 main panels (fix in 6.9). NOTE: the line at ~69% width is the preview's INTERNAL 30/70 divider, NOT the center/right boundary (real boundary is 55%).
8. Markdown renders as plain text until typography plugin lands (fix in 6.9).

---

## 8. CEO Locked Decisions (Do NOT Override)

1. Demo Mode first with visible amber badge.
2. PDF in prototype (rich Markdown sample).
3. Export: Copy to clipboard + Open Folder (auto-save in Phase 7).
4. Multi-file FIFO queue.
5. Types: PNG/JPG/JPEG/WEBP/PDF only.
6. Preview 30/70 side-by-side, read-only. No in-app editing in MVP.
7. Invalid batch: one aggregated toast.
8. Fake chrome: static RAM/Worker (no timers).
9. Naming {stem}_{HHmm}_{yyyyMMdd}.md + collision suffix.
10. Settings: shadcn Dialog; disabled future inputs get lock emoji.
11. COFFEE-AND-PAPER PALETTE (CEO locked 2026-08-07): Dark bg #080502, surface-left #EDE8D8→#E1DCC9/fg #1F150C, surface-center #4D3619→#412D15/fg #F2EBDD, surface-right #2A1C10→#1F150C/fg #F2EBDD, border #3B2A18, accent #E3A55F. Light bg #F9F8F6, surface-left #F7F2EC→#EFE9E3, surface-center #E2D9D0→#D9CFC7, surface-right #D2BFA8→#C9B59C, all fg #1F150C, border #1F150C, accent #92400E. Depth: dark shadow 0 12px 32px -12px rgba(0,0,0,0.7)+inset highlight; light shadow 0 12px 32px -14px rgba(31,21,12,0.28)+inset highlight; warm radial glow dark-only. Purple retired everywhere.
12. Share button: bottom bar right next to version; popup with shortened download link + Copy button; placeholder URL for now (GitHub + free shortener created after app completion); shares APP link only, NEVER document content (NFR-02).
13. Visual polish slice (6.9) runs BEFORE share button slice (20.6).

---

## 9. Definition of Done (Per Slice)

- RED test confirmed before implementation. GREEN confirmed after.
- npm run test all passing (state new baseline count).
- npm run typecheck zero errors. npm run build success.
- i18n keys in BOTH en.json and id.json.
- data-testid on new testable elements.
- Obsidian state file + slice summary updated.
- No scope creep beyond NON-GOALS.

---

## 10. Prompt Efficiency Rule

This file holds all stable rules. Individual slice prompts should ONLY contain:
1. SLICE name  2. BASELINE  3. GOAL  4. NON-GOALS  5. TASKS  6. VERIFICATION  7. OBSIDIAN UPDATE  8. FINAL OUTPUT format.
Still include a 1-line CONTEXT reminder + the PowerShell constraints block in slice prompts.
NEVER use nested triple backticks when handing prompts or files to the CEO (copy breaks).

Frontend File Map (verified 2026-08-07)
Layout: src/components/layout/CommandCenterLayout.tsx | TopBar.tsx | BottomStatusBar.tsx | SettingsDialog.tsx
Panels: src/components/layout/panels/DropZonePanel.tsx | QueuePanel.tsx | PreviewPanel.tsx | MarkdownPreview.tsx
Dropzone: src/components/dropzone/FileDropZone.tsx
Store: src/stores/scan2text.store.ts
Utils: src/lib/naming.ts
UI primitives: src/components/ui/ (button, card, dialog, input, label, spinner, tooltip, scroll-area)
i18n: src/locales/en.json + src/locales/id.json
Theme tokens: src/index.css + tailwind.config.js
RULE: never guess paths. If a mapped file is missing, discover via Get-ChildItem. Never create a file at a guessed path.

## Lessons Learned (Slice 6.14d)

- Brand wordmark is an IMAGE with alt="Scan2Text"; tests assert alt, not literal text.
- Never hardcode D:\ paths in frontend code; Vite relative imports.
- Every slice exits with: green tests + commit + Phase-6 summary file. No exceptions.
- CEO taste overrides PRD: re-confirm layout deltas in writing before slicing.

## Lessons Learned (Slice 6.14e)

- Green-dot ghost cause: The live QueuePanel row component already had status dots but they used 2-stop gradients and `text-primary` spinner. A separate unused QueueRow component did NOT exist — the "ghost" was a perceived regression where depth/style changes made dots less visible. Always verify the ACTUAL live component before assuming a ghost.
- Single-value background-size rule: Use `backgroundSize: '100%'` (single value) for decorative bg layers — never `'100% 100%'` or `'cover'` which distort aspect ratio. CEO spec requires single percentage.
- Depth must be visible-subtle: Inline longhand boxShadow + backgroundImage on cards must produce perceptible depth without being garish. Dark: warm radial glow + inset highlight + soft outer shadow. Light: white top-highlight + brown fade + soft brown shadow. No flat cards. No purple.
- jsdom hex→rgb conversion: Tests asserting inline hex colors on SVG/HTML elements must check rgb() computed values, not hex strings. Use `innerHTML.toContain('rgb(...)')` or assert className instead.
- Spinner inline style on SVG: React passes inline style to SVG elements but jsdom may render it as rgb(). Check via `innerHTML` or `getAttribute('style')` with null guard.
- Radix Tooltip portals content: TooltipContent renders in a DOM portal, not inside the triggering component's tree. Test tooltip markup via parent innerHTML or skip portal-dependent assertions.