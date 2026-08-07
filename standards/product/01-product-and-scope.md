# PRD: Scan2Text — MVP

Version: 1.6
Date: 2026-08-07
Status: Approved for Implementation
Product Owner: CEO
Technical Owner: CTO
Engineering Method: AI-Assisted Software Development (AIASD)

## Change Log

| Version | Date | Changes |
| --- | --- | --- |
| 1.0 | 2026-06-22 | Initial PRD |
| 1.1 | 2026-06-22 | Clarifications |
| 1.2 | 2026-06-22 | Clarified no merged output, removed in-app editing, unsupported files skipped |
| 1.3 | 2026-08-06 | Integrated output naming convention, updated model to GLM-OCR 0.9B, added Phase 5 UI decisions: Command Center layout, i18n, dark mode, file validation 50MB max |
| 1.4 | 2026-08-07 | Beautify-phase UI deltas: panel ratios 20/35/45 → 20/20/60, right panel renders Markdown full-width, queue Remove button removed from MVP, queue status indicators refined, accepted file types locked to PNG/JPG/JPEG/WEBP/PDF, final visual styling locked |
| 1.5 | 2026-08-07 | Visual identity finalized: coffee & paper palette replaces zinc+purple, panel card borders removed, depth via vertical gradients + inset top highlight + soft shadows + warm glow, top bar identity updated, radiant-lines background recolored warm |
| 1.6 | 2026-08-07 | Phase 6 Finale deltas (CEO-approved): layout 20/20/60 → 34/60 + 2% gutters; left work column contains Dropzone fixed ~38% + Queue flex; app shell viewport-locked (`h-screen`); Dropzone/Queue/Preview ScrollAreas with always-visible thin warm scrollbars; TopBar wordmark is literal brand text and i18n-exempt; BottomBar adds icon-only Share on left while worker/RAM/version is centered; Dropzone gets bold ink-black text + colored upload icon left + smile emoji right; depth is subtle gradient+shadow on all cards via theme-aware inline longhand styles; Queue card gets radiant rays; share uses placeholder `https://placeholder.local` |

---

## 1. Product Name

Display name: Scan2Text

Internal package name: `scan2text`

Executable name: `Scan2Text.exe`

---

## 2. Product Vision

Scan2Text is a simple, portable, offline OCR tool.

Users drag and drop images or PDFs into the app. Scan2Text processes them locally and produces Markdown files.

The product flow is:

Drop files → process locally → get Markdown files → edit outside Scan2Text if needed.

Scan2Text does not try to become a full document editor. It converts documents into usable Markdown output.

The v1.6 visual direction makes the app feel like a warm, stable scanning desk: viewport-locked, calm, coffee-and-paper themed, with visible affordances and no unnecessary page scrolling.

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
- A warm, calm, desktop-first UI that stays visually stable and does not scroll like a web page.

---

## 6. MVP Objective

The MVP must prove that a user can:

- launch Scan2Text portably,
- drop one or more images/PDFs,
- process them locally,
- receive one Markdown file per valid input file,
- open/edit those Markdown files using external tools.

The MVP is not a document editor.

The v1.6 MVP UI objective is also to prove that the app shell is visually correct, viewport-locked, warm, and stable:

- no page scroll,
- visible wordmark,
- visible scroll affordances,
- correct card depth,
- correct bottom bar composition,
- restored queue row metadata and status indicators.

---

## 7. Product Scope

### Must-Have for MVP

- Portable Windows app
- Drag-and-drop file input
- Image support: PNG, JPG/JPEG, WEBP
- PDF support for simple scanned PDFs
- Local OCR using GLM-OCR 0.9B model (`vlm.gguf` + `mmproj.gguf`)
- Vision module/mmproj support
- Model loading on demand
- FIFO processing queue
- Unsupported/error files skipped and logged in batch processing
- Automatic Markdown output
- One Markdown file per valid input file
- Best-effort preservation of simple structure such as tables/lists
- Settings screen
- Portable folder structure
- Offline operation after initial download
- GitHub-based update check
- Clear error handling
- Local logging
- Command Center UI: v1.6 viewport-locked shell with left work column, right Live Preview, and bottom status bar
- Left work column containing Dropzone and Queue
- Layout: 34/60 + 2% gutters, superseding 20/20/60
- Dropzone fixed at approximately 38% of left work column space, with Queue flexing into the remaining space
- ScrollAreas for Dropzone, Queue, and Preview
- Always-visible thin warm scrollbars as affordances
- Viewport-locked app shell using `h-screen` or equivalent
- No browser/body page scroll in normal desktop use
- TopBar literal brand wordmark: `Scan2Text`
- Wordmark i18n-exempt
- BottomBar with icon-only Share button on the left
- BottomBar worker/RAM/version group centered
- Share placeholder target: `https://placeholder.local`
- Dropzone personality: bold ink-black text, colored upload icon on the left, smile emoji on the right
- Card depth on all primary cards via theme-aware inline longhand styles
- Subtle gradient + shadow depth recipe
- Radiant rays on Queue card
- Dark mode default with light mode toggle
- Internationalization (i18n): English + Indonesian, auto-detect browser language
- File validation: Max 50MB per file, reject unsupported types with toast notification

### Should-Have

- Per-file progress indicator (fake progress: 0→90% over 30s, jump to 100% on completion)
- ETA indicator
- Read-only result preview
- Open output folder button
- Update notification in title bar
- Log rotation
- Auto-select: Right panel automatically shows result when job completes
- Queue cancel action for in-progress jobs (future; requires backend cancel endpoint)
- Share button wired to placeholder target in preparation for the later share slice

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
- Queue Remove button (removed 2026-08-07; queue is memory-only and clears on restart; may revisit in Phase 2)
- Side-by-side image thumbnail comparison (Phase 2 compare-toggle candidate)
- Hover-only or invisible scrollbars
- Page-level scrolling of the main app shell
- Flat primary cards without depth
- Translating the literal brand wordmark
- Production share URL or final share destination until post-GitHub swap

---

## 8. Core User Flow

### Primary Flow

1. User opens `Scan2Text.exe`.
2. On first run, user chooses output location.
3. App creates required folders and settings file if missing.
4. User drags one or more images/PDFs into the Dropzone in the left work column.
5. File validation checks file type (PNG/JPG/JPEG/WEBP/PDF) and size (max 50MB). Invalid files show an error toast and are not uploaded.
6. User clicks Process All, or files auto-process on drop if that behavior is enabled.
7. Unsupported or invalid files are skipped and logged.
8. App loads OCR model if not already loaded.
9. Valid files are processed in FIFO order.
10. Each valid input file produces one Markdown file.
11. Completed results can be previewed in the right panel.
12. User opens the Markdown file using their preferred external editor.

---

## Command Center Layout (v1.6)

The app uses a viewport-locked Command Center shell.

The shell contains:

- TopBar
- Main content area
- BottomBar

The app must fit inside one desktop viewport. The browser/body must not scroll. Only designated internal panels may scroll.

### Main Layout

The main content area uses the v1.6 layout:

- Left work column: approximately 34% width
- Right preview column: approximately 60% width
- Gutter/spacing budget: approximately 2%

This supersedes the previous 20/20/60 layout.

The left work column contains:

- Dropzone card
- Queue card

The right preview column contains:

- Live Preview card

Panel widths remain fixed and are not resizable.

### Left Work Column

The left work column is a single work column containing both Dropzone and Queue.

Dropzone behavior:

- The Dropzone card is fixed at approximately 38% of the left work column height.
- The Dropzone must remain visually prominent.
- The Dropzone must support drag-and-drop.
- The Dropzone must support click-to-browse as a fallback.
- The Dropzone must show a highlighted state when files are dragged over.
- The Dropzone text must be bold ink-black.
- The Dropzone must show a colored upload icon on the left.
- The Dropzone must show a smile emoji on the right.

Queue behavior:

- The Queue card occupies the remaining left-column space using flex.
- The Queue card must scroll internally when queue content overflows.
- The Queue card must show file rows with file type icon, file name, status, and progress information.
- The Queue card must receive the warm radiant-ray visual treatment.
- The Queue card must not lose row metadata during visual polish work.

### Right Preview Column

The right preview column shows rendered Markdown full-width.

- The preview is read-only.
- The preview must scroll internally when content overflows.
- The preview must not cause page-level scrolling.
- When a completed job is selected, the preview shows the Markdown result.
- Auto-select may show the latest completed result automatically.

### Scroll Behavior

The app uses internal ScrollAreas for:

- Dropzone
- Queue
- Preview

Scroll rules:

- The main window/body must not scroll.
- Queue and Preview are the primary content-scrolling regions.
- Dropzone has a ScrollArea as part of the v1.6 visual affordance system.
- Scrollbars must be always visible, thin, rounded, and warm.
- Hover-only scrollbars are not allowed.
- Scrollbars are affordances, not hidden decorations.

### TopBar

The TopBar must contain the literal brand wordmark:

`Scan2Text`

The wordmark is i18n-exempt.

The TopBar may retain the logo pictogram chip and DEMO badge where they do not hide or replace the literal wordmark.

The TopBar must also contain icon-only buttons with tooltips for:

- theme toggle
- language toggle
- settings

### BottomBar

The BottomBar must remain visible at all times.

The BottomBar composition is:

- Left: icon-only Share button
- Center: worker status, RAM usage, version
- Right: no required content in v1.6

The Share button uses the placeholder target:

`https://placeholder.local`

This placeholder will be swapped after the GitHub/sharing flow is available.

---

## 9. Output Naming Convention

### Format

Every output Markdown file follows this pattern:

`{original_stem}_{HHmm}_{yyyyMMdd}.md`

Where:

- `original_stem` — the sanitized stem of the input filename. Invalid Windows characters are removed, spaces are collapsed to underscores, and reserved names are handled.
- `HHmm` — 24-hour clock time, zero-padded. Example: `0905`, `1738`.
- `yyyyMMdd` — calendar date, zero-padded. Example: `20260804`.

### Examples

| Input file | Output file |
| --- | --- |
| invoice.pdf | invoice_1738_20260804.md |
| my scan.png | my_scan_1738_20260804.md |
| report (copy).jpg | report_copy_1738_20260804.md |

### Collision Rule

If a file with the target name already exists in the output directory, append a numeric suffix starting at `_2`:

1. Try `{stem}_{HHmm}_{yyyyMMdd}.md`
2. If that exists, try `{stem}_{HHmm}_{yyyyMMdd}_2.md`
3. If that exists, try `{stem}_{HHmm}_{yyyyMMdd}_3.md`
4. Continue incrementing until an unused name is found.

Never overwrite an existing file. Never merge multiple inputs into one output file.

### Guardrails

- One input file → one output file. Always.
- The timestamp reflects the processing time, not the source file's modification time.
- Privacy-safe: logs record only the filename and byte count, never content.
- No new dependencies are required.

### Implementation Notes

- The timestamp is captured at write time using `datetime.now()`.
- Collision resolution is a linear search. Practical collision counts are expected to be small, typically 0 or 1.
- The `PathService.resolve_output_path()` method is the single point of naming logic. All callers go through this method.

---

## 10. Internationalization (i18n)

### Approach

- Library: react-i18next
- Languages: English (`en`), Indonesian (`id`)
- Default: Auto-detect browser language, fallback to English
- Toggle: Top bar button next to theme toggle
- Persistence: Language preference saved to localStorage

### Scope

- All UI strings are translation keys.
- Known backend errors are mapped to translated messages.
- Unknown errors show as-is in English.
- Initial translations are drafted by AI and reviewed/adjusted by CEO.

### Wordmark Exception

The literal brand wordmark `Scan2Text` is i18n-exempt.

It must not be translated, replaced by a localized phrase, or hidden behind an icon-only logo.

---

## 11. Theme

### Theme Behavior

- Default: Dark mode
- Toggle: Light mode available via top bar button
- Persistence: Theme preference saved to localStorage
- Theme change applies immediately without page reload
- All UI components must support both themes

### Design Language

The design language is “coffee & paper.”

The app should feel like a warm, calm paper desk.

The identity is:

- layered warm surfaces
- no panel card borders
- subtle depth
- soft shadows
- warm glow
- paper-on-desk minimalism

### Color Palette

DARK:

- background: `#080502`
- left card: `#E1DCC9`
- left text: ink `#1F150C`
- center/queue warmth: `#412D15`
- center text: cream `#F2EBDD`
- right card: `#1F150C`
- right text: cream
- accent: `#E3A55F` caramel

LIGHT:

- background: `#F9F8F6`
- left: `#EFE9E3`
- center: `#D9CFC7`
- right: `#C9B59C`
- text: dark text
- accent: `#92400E` coffee

Purple is retired.

DEMO badge amber is retained where the DEMO badge is shown.

Green/red status dots are retained.

### Depth

All primary cards must have subtle depth.

Primary cards are:

- Dropzone card
- Queue card
- Preview card

Depth must be created using:

- subtle gradient
- soft shadow
- theme-aware styling
- inline longhand styles

Depth must not depend on a single utility class as the source of truth.

Cards must not appear flat.

The Queue card must include subtle radiant rays.

The radiant rays must be static and zero-CPU at idle.

### Dropzone Personality

The Dropzone must feel friendly and clear.

Required Dropzone visual traits:

- bold ink-black text
- colored upload icon on the left
- smile emoji on the right

The Dropzone must not appear faded or low-contrast.

### Scrollbars

Scrollbars are affordances.

Required scrollbar traits:

- always visible
- thin
- rounded
- warm
- theme-aware

Dark theme:

- caramel thumb
- translucent track

Light theme:

- coffee thumb
- soft track

Hover-only scrollbars are not acceptable.

### Typography

- Display font: Quantico for titles, headings, badges, metrics, and brand-style display elements
- Body font: readable swap-friendly body font
- Body font remains open for final CEO taste selection
- Body font should be controlled through a single CSS variable where practical

---

## 12. Technical Decisions (Locked)

### Model & Inference

- VLM Model: GLM-OCR 0.9B (`vlm.gguf` + `mmproj.gguf`)
- Runner: llama-cpp-python
- Hardware: CPU-only
- GPU intentionally excluded for portability

### PDF Handling

- PDF handling likely requires PDF-to-image conversion before VLM inference.
- Raw PDF bytes may not be directly supported by the VLM.
- Implementation must verify the PDF-to-image pipeline.

### Frontend

- Framework: Vite + React + TypeScript + Tailwind + shadcn
- State: Zustand, memory-only, no localStorage for job state
- Markdown: react-markdown + remark-gfm
- Router: None for MVP. Single-page Command Center dashboard.
- Transport: HTTP polling for task status. WebSockets deferred.

### App Shell

- The app shell must be viewport-locked.
- Use `h-screen` or equivalent full-viewport layout.
- The browser/body must not scroll in normal desktop use.
- Only internal panel regions may scroll.

### Layout

- Main layout: 34/60 + 2% gutters.
- This supersedes 20/20/60.
- Left work column contains Dropzone and Queue.
- Dropzone is fixed at approximately 38% of the left work column height.
- Queue flexes into the remaining left-column space.
- Right preview column contains the Live Preview.
- Panel widths are fixed and not resizable.

### Scroll Areas

- Dropzone, Queue, and Preview must use ScrollAreas.
- Queue and Preview are the main internal scrolling regions.
- Scrollbars must always be visible.
- Scrollbars must be thin, rounded, and warm.
- Scrollbars must not be hover-only.
- Scrollbar affordance is part of the v1.6 visual contract.

### Styling

- Coffee & paper warm palette.
- No panel card borders.
- Depth via subtle gradient + shadow.
- Card depth must be applied using theme-aware inline longhand styles.
- All primary cards must have depth.
- Queue card must have radiant rays.
- Dropzone must use bold ink-black text.
- Dropzone must include colored upload icon on the left.
- Dropzone must include smile emoji on the right.
- Hover-only or invisible scrollbars are not allowed.
- Flat cards are not allowed.

### TopBar

- TopBar must show literal brand wordmark: `Scan2Text`.
- The wordmark is i18n-exempt.
- TopBar must include icon-only buttons with tooltips for theme, language, and settings.
- The rendered TopBar must be the live TopBar in the actual App import chain.

### BottomBar

- BottomBar must include icon-only Share button on the left.
- BottomBar must include worker status, RAM usage, and version centered.
- Share target uses placeholder: `https://placeholder.local`.
- Final share URL will be swapped after GitHub/sharing availability.

### Queue Behavior

- Progress: fake progress bar, 0→90% over 30 seconds, jump to 100% on completion.
- Auto-select: right panel automatically shows result when job completes.
- Background jobs: if polling exceeds 30 seconds, mark as background and auto re-poll every 60 seconds, max 10 re-polls.
- Queue actions: cancel in-progress jobs is future. No Remove button in MVP.
- Queue rows must retain file type icon, file name, size, status indicator, tooltip, and thin fake progress bar.

### State & Persistence

- Job state is memory-only.
- Theme preference persists to localStorage.
- Language preference persists to localStorage.
- No job data, task IDs, file content, or file metadata may be persisted to localStorage/sessionStorage.