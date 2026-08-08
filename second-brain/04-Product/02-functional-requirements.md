# Functional Requirements — Scan2Text MVP

  

Version: 1.7

Date: 2026-08-07

Status: Approved for Implementation

  

## Change Log

  

| Version | Date | Changes |

| --- | --- | --- |

| 1.0 | 2026-06-22 | Initial functional requirements |

| 1.1 | 2026-06-22 | Minor clarifications |

| 1.2 | 2026-06-22 | Removed in-app editing (FR-07), updated output naming |

| 1.3 | 2026-08-06 | Integrated output naming addendum into FR-08. FR-02 Command Center layout. WEBP added. 50MB cap. File validation with toast. Fake progress, auto-select, background re-poll. FR-13 (i18n) + FR-14 (Theme). Model GLM-OCR 0.9B |

| 1.4 | 2026-08-07 | Beautify deltas: ratios → 20/20/60; full-width Markdown preview; queue Remove removed; status indicators refined; file types locked PNG/JPG/JPEG/WEBP/PDF |

| 1.5 | 2026-08-07 | Coffee & paper identity finalized; no panel borders; depth recipe; top bar logo chip + live-text wordmark + DEMO badge |

| 1.6 | 2026-08-07 | Phase 6 Finale: layout → 34/60 + 2% gutters; left work column (Dropzone ~38% + Queue flex); viewport-locked shell; always-visible warm scrollbars; literal TopBar wordmark; BottomBar share + centered telemetry; Dropzone personality; inline longhand card depth; Queue radiant rays; share placeholder; queue row regression contract |

| 1.7 | 2026-08-07 | Hotfix finale (CEO-approved): shell = fixed inset-0 (absolute viewport lock; fractions decide, content never resizes panels); TopBar 34px with CENTER brand image text.png 153×34 alt="Scan2Text" + static glow, left = logo chip + DEMO intact (no literal text wordmark), all items vertically centered; Share moved to BottomBar RIGHT (click = soft toast, no navigation); BottomBar left empty, center telemetry (Worker Idle/Busy · RAM "—" until /health · version), pinned at any window size; Dropzone: dashed area fills card, bg image 15% opacity single-value size centered, header + footer bold ink, footer adds "max 10 files per batch", Dropzone ScrollArea removed; 10-file batch cap enforced; queue fixed 14px dot-only status slot (grey/yellow-spinner/green/red) with translated tooltips; depth = visible-subtle gradation; Preview header buttons borderless transparent with caramel hover; Radix ScrollArea tray neutralized via CSS override |

  

---

  

## 9. Functional Requirements

  

### FR-01: First-Run Setup

  

Description:

  

On first launch, if no settings exist, the app must guide the user through minimal setup.

  

Acceptance Criteria:

  

- If `settings/settings.json` does not exist, show first-run setup screen.

- Ask user to choose default output directory.

- Default suggestion may be portable `output/` or `Documents/Scan2Text`.

- Create required folders if missing: `output/`, `settings/`, `logs/`.

- Create `settings/settings.json` with default values.

- After setup, app opens main screen.

- App must work without admin rights.

  

---

  

### FR-02: Main Application Layout (Command Center v1.7)

  

Description:

  

The app uses a viewport-locked Command Center shell pinned to the screen: `fixed inset-0 flex flex-col overflow-hidden`. The screen is the only sizing authority: no window/body scroll at any window width or height; panels are sized by fractions (`fr` tracks), never by content.

  

Layout Structure:

  

| Region | Space | Content |

| --- | --- | --- |

| Top Bar | Full width, 34px tall | LEFT: logo chip + DEMO badge (intact). CENTER: brand image text.png 153×34 alt="Scan2Text" + static glow. RIGHT: theme/language/settings icon-only with translated tooltips. All vertically centered |

| Main Content | 34/60 + ~2% gutters (grid-cols-[34fr_60fr] gap-[2%]) | Left work column + right preview column |

| Left Work Column | ~34% | Dropzone (minmax(0,38fr)) + Queue (minmax(0,62fr)) |

| Right Preview Column | ~60% | Live Preview (rendered Markdown full-width, read-only, internal scroll) |

| Bottom Bar | Full width, pinned (shrink-0) | LEFT: empty. CENTER: Worker Idle/Busy · RAM "—" · version. RIGHT: icon-only Share |

  

Acceptance Criteria:

  

- Shell is `fixed inset-0 flex flex-col overflow-hidden`; BottomBar visible at any window size.

- Main uses `flex-1 min-h-0` and fraction tracks; left column rows `minmax(0,38fr)/minmax(0,62fr)`. Content can never stretch a panel (dropzone size constant regardless of job count).

- Desktop-only for MVP. Panel widths fixed, not resizable.

  

Top Bar requirements:

  

- Height exactly 34px; logo, brand image, and buttons vertically centered.

- LEFT: logo pictogram chip (`frontend/Images/logo.png`) + DEMO badge kept intact (DEMO removed after final product). No literal text wordmark on the left.

- CENTER: brand image `frontend/Images/text.png` at 153×34 with `alt="Scan2Text"` and a static radial glow behind (CSS-only, zero CPU, subtle).

- RIGHT: theme toggle, language toggle, settings — icon-only with translated tooltips.

  

Dropzone (top-left) requirements:

  

- Dashed upload area fills the card between header and footer (flex-1 min-h-0).

- Background image `bacground-left-top-panel.jpg` (exact filename) at 15% opacity, single-value `background-size: 100%`, centered, no-repeat, pointer-events none.

- Header text and footer hint: bold, ink #1F150C, both themes.

- Footer hint: "PNG · JPG · WEBP · PDF — max 50MB per file · max 10 files per batch" (translated).

- No ScrollArea in Dropzone (v1.7; nothing scrolls there).

- Glowing/highlighted state when files are dragged over; click to browse fallback.

  

Queue (bottom-left) requirements:

  

- Internal scroll with always-visible warm scrollbar (thin, rounded; caramel thumb/translucent track dark; coffee thumb light).

- Radiant rays decoration (static, zero CPU).

- Row contract: file type icon + file name (truncate with ellipsis) + file size + fixed 14px status slot (dot-only) + translated tooltip + thin fake progress bar while active + retry button on failed.

- Empty state: 📭 "Nothing here yet. Drop something tasty!"

  

Right Preview Column requirements:

  

- Rendered Markdown full-width, read-only; internal scroll.

- Header actions: Copy Markdown + Open Folder as real borderless buttons (transparent bg = panel color, no border, caramel hover tint, focus-visible ring, icon + translated label).

- Empty state: ✨ "Select a completed job to preview the magic."

- Auto-select: when a job completes, the right panel automatically shows its result.

  

Bottom Bar requirements:

  

- Pinned (shrink-0), always visible; vertically centered content; center group via grid 1fr auto 1fr.

- CENTER: Worker Idle/Busy (derived from queue state) · RAM "—" (until backend GET /health) · version constant.

- RIGHT: icon-only Share button, translated tooltip, no text label.

- LEFT: empty.

  

Theme requirements:

  

- Dark mode DEFAULT; light mode via toggle; persisted; instant apply.

  

---

  

### FR-03: File Input

  

Description:

  

Users add files by drag-and-drop or file picker. Files are validated before upload. Batches are capped at 10 files.

  

Acceptance Criteria:

  

- Accept file types: `.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`.

- Drag-and-drop into Dropzone; click-to-browse fallback; multiple files supported.

- Validation before upload:

  - Max 50MB per file → error toast, not added to queue.

  - Unsupported type → error toast, not added to queue.

  - Batch cap: max 10 files per drop → first 10 kept, extras skipped with warning toast ("Max 10 files per batch — extra files were skipped." / ID equivalent) and logged.

- Error/warning toasts use shadcn toast component.

- Unsupported files in a batch are skipped, logged, and do not stop valid files.

- If all dropped files are unsupported, show non-blocking warning toast and log.

  

---

  

### FR-04: Processing Queue

  

Description:

  

Valid files process in FIFO order with real-time visual feedback via the fixed status slot.

  

Acceptance Criteria:

  

- FIFO order; queue maintains insertion order.

- Status values: `pending`, `uploading`, `processing`, `completed`, `failed`, `background`.

- Fixed 14px status slot after the file name, ALWAYS rendered, dot-only, no visible text:

  - pending: warm grey dot (#A8A29E dark / #78716C light)

  - uploading/processing: bright yellow spinner (#FACC15)

  - completed: glossy green dot (radial-gradient(circle at 30% 30%, #86EFAC, #16A34A 60%, #14532D))

  - failed: glossy red dot (radial-gradient(circle at 30% 30%, #FCA5A5, #DC2626 60%, #7F1D1D))

- Translated tooltip per status (title/aria equivalent).

- Thin fake progress bar under row metadata while uploading/processing:

  - 0% → 90% over 30s (eased), jump to 100% on completion, red + stop on failed, pause ~90% with subtle pulse on background.

- File names truncate with ellipsis; status slot stays visible at row right (Radix tray neutralized via CSS override).

- Auto-select: completed job shown in right panel and highlighted in queue; user can click other jobs.

- Background: polling > 30s → `background`; re-poll every 60s, max 10; then timeout.

- Queue actions: no Remove button in MVP; Cancel future; retry button on failed rows.

- If one file fails, remaining queue continues unless fatal.

- UI shows which file is currently processing.

  

---

  

### FR-05: Model Loading

  

Description:

  

The OCR model loads only when needed.

  

Acceptance Criteria:

  

- Model loads when processing starts and model not loaded.

- Loading state with progress indicator.

- Model remains loaded for subsequent jobs where practical.

- Missing/corrupt model → actionable error.

- No internet required after initial download.

- Model: GLM-OCR 0.9B (`vlm.gguf` + `mmproj.gguf`); runner llama-cpp-python; CPU-only.

  

---

  

### FR-06: OCR Processing

  

Description:

  

The app extracts visible text from images and PDFs.

  

Acceptance Criteria:

  

- Each valid input processed separately; never merged.

- Images sent to OCR engine; PDFs rendered to images per page.

- Multi-page PDF = one source document = one Markdown file with page separators.

- Unsupported/invalid files skipped and logged.

- One file failing does not stop remaining valid files where possible.

- Guardrails: max 20 PDF pages, max 50MB per file; exceeded → failed/skipped + logged.

- PDF handling note: VLM likely needs rendered pixels, not raw PDF bytes (verify).

  

---

  

### FR-07: Removed

  

Removed by CEO review. No in-app editing in MVP. Final output is Markdown; editing happens outside Scan2Text.

  

---

  

### FR-08: Automatic Markdown Output

  

Description:

  

Each valid processed document automatically produces a Markdown file.

  

Acceptance Criteria:

  

- Output `.md`; one per valid input; never merged.

- Auto-saved after OCR; no Save button; default location = user-selected output dir.

- Naming: `{original_stem}_{HHmm}_{yyyyMMdd}.md`; collision suffix `_2`, `_3`, …; never overwrite.

- Guardrails: one input → one output; timestamp = processing time; privacy-safe logs; no new dependencies.

- Implementation: `datetime.now()` at write; linear collision search; `PathService.resolve_output_path()` single point of naming logic.

- Markdown structure: best-effort text, line breaks, lists, tables (GFM); no invented content; plain text acceptable when uncertain.

- After processing: UI shows saved Markdown file path.

  

---

  

### FR-09: Settings

  

Description:

  

Minimal settings for output location, language, theme, update check, and processing defaults.

  

Acceptance Criteria:

  

- Settings screen accessible from TopBar.

- Settings: output_dir, max_pdf_pages, cpu_threads (0 = auto), check_updates_on_startup, language ("auto" default), theme.

- Persist to `settings/settings.json`; theme/language also to localStorage.

- Graceful recovery from missing/corrupt settings (recreate defaults).

- Both themes supported; strings translated.

  

---

  

### FR-10: Update Check

  

Description:

  

Update check via GitHub-hosted `version.json`.

  

Acceptance Criteria:

  

- On launch only if enabled; non-blocking; silent fail offline.

- Newer version → notification in top bar; no auto-install; manual download.

  

---

  

### FR-11: Error Handling

  

Description:

  

Errors clear, logged, non-blocking for batches, internationalized.

  

Acceptance Criteria:

  

- Unsupported/invalid files skipped + logged; do not stop valid files.

- Fatal errors shown; non-fatal shown as status/skipped/failed.

- No raw stack traces; errors logged; OCR text never logged.

- i18n: all UI error strings via keys; known backend codes mapped to translations; unknown shown as-is English.

- Toasts for validation errors (type, size) and batch cap warning.

- Example cases: model not found, model load failed, unsupported type, file too large, PDF too many pages, OCR failed, output not writable, invalid settings.

  

---

  

### FR-12: Portable Runtime

  

Description:

  

App runs from a portable folder.

  

Acceptance Criteria:

  

- User-writable folder; no admin rights; no Program Files requirement.

- Portable path resolution; external output dir allowed; no machine-specific hardcoded paths.

  

---

  

### FR-13: Internationalization (i18n)

  

Description:

  

English + Indonesian; auto-detect with English fallback.

  

Acceptance Criteria:

  

- react-i18next; toggle in TopBar showing EN/ID; persisted to localStorage.

- All UI strings via translation keys (buttons, statuses, empty states, tooltips, toasts, errors).

- Files: `en.json`, `id.json`; AI-drafted, CEO-reviewed; friendly casual tone.

- Brand exception (v1.7): the center brand IMAGE with `alt="Scan2Text"` is i18n-exempt (supersedes literal text wordmark exception).

  

---

  

### FR-14: Theme

  

Description:

  

Dark default + light toggle; coffee & paper identity.

  

Acceptance Criteria:

  

- Dark default; light available; persisted; instant apply; all components themed.

- Palettes: DARK bg #080502; Dropzone #E1DCC9 ink #1F150C; Queue #412D15 cream #F2EBDD; Preview #1F150C cream; accent #E3A55F. LIGHT bg #F9F8F6; #EFE9E3 / #D9CFC7 / #C9B59C; accent #92400E. Purple retired; DEMO amber retained; green/red dots retained.

- Depth (v1.7): visible-subtle gradation on ALL cards via theme-aware inline longhand styles (gradient + inset top highlight + soft shadow + warm glow). No flat cards. No borders.

- Scrollbars: always-visible warm on Queue + Preview only (v1.7: Dropzone excluded).

- Typography: Quantico display + readable swap-friendly body font (single CSS variable; final choice open).

- TopBar identity (v1.7): logo chip + DEMO left; center brand image alt="Scan2Text" + static glow; icon-only buttons with translated tooltips.

- Queue card radiant rays: static, zero CPU.

  

---

  

### FR-15: Share Placeholder Button

  

Description:

  

BottomBar includes the MVP Share placeholder; final destination swapped post-GitHub.

  

Acceptance Criteria:

  

- Icon-only button in BottomBar RIGHT zone; no text label; translated tooltip.

- Placeholder target constant: `https://placeholder.local`.

- Click performs NO navigation; shows soft translated toast ("Sharing coming soon." / "Berbagi segera hadir.").

- Themed for dark + light; does not shift centered telemetry.

- Production share URL out of scope until post-GitHub swap.