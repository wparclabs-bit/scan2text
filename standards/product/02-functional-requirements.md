# Functional Requirements — Scan2Text MVP

Version: 1.6
Date: 2026-08-07
Status: Approved for Implementation

## Change Log

| Version | Date | Changes |
| --- | --- | --- |
| 1.0 | 2026-06-22 | Initial functional requirements |
| 1.1 | 2026-06-22 | Minor clarifications |
| 1.2 | 2026-06-22 | Removed in-app editing (FR-07), updated output naming |
| 1.3 | 2026-08-06 | Integrated output naming addendum (05) into FR-08. Updated FR-02 to Command Center layout. Added WEBP to file types. Reduced max file size to 50MB. Added file validation with toast. Added fake progress, auto-select, background re-poll to FR-04. Added FR-13 (i18n) and FR-14 (Theme). Updated model to GLM-OCR 0.9B. |
| 1.4 | 2026-08-07 | Beautify-phase UI deltas (CEO-approved): FR-02 panel ratios 20/35/45 → 20/20/60; right panel renders Markdown full-width; queue Remove button removed from MVP scope; queue status indicators refined; FR-03 file types aligned to PNG/JPG/JPEG/WEBP/PDF; FR-14 final visual styling locked. |
| 1.5 | 2026-08-07 | Visual identity finalized (CEO-approved): coffee & paper palette replaces zinc+purple; panel card borders removed; depth via vertical gradients + inset top highlight + soft shadows + warm glow; top bar identity updated; radiant-lines background recolored warm. |
| 1.6 | 2026-08-07 | Phase 6 Finale deltas (CEO-approved): FR-02 layout updated from 20/20/60 to 34/60 + 2% gutters; left work column contains Dropzone fixed ~38% + Queue flex; app shell viewport-locked (`h-screen`); Dropzone/Queue/Preview ScrollAreas require always-visible thin warm scrollbars; TopBar wordmark becomes literal brand text `Scan2Text` and is i18n-exempt; BottomBar adds icon-only Share button on left while worker/RAM/version is centered; Dropzone gains bold ink-black text + colored upload icon left + smile emoji right; card depth must be theme-aware inline longhand gradient+shadow on all primary cards; Queue card gains radiant rays; FR-04 restores full queue row with file type icon, name, size, status indicator, translated tooltip, and thin fake progress bar; share uses placeholder `https://placeholder.local`. |

---

## 9. Functional Requirements

### FR-01: First-Run Setup

Description:

On first launch, if no settings exist, the app must guide the user through minimal setup.

Acceptance Criteria:

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

### FR-02: Main Application Layout (Command Center v1.6)

Description:

The app uses a viewport-locked Command Center layout. The shell contains a TopBar, a main content area, and a BottomBar.

The v1.6 layout is a warm, coffee-and-paper desktop surface. It must not behave like a scrolling web page. The main window/body must not scroll. Only designated internal panels may scroll.

Layout Structure:

| Region | Space | Content |
| --- | --- | --- |
| Top Bar | Full width | Logo pictogram chip + literal brand wordmark `Scan2Text` + DEMO badge; theme/language/settings icon-only buttons with tooltips |
| Main Content | 34/60 + 2% gutters | Left work column and right preview column |
| Left Work Column | Approximately 34% width | Dropzone card fixed at approximately 38% of left-column height + Queue card flexing into remaining space |
| Right Preview Column | Approximately 60% width | Live Preview rendered Markdown, read-only |
| Bottom Bar | Full width | Share icon-only button on the left; worker status, RAM usage, and version centered |

Acceptance Criteria:

- The app shell is viewport-locked.
- The app shell uses `h-screen` or an equivalent full-viewport layout.
- The browser/body must not scroll in normal desktop use.
- The TopBar, main content, and BottomBar must remain visible inside one viewport.
- The previous 20/20/60 layout is superseded.
- The main content uses the new 34/60 layout with approximately 2% gutter/spacing budget.
- Panel widths are fixed and not resizable.
- Desktop-only for MVP. No responsive/mobile layout.

Top Bar requirements:

- The TopBar must contain the literal brand wordmark: `Scan2Text`.
- The wordmark is i18n-exempt.
- The rendered TopBar must be the live TopBar in the actual App import chain.
- A real App render test must be able to assert that the literal wordmark appears in the rendered text content.
- Duplicate or ghost TopBar files must not be the source of the visible wordmark.
- The TopBar may retain the logo pictogram chip and DEMO badge where they do not hide or replace the literal wordmark.
- The TopBar must contain icon-only buttons with translated tooltips for:
  - theme toggle
  - language toggle
  - settings

Left Work Column requirements:

- The left work column contains both Dropzone and Queue.
- The Dropzone card is fixed at approximately 38% of the left work column height.
- The Queue card takes the remaining left-column space using flexible layout.
- The Dropzone must remain visually prominent.
- The Queue must scroll internally when queue content overflows.
- The Dropzone and Queue must be part of the v1.6 ScrollArea system.

Dropzone requirements:

- Large, visually prominent drag-and-drop area.
- Glowing/highlighted state when files are dragged over.
- Click to browse files as fallback.
- Bold ink-black text.
- Colored upload icon on the left.
- Smile emoji on the right.
- The Dropzone must not appear faded or low-contrast.

Queue requirements:

- The Queue card must show file rows with file type icon, file name, file size, status indicator, translated tooltip, and thin fake progress bar.
- The Queue card must scroll internally when needed.
- The Queue card must have the warm radiant-ray visual treatment.
- The Queue card must not lose row metadata during visual polish work.

Right Preview Column requirements:

- Rendered Markdown shown full-width, read-only.
- No image thumbnail column.
- Empty state: ✨ “Select a completed job to preview the magic.”
- Auto-select: when a job completes, the right panel automatically shows its result.
- The Preview card must scroll internally when content overflows.
- The Preview card must not cause page-level scrolling.

Scroll behavior requirements:

- Dropzone, Queue, and Preview must use ScrollAreas.
- Queue and Preview are the primary internal scrolling regions.
- Scrollbars must be always visible.
- Scrollbars must be thin, rounded, and warm.
- Hover-only scrollbars are not allowed.
- Scrollbars are affordances, not hidden decorations.
- The Dropzone ScrollArea must show the same warm scrollbar affordance, even if Dropzone content does not require scrolling.

Bottom Bar requirements:

- The BottomBar must remain visible at all times.
- Left side: icon-only Share button.
- Center: worker status, RAM usage, and app version.
- The worker/RAM/version group must be visually centered.
- The Share button uses the placeholder target: `https://placeholder.local`.
- No right-side BottomBar content is required for v1.6.

Theme requirements:

- Dark mode is the DEFAULT theme.
- Light mode is available via toggle.
- All layout regions must support both themes.

---

### FR-03: File Input

Description:

Users must be able to add files by drag-and-drop or file picker. Files are validated before upload.

Acceptance Criteria:

- Accept file types:
  - `.jpg`
  - `.jpeg`
  - `.png`
  - `.webp`
  - `.pdf`
- Support drag-and-drop into the Dropzone in the left work column.
- Support file selection dialog as fallback.
- Support multiple files.
- File validation before upload:
  - Max file size: 50MB per file.
  - Files exceeding 50MB are rejected with an error toast.
  - Unsupported file types are rejected with an error toast.
- Error toasts use shadcn toast component.
- Invalid files are NOT added to the queue.
- Unsupported files in a multi-file batch must be skipped.
- Skipped unsupported files must be logged.
- Skipped unsupported files must not stop processing of valid files.
- If all dropped files are unsupported, show a non-blocking warning toast and log the event.
- The Dropzone must visually communicate drag-over state.
- The Dropzone must retain the v1.6 personality:
  - bold ink-black text
  - colored upload icon on the left
  - smile emoji on the right

---

### FR-04: Processing Queue

Description:

When multiple files are added, valid files must be processed in order. The queue provides real-time visual feedback and must retain all row metadata during visual polish work.

Acceptance Criteria:

- Valid files are processed FIFO (First In, First Out).
- Queue maintains insertion order.
- The Queue is located inside the left work column.
- The Queue card flexes into the remaining space below the fixed Dropzone region.
- The Queue card scrolls internally when needed.
- The Queue card uses an always-visible warm ScrollArea.

Each queue row must contain:

- File type icon.
- File name.
- File size.
- Status indicator.
- Translated tooltip for the status.
- Thin fake progress bar.

Status values:

- `pending` — waiting to start
- `uploading` — file being uploaded to backend
- `processing` — OCR in progress
- `completed` — OCR done, result available
- `failed` — OCR failed
- `background` — polling timed out, will auto re-poll

Status indicators:

- Uploading/processing: spinner.
- Completed: small glossy green dot with translated tooltip.
- Failed: red dot with translated tooltip.
- Background: subtle pulse or equivalent visual hint with translated tooltip.

Progress bar behavior:

- Animates from 0% to 90% over 30 seconds.
- Eased animation: starts faster, slows near 90%.
- Jumps to 100% when job completes.
- Turns red and stops when job fails.
- Pauses at approximately 90% with subtle pulse when job goes to background.
- The progress bar must remain thin and must not dominate the row.

Auto-select:

- When a job completes, the right panel automatically switches to show its result.
- The completed job is highlighted in the queue.
- User can still click other jobs to view them.

Background processing:

- If polling exceeds 30 seconds, job status changes to `background`.
- Background jobs are automatically re-polled every 60 seconds.
- Maximum 10 re-polls.
- After maximum re-polls, mark as timeout or failed according to error-handling rules.
- Background message must be translated.

Queue actions:

- No Remove button in MVP.
- In-progress jobs may have a Cancel button in a future slice when backend cancel exists.
- User can click Process All, or files auto-process on drop if enabled.
- If no valid files are present, process button is disabled or shows a helpful message.
- If one file fails, remaining queue continues unless fatal app error occurs.
- The UI must show which file is currently processing.

Empty state:

- 📭 “Nothing here yet. Drop something tasty!”

Regression guardrails:

- Visual slices must not remove file type icon, file name, file size, status indicator, tooltip, or progress bar.
- Rebuild slices must re-assert all pre-existing queue row elements, not only new visual elements.
- Regression tests must assert that each status state renders the full required row structure.

---

### FR-05: Model Loading

Description:

The OCR model must load only when needed.

Acceptance Criteria:

- Model loads when user starts processing and model is not already loaded.
- Show loading state with progress indicator.
- Model should remain loaded for subsequent jobs in the same session where practical.
- If model file is missing, show actionable error.
- If model file is corrupt or fails to load, show actionable error.
- App must not require internet to load model after initial app/model download.
- Model: GLM-OCR 0.9B (`vlm.gguf` + `mmproj.gguf`)
- Runner: llama-cpp-python
- Hardware: CPU-only.

---

### FR-06: OCR Processing

Description:

The app extracts visible text from images and PDFs.

Acceptance Criteria:

- Each valid input file is processed separately.
- Multiple input files must not be merged into one Markdown file.
- For image files, send image to OCR engine.
- For PDF files, render pages to images and OCR each page.
- A multi-page PDF is one source document, so it may produce one Markdown file with page separators.
- Multiple separate input files must produce multiple separate Markdown files.
- Unsupported or invalid files in a batch are skipped and logged.
- If OCR fails for one file, show error for that file and continue remaining valid files where possible.

MVP guardrails:

- Maximum PDF pages: 20 by default.
- Maximum file size: 50MB by default.
- If guardrail is exceeded, mark file as failed or skipped and log the reason.

PDF handling note:

- VLM likely requires PDF pages converted to images before inference.
- Raw PDF bytes may not be directly supported.
- Implementation must verify the PDF-to-image pipeline.

---

### FR-07: Removed

Removed by CEO review.

There is no in-app editing in MVP.

Final output is Markdown. Users edit Markdown files later using their own tools.

---

### FR-08: Automatic Markdown Output

Description:

Each valid processed document automatically produces a Markdown file.

Acceptance Criteria:

- Output file format: Markdown `.md`.
- Each valid input file produces exactly one Markdown file.
- Separate input files must not be merged into one Markdown file.
- A multi-page PDF may produce one Markdown file containing page markers.
- Output is automatically saved after OCR completes.
- No manual Save button is required in MVP.
- Default save location: user-selected output directory.

Output Naming Convention:

- Format: `{original_stem}_{HHmm}_{yyyyMMdd}.md`
- `original_stem` is the sanitized stem of the input filename.
- `HHmm` is 24-hour clock time, zero-padded.
- `yyyyMMdd` is calendar date, zero-padded.

Examples:

| Input file | Output file |
| --- | --- |
| invoice.pdf | invoice_1738_20260804.md |
| my scan.png | my_scan_1738_20260804.md |
| report (copy).jpg | report_copy_1738_20260804.md |

Collision Rule:

- If target file exists, append numeric suffix starting at `_2`.
- Try `{stem}_{HHmm}_{yyyyMMdd}.md`.
- If exists, try `{stem}_{HHmm}_{yyyyMMdd}_2.md`.
- Continue incrementing until unused name is found.
- Never overwrite an existing file.
- Never merge multiple inputs into one output file.

Guardrails:

- One input file → one output file. Always.
- Timestamp reflects processing time, not source file modification time.
- Privacy-safe: logs record only filename and byte count, never content.
- No new dependencies required.

Implementation Notes:

- Timestamp captured at write time using `datetime.now()`.
- Collision resolution is linear search.
- `PathService.resolve_output_path()` is the single point of naming logic.

Markdown structure rules:

- Preserve visible text on a best-effort basis.
- Preserve line breaks where meaningful.
- Preserve simple lists where detectable.
- Preserve simple tables where detectable.
- If a table is detected, output Markdown table syntax where possible.
- Do not invent content.
- Do not fabricate table structure if uncertain.
- If structure is uncertain, plain text output is acceptable.

After processing:

- UI shows saved Markdown file path.

---

### FR-09: Settings

Description:

The app provides minimal settings for output location, language, theme, update checking, and processing defaults.

Acceptance Criteria:

- Settings screen is accessible from the TopBar settings button.
- Settings must include:
  - output directory
  - max PDF pages
  - CPU threads
  - check updates on startup
  - language
  - theme
- `cpu_threads = 0` means automatic.
- `language = "auto"` means auto-detect browser language, fallback to English.
- Settings persist to `settings/settings.json`.
- Theme and language preferences also persist to localStorage for immediate UI restoration.
- App must recover gracefully from missing or corrupt settings by recreating defaults.
- Settings screen must support both dark and light themes.
- Settings strings must be translated via i18n.

---

### FR-10: Update Check

Description:

The app checks for updates using GitHub-hosted `version.json`.

Acceptance Criteria:

- Update check occurs on app launch only if enabled.
- Update check must not block app startup.
- If offline, update check fails silently.
- If newer version exists, show notification in title bar or top bar.
- App does not auto-install updates.
- User downloads update manually from GitHub release.
- Update notification may show latest version and short notes.

---

### FR-11: Error Handling

Description:

Errors must be clear, logged, and must not unnecessarily block batch processing. Error messages are internationalized.

Acceptance Criteria:

- Unsupported or invalid files in a batch are skipped and logged.
- A skipped file should not stop other valid files from processing.
- Fatal errors must be shown to the user.
- Non-fatal file errors may be shown as status/skipped/failed without blocking the whole app.
- Error messages must avoid raw stack traces.
- Errors must be logged.
- OCR text content must not be logged by default.
- Error messages are translated via i18n.
- Known backend error codes are mapped to translated messages.
- Unknown backend errors are shown as-is in English.
- Error toasts use shadcn toast component for file validation errors.

Example error cases:

- Model not found.
- Model failed to load.
- Unsupported file type.
- File too large.
- PDF too many pages.
- OCR processing failed.
- Output directory not writable.
- Invalid settings.

---

### FR-12: Portable Runtime

Description:

The app must run from a portable folder.

Acceptance Criteria:

- App runs from a user-writable folder.
- No admin rights required.
- No mandatory installation into Program Files.
- App reads/writes using portable folder paths.
- User may choose external output directory, but app remains portable.
- App must not depend on machine-specific hardcoded paths.

---

### FR-13: Internationalization (i18n)

Description:

The app supports multiple languages. MVP ships with English and Indonesian.

Acceptance Criteria:

- Library: react-i18next.
- Languages: English (`en`), Indonesian (`id`).
- Default language: auto-detect browser/system language.
- Fallback to English if detection fails.
- Language toggle located in TopBar.
- Language toggle is icon-only with translated tooltip.
- Language preference saved to localStorage.
- Language preference persists across app restarts.

Translation scope:

- All UI strings use translation keys.
- All button labels, status messages, empty states, tooltips, and error messages are translated.
- Known backend error codes are mapped to translated messages.
- Unknown backend errors shown as-is in English.

Wordmark exception:

- The literal brand wordmark `Scan2Text` is i18n-exempt.
- The wordmark must not be translated.
- The wordmark must not be replaced by a localized phrase.
- The wordmark must remain visible as literal brand text in the live TopBar.

Queue tooltip translation:

- Queue status tooltips must be translated.
- File status indicators must expose translated tooltip text or accessible equivalent.

Translation files:

- `en.json` — English translations.
- `id.json` — Indonesian translations.

Tone:

- Empty state messages and casual UI text should maintain a friendly, approachable tone in both languages.

---

### FR-14: Theme

Description:

The app supports dark and light themes. Dark mode is the default. The v1.6 theme is warm, coffee-and-paper, viewport-locked, and depth-aware.

Acceptance Criteria:

- Default theme: Dark mode.
- Available themes: Dark, Light.
- Theme toggle located in TopBar.
- Theme toggle is icon-only with translated tooltip.
- Theme preference saved to localStorage.
- Theme change applies immediately without page reload.
- All UI components must support both themes.

Design language:

- Coffee & paper warm identity.
- Minimalist, high-contrast, paper-on-desk feel.
- No primary panel card borders.
- Depth must be subtle, warm, and theme-aware.

Dark palette:

- Background: `#080502`
- Left card: `#E1DCC9`
- Left text: ink `#1F150C`
- Queue warmth: `#412D15`
- Queue text: cream `#F2EBDD`
- Preview card: `#1F150C`
- Preview text: cream
- Accent: caramel `#E3A55F`

Light palette:

- Background: `#F9F8F6`
- Left: `#EFE9E3`
- Queue: `#D9CFC7`
- Preview: `#C9B59C`
- Text: dark text
- Accent: coffee `#92400E`

Retired/retained colors:

- Purple is retired.
- DEMO badge amber is retained where DEMO badge is shown.
- Green/red status dots are retained.

Card depth:

- All primary cards must have subtle depth.
- Primary cards are:
  - Dropzone card
  - Queue card
  - Preview card
- Depth must use subtle gradient + soft shadow.
- Depth must be applied via theme-aware inline styles.
- Depth styles must use explicit longhand style properties.
- Utility classes may support styling, but the source of truth for card depth must be inline style.
- Cards must not appear flat.

Queue card decoration:

- Queue card must include subtle radiant rays.
- Radiant rays must be static and zero-CPU at idle.
- Radiant rays must use warm cream/caramel tones.
- Radiant rays must not reduce readability.

Dropzone personality:

- Dropzone text must be bold ink-black.
- Dropzone must include colored upload icon on the left.
- Dropzone must include smile emoji on the right.
- Dropzone must not appear faded.

Scrollbars:

- Scrollbars must be always visible.
- Scrollbars must be thin.
- Scrollbars must be rounded.
- Scrollbars must be warm.
- Dark theme: caramel thumb on translucent track.
- Light theme: coffee thumb on soft track.
- Hover-only scrollbars are not allowed.
- Scrollbar affordance must exist for Dropzone, Queue, and Preview ScrollAreas.

Typography:

- Quantico display font for titles, headings, badges, metrics, and brand display elements.
- Readable body font for paragraphs and UI text.
- Body font remains swap-friendly via a single CSS variable where practical.

TopBar identity:

- TopBar must show literal brand wordmark: `Scan2Text`.
- The wordmark is i18n-exempt.
- Logo pictogram chip and DEMO badge may remain where they do not hide or replace the wordmark.
- Icon-only TopBar buttons must have translated tooltips.

---

### FR-15: Share Placeholder Button

Description:

The MVP BottomBar includes a Share button placeholder. The final share destination will be swapped after GitHub/sharing is available.

Acceptance Criteria:

- The Share button appears in the BottomBar.
- The Share button is positioned on the left side of the BottomBar.
- The Share button is icon-only.
- The Share button must not display a text label in v1.6.
- The Share button uses the placeholder target: `https://placeholder.local`.
- If a tooltip is shown, it must be translated.
- The Share button must support both dark and light themes.
- The Share button must not block or shift the centered worker/RAM/version group.
- Final production share URL is out of scope until post-GitHub swap.