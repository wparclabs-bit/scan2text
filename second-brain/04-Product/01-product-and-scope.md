# PRD: Scan2Text — MVP

Version: 1.11
Date: 2026-08-13
Status: Approved for Implementation
Product Owner: CEO
Technical Owner: CTO
Engineering Method: AI-Assisted Software Development (AIASD)

## Change Log

| Version | Date       | Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | 2026-06-22 | Initial PRD                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 1.1     | 2026-06-22 | Clarifications                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 1.2     | 2026-06-22 | Clarified no merged output, removed in-app editing, unsupported files skipped                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 1.3     | 2026-08-06 | Integrated output naming convention, updated model to GLM-OCR 0.9B, added Phase 5 UI decisions (Command Center layout, i18n, dark mode, file validation 50MB max)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 1.4     | 2026-08-07 | Beautify-phase UI deltas: panel ratios → 20/20/60; full-width Markdown preview; queue Remove button removed; status indicators refined; file types locked PNG/JPG/JPEG/WEBP/PDF                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 1.5     | 2026-08-07 | Visual identity finalized: coffee & paper palette; no panel borders; depth via gradients + inset highlight + soft shadows + warm glow; top bar logo chip + live-text wordmark + DEMO badge                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 1.6     | 2026-08-07 | Phase 6 Finale deltas: layout 20/20/60 → 34/60 + 2% gutters; left work column (Dropzone fixed ~38% + Queue flex); viewport-locked shell; Dropzone/Queue/Preview ScrollAreas with always-visible warm scrollbars; literal TopBar wordmark; BottomBar share-left + centered telemetry; Dropzone personality (bold ink text, upload icon left, smile emoji right); theme-aware inline longhand card depth; Queue radiant rays; share placeholder https://placeholder.local; queue row regression contract (icon + name + size + status + tooltip + fake progress)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 1.7     | 2026-08-07 | Visual hotfix finale (CEO-approved): wordmark becomes CENTER brand image (text.png 153×34, alt="Scan2Text", static glow) — no literal text wordmark; logo chip + DEMO badge kept intact on left (DEMO removed after final product); TopBar height 34px, all items vertically centered; Share icon moved to BottomBar RIGHT; BottomBar left empty, center telemetry (Worker Idle/Busy from queue · RAM "—" until /health · version constant), pinned at any window size via fixed inset-0 shell; Dropzone: dashed area fills card, bg image bacground-left-top-panel.jpg at 15% opacity (single-value background-size, centered), header + footer bold ink #1F150C, footer adds "max 10 files per batch", Dropzone ScrollArea removed; 10-file batch cap enforced (first 10 + warning toast + logged); queue status slot fixed 14px, dot-only no text (grey pending / yellow spinner processing / glossy green completed / glossy red failed); depth = visible-subtle gradation on all cards; Preview header buttons borderless transparent with caramel hover; Radix ScrollArea tray neutralized via CSS override |
| 1.8     | 2026-08-08 | \| 1.8 \| 2026-08-08 \| Phase 6 closure (CEO-approved): fake progress bar removed from MVP — deferred to v2/v3 on user feedback (single status indicator stays in the right 14px slot); 1vh vertical gutter between TopBar and main; queue empty-state copy finalized with per-locale icons inside strings (📭 EN / 🙈 ID); pathological short-window = documented accepted edge; dropzone upload icon centered+bold deferred to Phase 7; Phase 6 marked COMPLETE (QA gate: first run 37/48 → fixes → re-run all green) \|                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 1.9     | 2026-08-10 | ADR-006: primary OCR engine = OvisOCR2 0.9B (Apache-2.0) via llama-cpp-python; GLM-OCR removed from codebase (external backup only); §7/§12 model lines updated; FR-08 asset-folder exception for chart crops; known-defect register accepted |
| 1.10    | 2026-08-10 | ADR-007: feedback button (GForm + offline queue) in BottomBar left of Share; first-run expectations screen with don't-show-again; CPU auto = 60% of logical cores; GDrive distribution + in-app model downloader; logs no file names, 1 MB size-based rotation; monthly cadence |
| 1.11    | 2026-08-13 | DOC-04: aligned §12 with ADR-008; added Tauri v2 desktop shell & packaging line; fixed version drift (header was 1.9) |

---

## 1. Product Name

Display name: Scan2Text
Internal package name: `scan2text`
Executable name: `Scan2Text.exe`
Brand wordmark: center TopBar image `frontend/Images/text.png` (153×34) with `alt="Scan2Text"` (v1.7; supersedes literal text wordmark)

---

## 2. Product Vision

Scan2Text is a simple, portable, offline OCR tool.

Users drag and drop images or PDFs into the app. Scan2Text processes them locally and produces Markdown files.

The product flow is:

Drop files → process locally → get Markdown files → edit outside Scan2Text if needed.

Scan2Text does not try to become a full document editor. It converts documents into usable Markdown output.

Scan2Text is the first product of a planned local-first family (ASR agent and summary capability planned as separate phases/products; NOT in MVP scope).

---

## 3. Problem Statement

Office workers often need to convert scanned images and PDFs into editable text.

Existing tools often:

- require internet access
- require complicated installation
- require accounts or subscriptions
- produce poor-quality output
- are difficult for non-technical users

Scan2Text solves this by being:

- offline
- portable
- simple
- focused on text extraction
- Markdown-output-first

---

## 4. Target User

Primary users:

- office workers
- administrative staff
- operators
- field workers
- users in low-connectivity areas
- non-technical Windows users

Primary environment:

- Windows 10 or Windows 11
- CPU-only machines acceptable
- offline or unstable internet
- portable app usage without admin rights

---

## 5. Core Value Proposition

Scan2Text provides:

- Offline OCR after initial download.
- Portable Windows app with no complex installer.
- High-accuracy raw text extraction from images and PDFs.
- One Markdown output file per input document.
- Best-effort preservation of simple structure such as lists and tables.
- Simple UX for non-technical users.
- A warm, calm, viewport-locked desktop surface that behaves like an appliance, not a web page.

---

## 6. MVP Objective

The MVP must prove that a user can:

- launch Scan2Text portably,
- drop one or more images/PDFs (max 10 per batch),
- process them locally,
- receive one Markdown file per valid input file,
- open/edit those Markdown files using external tools.

The MVP is not a document editor.

---

## 7. Product Scope

### Must-Have for MVP

- Portable Windows app
- Drag-and-drop file input
- Image support: PNG, JPG/JPEG, WEBP
- PDF support for simple scanned PDFs
- Local OCR using OvisOCR2 0.9B model (vlm.gguf + mmproj.gguf) via llama-cpp-python, CPU-only, temp 0.1 default (ADR-006)
- Vision module/mmproj support
- Model loading on demand
- FIFO processing queue
- Unsupported/error files skipped and logged in batch processing
- Batch cap: max 10 files per drop (first 10 kept, extras skipped + warning toast + logged)
- Automatic Markdown output
- One Markdown file per valid input file
- Best-effort preservation of simple structure such as tables/lists
- Settings screen
- Portable folder structure
- Offline operation after initial download
- GitHub-based update check
- Clear error handling
- Local logging
- Command Center UI v1.7: fixed inset-0 viewport-locked shell; TopBar (34px, center brand image); left work column (Dropzone + Queue); right Live Preview; pinned BottomBar
- Layout: 34/60 main split + ~2% gutters; left column tracks minmax(0,38fr)/minmax(0,62fr); fractions decide, content never resizes panels
- Dark mode default with light mode toggle
- Internationalization (i18n): English + Indonesian, auto-detect browser language
- File validation: Max 50MB per file, reject unsupported types with toast notification
- Queue status slot: fixed 14px, dot-only (grey/yellow-spinner/green/red) with translated tooltips + thin fake progress bar
- Persistent Info Screen: shows on every launch with "Welcome to Scan2Text" message and "Don't show this again" checkbox; choice persisted to settings.json
- BottomBar: center telemetry (Worker Idle/Busy · RAM "—" until /health · version) + RIGHT icon-only Share (placeholder https://placeholder.local, click = soft toast)
- Coffee & paper visual identity with visible-subtle gradation depth on all cards (theme-aware inline longhand styles)
- Dropzone: dashed area fills card; bg image at 15% opacity; bold ink header + footer text
- Queue status slot: fixed 14px, dot-only (grey/yellow-spinner/green/red) with translated tooltips (fake progress bar deferred to v2/v3, v1.8)
- Per-file progress indicator — DEFERRED to v2/v3 (v1.8 CEO decision 2026-08-08; MVP affordance = single spinner in status slot)
- Fake progress bar in MVP (removed v1.8 by CEO decision; revisit v2/v3 on user feedback)
- The app shell is pinned to the viewport: fixed inset-0 flex flex-col overflow-hidden. The screen is the only sizing authority. No window/body scroll at any window width or height. BottomBar always visible. A 1vh vertical gutter separates TopBar and main (v1.8).
- Row: file type icon + name (truncate) + size + fixed 14px status slot (dot-only) + translated tooltip + retry button on failed (fake progress bar deferred to v2/v3, v1.8).
- In-app first-run model auto-download: streaming to models/ via .part then atomic rename, expected-size verification, progress + cancel, translated errors (ADR-007)
- Feedback button (icon-only, BottomBar right, left of Share): online opens Google Form; offline captures to local feedback queue; launch-time pending reminder (ADR-007)
- First-run expectations screen, shown every launch until dismissed, re-openable from Settings (ADR-007)

### Should-Have

- Per-file progress indicator — DEFERRED to v2/v3 (v1.8 CEO decision 2026-08-08; MVP affordance = single spinner in status slot)
- ETA indicator
- Read-only result preview
- Open output folder button + Copy Markdown button (borderless, panel-colored, caramel hover)
- Update notification in title bar
- Log rotation
- Auto-select: Right panel automatically shows result when job completes
- Backend GET /health to replace RAM "—" placeholder with real values (separate slice)
- Queue cancel action for in-progress jobs (future; requires backend cancel endpoint)

### Won't-Have for MVP

- In-app editing (future slice)
- Cloud processing
- User accounts
- Mobile apps (desktop-only for MVP)
- Real-time integrations
- Multi-user support
- Advanced layout reconstruction
- Perfect table reconstruction
- DOCX/XLSX export
- Automatic self-updating installer
- Telemetry
- Paid licensing
- GPU support (CPU-only locked)
- Queue Remove button (Phase 2 candidate)
- Side-by-side image thumbnail comparison (Phase 2 compare-toggle candidate)
- Literal text wordmark in TopBar (superseded by center brand image, v1.7)
- Dropzone ScrollArea/scrollbar (removed v1.7; nothing scrolls there; affordance scrollbars remain on Queue + Preview)
- Share navigation to a live URL (placeholder + toast only until post-GitHub swap)
- DEMO badge removal (kept until final product, then removed)
- Hover-only or invisible scrollbars
- Flat cards without depth
- Fake progress bar in MVP (removed v1.8 by CEO decision; revisit v2/v3 on user feedback)
- Legal T&C dialog (replaced by plain expectations notice, ADR-007)
- Silent auto-send of feedback (opt-in submit only, ADR-007)

---

## 8. Core User Flow

### Primary Flow

1. User opens `Scan2Text.exe`.
2. On first run, user chooses output location.
3. App creates required folders and settings file if missing.
4. User drags one or more images/PDFs into the Dropzone (left work column).
5. File validation: type (PNG/JPG/JPEG/WEBP/PDF), size (max 50MB), batch cap (max 10 files). Invalid files show error toast; extras beyond 10 are skipped with warning toast and logged.
6. User clicks Process All (or files auto-process on drop).
7. Unsupported or invalid files are skipped and logged.
8. App loads OCR model if not already loaded.
9. Valid files are processed in FIFO order.
10. Each valid input file produces one Markdown file.
11. Completed results can be previewed in the right panel.
12. User opens the Markdown file using their preferred external editor.

---

## Command Center Layout (v1.7)

The app shell is pinned to the viewport: `fixed inset-0 flex flex-col overflow-hidden`. The screen is the only sizing authority. No window/body scroll at any window width or height. BottomBar always visible.

### TopBar (height 34px, all items vertically centered)

- LEFT: logo pictogram chip (`frontend/Images/logo.png`) + DEMO badge, kept intact (DEMO removed after final product). No literal text wordmark.
- CENTER: brand image `frontend/Images/text.png` at 153×34 with `alt="Scan2Text"`, static radial glow behind (CSS-only, zero CPU, "flying" but not too bright).
- RIGHT: theme toggle, language toggle, settings — icon-only with translated tooltips.

### Main Content (34/60 + ~2% gutters)

- Left work column (~34%): grid rows `minmax(0,38fr)` Dropzone + `minmax(0,62fr)` Queue.
- Right preview column (~60%): Live Preview, rendered Markdown full-width, read-only, internal scroll.

### Dropzone (top-left)

- Dashed upload area fills the card between bold header text and bold footer hint (flex-1 min-h-0).
- Background image `bacground-left-top-panel.jpg` (exact filename) at 15% opacity, single-value background-size 100%, centered, no-repeat, pointer-events none.
- Header text and footer hint: bold, ink #1F150C, both themes.
- Footer hint includes the 10-file rule: "PNG · JPG · WEBP · PDF — max 50MB per file · max 10 files per batch".
- No ScrollArea in Dropzone (v1.7).
### Queue (bottom-left)

- Internal scroll with always-visible warm scrollbar.
- Radiant rays decoration (static, zero CPU).
- Row: file type icon + name (truncate) + size + fixed 14px status slot (dot-only) + translated tooltip + thin fake progress bar while active + retry button on failed.

### BottomBar (pinned, shrink-0)

- LEFT: empty.
- CENTER: Worker Idle/Busy (derived from queue state) · RAM "—" (until GET /health) · version constant. Centered via grid 1fr auto 1fr, vertically centered.
- RIGHT: icon-only Share button, placeholder https://placeholder.local, translated tooltip, click = soft toast (no navigation).

---

## 9. Output Naming Convention

### Format

Every output Markdown file follows this pattern:

`{original_stem}_{HHmm}_{yyyyMMdd}.md`

Where:

- `original_stem` — the sanitized stem of the input filename.
- `HHmm` — 24-hour clock time, zero-padded.
- `yyyyMMdd` — calendar date, zero-padded.

### Examples

| Input file | Output file |
| --- | --- |
| invoice.pdf | invoice_1738_20260804.md |
| my scan.png | my_scan_1738_20260804.md |
| report (copy).jpg | report_copy_1738_20260804.md |

### Collision Rule

- If target exists, append `_2`, `_3`, … until unused.
- Never overwrite. Never merge inputs.

### Guardrails

- One input file → one output file. Always.
- Timestamp reflects processing time.
- Privacy-safe logs (filename + byte count only).
- No new dependencies.

---

## 10. Internationalization (i18n)

- Library: react-i18next. Languages: en + id. Default: auto-detect, fallback English.
- Toggle in TopBar; persisted to localStorage.
- All UI strings are translation keys, including toasts (share coming soon, max files warning) and tooltips.
- Brand exception: the center brand IMAGE with `alt="Scan2Text"` is i18n-exempt (v1.7; supersedes literal text wordmark exception).

---

## 11. Theme

- Default: Dark. Toggle: Light. Persisted to localStorage. Instant apply.
- Coffee & paper palette (v1.5): DARK bg #080502; Dropzone #E1DCC9 ink #1F150C; Queue #412D15 cream #F2EBDD; Preview #1F150C cream; accent #E3A55F. LIGHT bg #F9F8F6; #EFE9E3 / #D9CFC7 / #C9B59C; accent #92400E. Purple retired. DEMO amber retained. Green/red dots retained.
- Depth (v1.7): visible-subtle gradation on ALL cards via theme-aware inline longhand styles (gradient + inset top highlight + soft shadow + warm glow). No flat cards. No borders.
- Scrollbars: always-visible, thin, rounded, warm on Queue + Preview only (caramel thumb/translucent track dark; coffee thumb light).
- Typography: Quantico display + readable swap-friendly body font (single CSS variable; final choice open).

---

## 12. Technical Decisions (Locked)

- Model: OvisOCR2 0.9B (vlm.gguf + mmproj.gguf) via llama-cpp-python, CPU-only, temp 0.1 default (ADR-006).
- PDF: pypdfium2 rasterization verified (ADR-006).
- Frontend: Vite + React + TS + Tailwind + shadcn; Zustand memory-only; react-markdown + remark-gfm; no router; HTTP polling.
- Shell: `fixed inset-0 flex flex-col overflow-hidden`; main `flex-1 min-h-0`; grid `grid-cols-[34fr_60fr] gap-[2%]`; left rows `minmax(0,38fr)/minmax(0,62fr)`. Fractions decide; content never resizes panels.
- TopBar 34px; center brand image 153×34 alt="Scan2Text" + static glow.
- BottomBar pinned; telemetry center; Share right (placeholder + toast).
- Batch cap 10 files; 50MB per file; PNG/JPG/JPEG/WEBP/PDF only.
- Radix ScrollArea tray neutralized via CSS override (`[data-radix-scroll-area-viewport] > div { display:block; min-width:0; height:auto }`).
- CPU budget: cpu_threads=0 (auto) = 60% of logical cores (ADR-007); explicit values still override; worker priority stays lowered.
- Distribution: binaries on Google Drive, version.json on GitHub, download_url → GDrive (ADR-007).
- Desktop shell & packaging: Tauri v2 wraps the built React frontend; backend = PyInstaller folder artifact (scan2text-backend.exe) spawned as child process, lifecycle owned by Tauri; production backend 127.0.0.1:47351 (ADR-008).
- Release cadence monthly only (ADR-007).
- Logs: no file names, no content; 1 MB size-based rotation (ADR-007).
- Memory hygiene: every slice exits with green tests + commit + Phase-6 summary file + AGENTS.md lessons.