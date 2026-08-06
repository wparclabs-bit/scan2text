# PRD: Scan2Text — MVP
Version: 1.3
Date: 2026-08-06
Status: Approved for Implementation
Product Owner: CEO
Technical Owner: CTO
Engineering Method: AI-Assisted Software Development (AIASD)

## Change Log

| Version | Date       | Changes |
|---------|------------|---------|
| 1.0     | 2026-06-22 | Initial PRD |
| 1.1     | 2026-06-22 | Minor clarifications |
| 1.2     | 2026-06-22 | Clarified no merged output, removed in-app editing, unsupported files skipped |
| 1.3     | 2026-08-06 | Integrated output naming convention (from addendum 05), updated model to GLM-OCR 0.9B, added Phase 5 UI decisions (Command Center layout, i18n, dark mode, file validation 50MB max) |

---

## 1. Product Name
Display name: Scan2Text
Internal package name: `scan2text`
Executable name: `Scan2Text.exe`

## 2. Product Vision
Scan2Text is a simple, portable, offline OCR tool.
Users drag and drop images or PDFs into the app. Scan2Text processes them locally and produces Markdown files.
The product flow is:
Drop files → process locally → get Markdown files → edit outside Scan2Text if needed.

Scan2Text does not try to become a full document editor. It converts documents into usable Markdown output.

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

## 4. Target User
**Primary users:**
- office workers
- administrative staff
- operators
- field workers
- users in low-connectivity areas
- non-technical Windows users

**Primary environment:**
- Windows 10 or Windows 11
- CPU-only machines acceptable
- offline or unstable internet
- portable app usage without admin rights

## 5. Core Value Proposition
Scan2Text provides:
- Offline OCR after initial download.
- Portable Windows app with no complex installer.
- High-accuracy raw text extraction from images and PDFs.
- One Markdown output file per input document.
- Best-effort preservation of simple structure such as lists and tables.
- Simple UX for non-technical users.

## 6. MVP Objective
The MVP must prove that a user can:
- launch Scan2Text portably,
- drop one or more images/PDFs,
- process them locally,
- receive one Markdown file per valid input file,
- open/edit those Markdown files using external tools.

The MVP is not a document editor.

## 7. Product Scope

### Must-Have for MVP
- Portable Windows app
- Drag-and-drop file input
- Image support: JPEG, PNG, TIFF, BMP, WEBP
- PDF support for simple scanned PDFs
- Local OCR using GLM-OCR 0.9B model (vlm.gguf + mmproj.gguf)
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
- **Command Center UI:** 3-panel dashboard (Drop Zone / Queue / Live Preview) + bottom status bar
- **Dark mode default** with light mode toggle
- **Internationalization (i18n):** English + Indonesian, auto-detect browser language
- **File validation:** Max 50MB per file, reject unsupported types with toast notification

### Should-Have
- Per-file progress indicator (fake progress: 0→90% over 30s, jump to 100% on completion)
- ETA indicator
- Read-only result preview
- Open output folder button
- Update notification in title bar
- Log rotation
- **Auto-select:** Right panel automatically shows result when job completes
- **Queue actions:** Remove completed/failed jobs, cancel in-progress jobs (future)

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

## 8. Core User Flow

### Primary Flow
1. User opens `Scan2Text.exe`.
2. On first run, user chooses output location.
3. App creates required folders and settings file if missing.
4. User drags one or more images/PDFs into the left panel (Drop Zone).
5. **File validation:** DropZone checks file type (PNG/JPG/JPEG/WEBP/PDF) and size (max 50MB). Invalid files show error toast and are not uploaded.
6. User clicks Process All (or files auto-process on drop).
7. Unsupported or invalid files are skipped and logged.
8. App loads OCR model if not already loaded.
9. Valid files are processed in FIFO order.
10. Each valid input file produces one Markdown file.
11. User opens the Markdown file using their preferred external editor.

### Command Center Layout
- **Left Panel (20% width):** Drop Zone
- **Center Panel (35% width):** Queue table showing file name, status, progress bar
- **Right Panel (45% width):** When a completed job is selected, shows image thumbnail (30% width) + rendered Markdown (70% width) side-by-side
- **Bottom Bar:** Worker status (Idle/Busy), RAM usage, version number
- **Top Bar:** App title, theme toggle (🌙/☀️), language toggle (🌐 EN/ID), settings icon

## 9. Output Naming Convention

### Format
Every output Markdown file follows this pattern: {original_stem}_{HHmm}_{yyyyMMdd}.md


Where:
- `original_stem` — the sanitized stem of the input filename (invalid Windows characters removed, spaces collapsed to underscores, reserved names handled).
- `HHmm` — 24-hour clock time, zero-padded (e.g., `0905`, `1738`).
- `yyyyMMdd` — calendar date, zero-padded (e.g., `20260804`).

### Examples
| Input file | Output file |
|------------|-------------|
| invoice.pdf | invoice_1738_20260804.md |
| my scan.png | my_scan_1738_20260804.md |
| report (copy).jpg | report_copy_1738_20260804.md |

### Collision Rule
If a file with the target name already exists in the output directory, append a numeric suffix starting at `_2`:
1. Try `{stem}_{HHmm}_{yyyyMMdd}.md`
2. If it exists, try `{stem}_{HHmm}_{yyyyMMdd}_2.md`
3. If that exists, try `{stem}_{HHmm}_{yyyyMMdd}_3.md`
4. Continue incrementing until an unused name is found.

**Never overwrite an existing file. Never merge multiple inputs into one output file.**

### Guardrails
- One input file → one output file. Always.
- The timestamp reflects the processing time, not the source file's mtime.
- Privacy-safe: logs record only the filename and byte count, never content.
- No new dependencies required.

### Implementation Notes
- The timestamp is captured at write time using `datetime.now()`.
- Collision resolution is linear search; practical collision counts are expected to be small (typically 0 or 1).
- The `PathService.resolve_output_path()` method is the single point of naming logic. All callers go through this method.

## 10. Internationalization (i18n)

### Approach
- **Library:** react-i18next
- **Languages:** English (en), Indonesian (id)
- **Default:** Auto-detect browser language, fallback to English
- **Toggle:** Top bar button next to theme toggle
- **Persistence:** Language preference saved to localStorage

### Scope
- All UI strings are translation keys
- Known backend errors are mapped to translated messages
- Unknown errors show as-is (English)
- Initial translations drafted by AI, reviewed and adjusted by CEO

## 11. Theme

- **Default:** Dark mode
- **Toggle:** Light mode available via top bar button
- **Persistence:** Theme preference saved to localStorage

## 12. Technical Decisions (Locked)

### Model & Inference
- **VLM Model:** GLM-OCR 0.9B (vlm.gguf + mmproj.gguf)
- **Runner:** llama-cpp-python
- **Hardware:** CPU-only (GPU intentionally excluded for portability)
- **PDF Handling:** Likely requires PDF-to-image conversion before VLM inference (unverified)

### Frontend
- **Framework:** Vite + React + TypeScript + Tailwind + shadcn
- **State:** Zustand (memory-only, no localStorage for job state)
- **Markdown:** react-markdown + remark-gfm (GitHub Flavored Markdown)
- **Router:** None for MVP (single-page Command Center dashboard)
- **Transport:** HTTP Polling for task status (WebSockets deferred from Sprint 1)

### Queue Behavior
- **Progress:** Fake progress bar (0→90% over 30 seconds, jump to 100% on completion)
- **Auto-select:** Right panel automatically shows result when job completes
- **Background jobs:** If polling exceeds 30 seconds, mark as background and auto re-poll every 60 seconds (max 10 re-polls)
- **Queue actions:** Remove completed/failed jobs, cancel in-progress jobs (future)