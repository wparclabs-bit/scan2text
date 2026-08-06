# Functional Requirements — Scan2Text MVP
Version: 1.3
Date: 2026-08-06
Status: Approved for Implementation

## Change Log

| Version | Date       | Changes |
|---------|------------|---------|
| 1.0     | 2026-06-22 | Initial functional requirements |
| 1.1     | 2026-06-22 | Minor clarifications |
| 1.2     | 2026-06-22 | Removed in-app editing (FR-07), updated output naming |
| 1.3     | 2026-08-06 | Integrated output naming addendum (05) into FR-08. Updated FR-02 to Command Center layout. Added WEBP to file types. Reduced max file size to 50MB. Added file validation with toast. Added fake progress, auto-select, background re-poll to FR-04. Added FR-13 (i18n) and FR-14 (Theme). Updated model to GLM-OCR 0.9B. |

---

## 9. Functional Requirements

### FR-01: First-Run Setup

**Description:**
On first launch, if no settings exist, the app must guide the user through minimal setup.

**Acceptance Criteria:**
- If `settings/settings.json` does not exist, show first-run setup screen.
- Ask user to choose default output directory.
- Default suggestion may be:
  - portable `output/`
  - or `Documents/Scan2Text`
- Create required folders if missing:
  - `output/`
  - `settings/`
  - `logs/`
- Create `settings/settings.json` with default values.
- After setup, app opens main screen.
- App must work without admin rights.

---

### FR-02: Main Application Layout (Command Center)

**Description:**
The app uses a "Command Center" layout — a 3-panel dashboard with a bottom status bar. The design is minimalist, dark-mode ready, high-contrast (inspired by Linear/Vercel).

**Layout Structure:**

| Panel | Width | Content |
|-------|-------|---------|
| Left Panel | 20% | Drop Zone (file upload area) |
| Center Panel | 35% | Queue table (file name, status, progress bar) |
| Right Panel | 45% | Live Preview (image thumbnail + rendered Markdown) |
| Bottom Bar | Full width | Worker status, RAM usage, version |
| Top Bar | Full width | App title, theme toggle, language toggle, settings icon |

**Acceptance Criteria:**
- Layout is a fixed 3-panel grid (20% / 35% / 45%) with bottom status bar.
- Desktop-only for MVP. No responsive/mobile layout.
- Panel widths are fixed (not resizable).
- **Top Bar** contains:
  - App title/logo on the left: "📝 Scan2Text"
  - Theme toggle button (🌙/☀️) on the right
  - Language toggle button (🌐 EN/ID) on the right
  - Settings icon (⚙️) on the right
- **Left Panel (Drop Zone):**
  - Large, visually prominent drag-and-drop area.
  - Glowing/highlighted state when files are dragged over.
  - Click to browse files as fallback.
- **Center Panel (Queue):**
  - Real-time table showing: File Name, Status, Progress Bar.
  - Status values: Pending, Uploading, OCR Running, Done, Failed, Background.
  - Progress bar uses fake progress animation (see FR-04).
  - FIFO order (files appear in the order they were dropped).
  - Empty state: 📭 **"Nothing here yet. Drop something tasty!"**
- **Right Panel (Live Preview):**
  - Split into two sub-columns: Image thumbnail (30% width) + Rendered Markdown (70% width).
  - Image thumbnail shown on the LEFT, Markdown on the RIGHT (side-by-side for easy comparison).
  - For PDF files: show a PDF icon/placeholder instead of image thumbnail.
  - For image files: show original image via object URL.
  - Empty state: ✨ **"Select a completed job to preview the magic."**
  - Auto-select: when a job completes, the right panel automatically shows its result.
- **Bottom Bar:**
  - Shows: Worker status (Idle/Busy), RAM usage, app version.
  - Subtle ticker style.
- Dark mode is the DEFAULT theme. Light mode available via toggle.

---

### FR-03: File Input

**Description:**
Users must be able to add files by drag-and-drop or file picker. Files are validated before upload.

**Acceptance Criteria:**
- Accept file types:
  - `.jpg`
  - `.jpeg`
  - `.png`
  - `.tiff`
  - `.bmp`
  - `.webp`
  - `.pdf`
- Support drag-and-drop into left panel (Drop Zone).
- Support file selection dialog as fallback (click to browse).
- Support multiple files.
- **File validation (before upload):**
  - Max file size: **50MB per file**.
  - Files exceeding 50MB are rejected with an error toast.
  - Unsupported file types are rejected with an error toast.
  - Error toasts use shadcn toast component.
  - Invalid files are NOT added to the queue.
- Unsupported files in a multi-file batch must be skipped.
- Skipped unsupported files must be logged.
- Skipped unsupported files must not stop processing of valid files.
- If all dropped files are unsupported, show a non-blocking warning toast and log the event.

---

### FR-04: Processing Queue

**Description:**
When multiple files are added, valid files must be processed in order. The queue provides real-time visual feedback.

**Acceptance Criteria:**
- Valid files are processed **FIFO** (First In, First Out).
- Queue maintains insertion order (no sorting).
- Each file shows status:
  - `pending` — waiting to start
  - `uploading` — file being uploaded to backend
  - `processing` — OCR in progress
  - `completed` — OCR done, result available
  - `failed` — OCR failed
  - `background` — polling timed out, will auto re-poll
- **Progress bar behavior (fake progress):**
  - Animates from 0% to 90% over 30 seconds (eased, starts fast, slows near 90%).
  - Jumps to 100% when job completes.
  - Turns red and stops when job fails.
  - Pauses at ~90% with subtle pulse when job goes to background.
- **Auto-select:**
  - When a job completes, the right panel automatically switches to show its result.
  - The completed job is highlighted in the queue.
  - User can still click other jobs to view them.
- **Background processing:**
  - If polling exceeds 30 seconds (15 attempts × 2000ms), job status changes to `background`.
  - Background jobs are automatically re-polled every 60 seconds.
  - Maximum 10 re-polls (10 minutes total). After that, mark as timeout.
  - Background message: "Still processing in the background. Large files can take a few minutes. Check the Queue for completion."
- **Queue actions:**
  - Completed/Failed jobs: [✕] Remove button.
  - In-progress jobs: [Cancel] button (future slice, requires backend cancel endpoint).
- User can click Process All (or files auto-process on drop).
- If no valid files are present, process button is disabled or shows a helpful message.
- If one file fails, remaining queue continues unless fatal app error occurs.
- The UI must show which file is currently processing.

---

### FR-05: Model Loading

**Description:**
The OCR model must load only when needed.

**Acceptance Criteria:**
- Model loads when user starts processing and model is not already loaded.
- Show loading state with progress indicator.
- Model should remain loaded for subsequent jobs in the same session where practical.
- If model file is missing, show actionable error.
- If model file is corrupt or fails to load, show actionable error.
- App must not require internet to load model after initial app/model download.
- **Model:** GLM-OCR 0.9B (`vlm.gguf` + `mmproj.gguf`)
- **Runner:** llama-cpp-python
- **Hardware:** CPU-only (no GPU)

---

### FR-06: OCR Processing

**Description:**
The app extracts visible text from images and PDFs.

**Acceptance Criteria:**
- Each valid input file is processed separately.
- Multiple input files must not be merged into one Markdown file.
- For image files, send image to OCR engine.
- For PDF files, render pages to images and OCR each page.
- A multi-page PDF is one source document, so it may produce one Markdown file with page separators.
- Multiple separate input files must produce multiple separate Markdown files.
- Unsupported or invalid files in a batch are skipped and logged.
- If OCR fails for one file, show error for that file and continue remaining valid files where possible.
- **MVP guardrails:**
  - Maximum PDF pages: 20 by default
  - Maximum file size: **50MB** by default
- If guardrail is exceeded, mark file as failed or skipped and log the reason.
- **PDF handling note:** VLM likely requires PDF pages converted to images before inference. Raw PDF bytes may not be directly supported. (Implementation detail to verify.)

---

### FR-07: Removed

Removed by CEO review.
There is no in-app editing in MVP.
Final output is Markdown. Users edit Markdown files later using their own tools.

---

### FR-08: Automatic Markdown Output

**Description:**
Each valid processed document automatically produces a Markdown file.

**Acceptance Criteria:**
- Output file format: Markdown `.md`.
- Each valid input file produces exactly one Markdown file.
- Separate input files must not be merged into one Markdown file.
- A multi-page PDF may produce one Markdown file containing page markers.
- Output is automatically saved after OCR completes.
- No manual Save button is required in MVP.
- Default save location: user-selected output directory.

**Output Naming Convention (from Addendum 05):**

Format: {original_stem}_{HHmm}_{yyyyMMdd}.md


Where:
- `original_stem` — the sanitized stem of the input filename (invalid Windows characters removed, spaces collapsed to underscores, reserved names handled).
- `HHmm` — 24-hour clock time, zero-padded (e.g., `0905`, `1738`).
- `yyyyMMdd` — calendar date, zero-padded (e.g., `20260804`).

Examples:

| Input file | Output file |
|------------|-------------|
| invoice.pdf | invoice_1738_20260804.md |
| my scan.png | my_scan_1738_20260804.md |
| report (copy).jpg | report_copy_1738_20260804.md |

**Collision Rule:**
If a file with the target name already exists in the output directory, append a numeric suffix starting at `_2`:
1. Try `{stem}_{HHmm}_{yyyyMMdd}.md`
2. If it exists, try `{stem}_{HHmm}_{yyyyMMdd}_2.md`
3. If that exists, try `{stem}_{HHmm}_{yyyyMMdd}_3.md`
4. Continue incrementing until an unused name is found.

**Never overwrite an existing file. Never merge multiple inputs into one output file.**

**Guardrails:**
- One input file → one output file. Always.
- The timestamp reflects the processing time, not the source file's mtime.
- Privacy-safe: logs record only the filename and byte count, never content.
- No new dependencies required.

**Implementation Notes:**
- The timestamp is captured at write time using `datetime.now()`.
- Collision resolution is linear search; practical collision counts are expected to be small (typically 0 or 1).
- The `PathService.resolve_output_path()` method is the single point of naming logic. All callers go through this method.

**Markdown structure rules:**
- Preserve visible text on a best-effort basis.
- Preserve line breaks where meaningful.
- Preserve simple lists where detectable.
- Preserve simple tables where detectable.
- If a table is detected, output Markdown table syntax where possible.
- Do not invent content.
- Do not fabricate table structure if uncertain.
- If structure is uncertain, plain text output is acceptable.


**After processing:**
- UI shows saved Markdown file path.
- UI should allow opening the output folder.
- If output directory is not writable, mark job as failed and show clear error.

---

### FR-09: Settings Menu

**Description:**
Users can change basic app settings.

**Acceptance Criteria:**
- Settings opens from gear icon (⚙️) in top-right of top bar.
- Settings must include:
  - Output directory
  - Maximum PDF pages
  - CPU threads
  - Check for updates on startup
  - **Language** (English / Indonesian)
  - **Theme** (Dark / Light)
- Settings persist to `settings/settings.json`.
- Invalid settings must show validation error.
- Changed output directory applies to future output files.
- Settings screen must be simple and non-technical.
- **Default settings:**
```json
{
  "output_dir": "",
  "max_pdf_pages": 20,
  "cpu_threads": 0,
  "check_updates_on_startup": true,
  "language": "auto",
  "theme": "dark"
}
```

- `cpu_threads = 0` means automatic.
- `language = "auto"` means auto-detect browser language, fallback to English.

### FR-10: Update Check

**Description:** The app checks for updates using GitHub-hosted `version.json`.

**Acceptance Criteria:**

- Update check occurs on app launch only if enabled.
- Update check must not block app startup.
- If offline, update check fails silently.
- If newer version exists, show notification in title bar or top bar.
- App does not auto-install updates.
- User downloads update manually from GitHub release.
- Update notification may show latest version and short notes.

---

### FR-11: Error Handling

**Description:** Errors must be clear, logged, and must not unnecessarily block batch processing. Error messages are internationalized.

**Acceptance Criteria:**

- Unsupported or invalid files in a batch are skipped and logged.
- A skipped file should not stop other valid files from processing.
- Fatal errors must be shown to the user.
- Non-fatal file errors may be shown as status/skipped/failed without blocking the whole app.
- Error messages must avoid raw stack traces.
- Errors must be logged.
- OCR text content must not be logged by default.
- **Error messages are translated** via i18n:
    - All frontend UI error strings use translation keys.
    - Known backend error codes are mapped to translated messages.
    - Unknown backend errors are shown as-is (English).
- **Error toasts** use shadcn toast component for file validation errors (wrong type, too large).

**Example error cases:**

- Model not found
- Model failed to load
- Unsupported file type
- File too large (exceeds 50MB)
- PDF too many pages
- OCR processing failed
- Output directory not writable
- Invalid settings

---

### FR-12: Portable Runtime

**Description:** The app must run from a portable folder.

**Acceptance Criteria:**

- App runs from a user-writable folder.
- No admin rights required.
- No mandatory installation into Program Files.
- App reads/writes using portable folder paths.
- User may choose external output directory, but app remains portable.
- App must not depend on machine-specific hardcoded paths.

---

### FR-13: Internationalization (i18n)

**Description:** The app supports multiple languages. MVP ships with English and Indonesian.

**Acceptance Criteria:**

- **Library:** react-i18next
- **Languages:** English (`en`), Indonesian (`id`)
- **Default language:** Auto-detect browser/system language. Fallback to English if detection fails.
- **Language toggle:** Located in top bar, next to theme toggle. Shows current language code (e.g., "EN" or "ID").
- **Persistence:** Language preference saved to localStorage. Persists across app restarts.
- **Translation scope:**
    - All UI strings use translation keys (no hardcoded text).
    - All button labels, status messages, empty states, and error messages are translated.
    - Known backend error codes are mapped to translated messages.
    - Unknown backend errors shown as-is (English).
- **Translation files:**
    - `en.json` — English translations
    - `id.json` — Indonesian translations
    - Initial translations drafted by AI, reviewed and adjusted by CEO.
- **Fun/casual tone:** Empty state messages and casual UI text should maintain a friendly, approachable tone in both languages.

---

### FR-14: Theme

**Description:** The app supports dark and light themes. Dark mode is the default.

**Acceptance Criteria:**

- **Default theme:** Dark mode.
- **Available themes:** Dark, Light.
- **Theme toggle:** Located in top bar. Shows 🌙 icon in dark mode, ☀️ icon in light mode.
- **Persistence:** Theme preference saved to localStorage. Persists across app restarts.
- **Design language:** Minimalist, high-contrast, inspired by Linear/Vercel.
- **Dark mode:** Dark backgrounds, light text, subtle borders.
- **Light mode:** Light backgrounds, dark text, subtle borders.
- Theme change applies immediately without page reload.
- All UI components must support both themes.