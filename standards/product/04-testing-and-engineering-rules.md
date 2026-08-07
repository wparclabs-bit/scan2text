# Testing Strategy & Engineering Rules — Scan2Text MVP

Version: 1.6
Date: 2026-08-07
Status: Approved for Implementation

## Change Log

| Version | Date | Changes |
| --- | --- | --- |
| 1.0 | 2026-06-22 | Initial testing strategy and engineering rules |
| 1.1 | 2026-06-22 | Minor clarifications |
| 1.2 | 2026-06-22 | Removed in-app editing from scope, updated open items |
| 1.3 | 2026-08-06 | Updated tests for Command Center UI, Zustand store, react-i18next, react-markdown, file validation, fake progress, auto-select, background re-poll. Added AIASD rules for memory-only job state, preferences persistence, i18n, CPU-only, desktop-only. Updated Definition of Done and open items. |
| 1.4 | 2026-08-07 | Beautify-phase deltas: panel ratios 20/35/45 → 20/20/60; full-width Markdown preview; queue Remove button removed; queue status indicators refined; accepted file types locked to PNG/JPG/JPEG/WEBP/PDF. |
| 1.5 | 2026-08-07 | Visual identity finalized: coffee & paper palette, no panel borders, depth via gradients/highlight/shadow/glow, top bar logo chip + live-text wordmark + DEMO badge. |
| 1.6 | 2026-08-07 | Phase 6 Finale deltas, CEO-approved: layout updated from 20/20/60 to 34/60 + 2% gutters; left work column contains Dropzone fixed ~38% + Queue flex; app shell viewport-locked using `h-screen`; Dropzone/Queue/Preview ScrollAreas require always-visible thin warm scrollbars; TopBar wordmark becomes literal brand text `Scan2Text` and is i18n-exempt; BottomBar adds icon-only Share button on left while worker/RAM/version is centered; Dropzone gains bold ink-black text + colored upload icon left + smile emoji right; card depth must be theme-aware inline longhand gradient+shadow on all primary cards; Queue card gains radiant rays; share uses placeholder `https://placeholder.local`; FR-04 queue row regression requires file type icon, name, size, status indicator, translated tooltip, and thin fake progress bar; manual QA script artifact in `second-brain/02-QA/` is required and must be run before Phase 6 completion. |

---

## 19. Testing Strategy

Testing must follow AIASD-friendly behavior testing.

### Test Pyramid

- 70% integration tests
- 20% unit tests
- 10% end-to/manual tests

### Unit Tests

Test small pure logic:

- output file naming, including timestamp and collision resolution
- file-name sanitization
- settings validation
- version comparison
- error mapping from backend code to translated UI message
- guardrail checks:
  - 50MB file size limit
  - 20-page PDF limit
- file type validation:
  - PNG
  - JPG
  - JPEG
  - WEBP
  - PDF
- i18n key resolution
- fake progress easing function:
  - 0% to 90% over 30 seconds
  - jump to 100% on completion
- file-size formatting for queue row display, where a formatter is used

### Integration Tests

Test API/service/store behavior without requiring the real 1.5 GB model.

Use a fake OCR engine.

Backend tests:

- add valid file to queue
- process job with fake OCR engine
- produce one Markdown file per valid input file
- do not merge multiple input files into one Markdown file
- skip unsupported file in batch and log it
- continue processing valid files after skipped file
- reject oversized PDF greater than 20 pages
- reject oversized file greater than 50MB
- handle missing output folder
- verify settings persistence
- `GET /status/{task_id}` returns correct status progression
- `POST /process` returns `task_id`
- `GET /health` returns worker state, RAM usage, and version/model metadata where implemented

Frontend tests:

- Zustand store:
  - addJob
  - updateJob
  - startUpload
  - pollJob
- FIFO queue order using `jobOrder[]`
- auto-select behavior on job completion
- background re-poll logic:
  - every 60 seconds
  - maximum 10 re-polls
- fake progress animation state transitions
- file validation:
  - type validation
  - 50MB validation
  - toast error rendering
- queue row regression contract:
  - file type icon renders
  - file name renders
  - file size renders
  - status indicator renders
  - translated tooltip or accessible equivalent renders
  - thin fake progress bar renders
- queue status indicators:
  - spinner while uploading/processing
  - glossy green dot on completed
  - red dot on failed
- tooltip rendering on icon-only TopBar buttons
- react-markdown + remark-gfm rendering
- i18n key resolution:
  - English
  - Indonesian
- theme toggle:
  - dark to light
  - light to dark
  - localStorage persistence
- language toggle:
  - English to Indonesian
  - Indonesian to English
  - localStorage persistence

Frontend v1.6 visual-contract tests:

- Real App render must show the literal TopBar wordmark:
  - `Scan2Text`
- The visible TopBar must be the live TopBar in the actual App import chain.
- The wordmark assertion must occur in a real App render, not in a detached component test only.
- App shell must be viewport-locked:
  - `h-screen` or equivalent full-viewport layout is present
  - body/window scroll is not expected in normal desktop rendering
- Main layout must expose the v1.6 structure:
  - TopBar
  - left work column
  - right preview column
  - BottomBar
- Left work column must contain:
  - Dropzone card
  - Queue card
- Dropzone must expose the v1.6 personality contract:
  - bold ink-black text
  - colored upload icon on the left
  - smile emoji on the right
- All primary cards must expose depth styles:
  - Dropzone card
  - Queue card
  - Preview card
- Card depth must be applied through inline styles in jsdom where practical.
- Queue card must expose the radiant-ray visual hook or class.
- ScrollAreas must exist for:
  - Dropzone
  - Queue
  - Preview
- ScrollArea test hooks must exist:
  - `data-testid="scrollarea-dropzone"`
  - `data-testid="scrollarea-queue"`
  - `data-testid="scrollarea-preview"`
- Always-visible warm scrollbar affordance must be asserted by class, data attribute, or equivalent stable hook.
- BottomBar must expose:
  - icon-only Share button on the left
  - worker/RAM/version group centered
- Share button must use or prepare the placeholder target:
  - `https://placeholder.local`

### Manual/E2E Tests

Run against real model, GLM-OCR 0.9B, and real samples:

- launch app
- verify app shell is viewport-locked
- verify no page-level scroll appears in normal desktop use
- verify BottomBar remains visible without scrolling
- verify TopBar shows literal brand wordmark `Scan2Text`
- verify main layout reads as 34/60 + 2% gutter spacing
- verify left work column contains Dropzone and Queue
- verify Dropzone is fixed at approximately 38% of left-column space
- verify Queue flexes into the remaining left-column space
- verify Dropzone text is bold ink-black
- verify Dropzone has colored upload icon on the left
- verify Dropzone has smile emoji on the right
- verify Dropzone, Queue, and Preview have always-visible warm scrollbars or scrollbar rails
- verify scrollbars do not require hover to become visible
- verify all primary cards have visible depth
- verify Queue card has subtle radiant rays
- verify BottomBar has icon-only Share button on the left
- verify worker/RAM/version group is centered in BottomBar
- verify Share button uses placeholder behavior/target until final share integration
- drop image → verify fake progress + Markdown result in right panel
- drop PDF → verify rendered Markdown result in right panel and file type icon in queue row
- drop mixed batch with unsupported file → verify unsupported skipped + valid processed
- drop oversized file greater than 50MB → verify error toast
- drag-and-drop and file picker both work
- auto-select shows completed result automatically
- queue row shows:
  - file type icon
  - file name
  - file size
  - status indicator
  - tooltip
  - thin fake progress bar
- queue shows spinner while processing
- queue shows glossy green dot on completed
- queue shows red dot on failed
- switch language → all UI strings update, except literal brand wordmark
- switch theme → dark/light mode toggles correctly
- restart app → settings persist, language/theme persist
- verify icon-only TopBar buttons show translated tooltips
- verify static Queue radiant rays render without idle CPU drain

### Manual QA Script Artifact

Added in v1.6.

A manual QA script must exist in:

`second-brain/02-QA/`

Recommended file name:

`scan2text-phase6-manual-test.md`

The QA script must include:

- baseline verification:
  - automated test command, such as `npm run test`
  - recent commit verification, such as top three commits from `git log --oneline`
  - AGENTS.md file map verification
- visual verification:
  - viewport lock
  - TopBar wordmark
  - 34/60 layout
  - Dropzone fixed region
  - Queue flex region
  - always-visible scrollbars
  - card depth
  - Queue radiant rays
  - Dropzone personality
  - BottomBar composition
- queue verification:
  - file type icon
  - file name
  - file size
  - status indicator
  - tooltip
  - thin fake progress bar
  - spinner state
  - completed green dot state
  - failed red dot state
- share verification:
  - icon-only Share button on left
  - placeholder target `https://placeholder.local`
- result recording:
  - pass/fail notes
  - date
  - tester
  - commit or baseline reference

The QA script must be run before Phase 6 is marked complete.

### OCR Accuracy Validation

Initial human validation:

- CEO provides 3 representative sample files.
- Human reviews extracted Markdown in the Command Center right panel.
- Target is approximately 95% visible text extraction.
- Simple table/list preservation is reviewed manually.
- Perfect layout fidelity is not required.

---

## 20. AI-Assisted Development Rules

All coding agents or AI tools working on this project must follow these rules.

### Rule 1: Local-first only

Do not introduce cloud services, hosted APIs, external databases, authentication providers, or telemetry.

### Rule 2: Modular monolith

Keep modules separated:

- UI, including React components and Zustand stores
- local API routes
- application services
- OCR engine adapter
- file/storage services
- settings service
- update service

Do not tightly couple UI to OCR internals.

### Rule 3: Contract-first

Define Pydantic models before implementing routes or services.

Do not invent inconsistent shapes for jobs, settings, errors, or OCR results.

### Rule 4: OCR engine isolation

The OCR model must be behind an adapter/interface.

Automated tests must be able to use a fake OCR engine.

### Rule 5: No merged output

Each valid input file produces its own Markdown file.

Do not merge multiple input files into one Markdown file.

A multi-page PDF may produce one Markdown file because it is one source document.

### Rule 6: No in-app editing in MVP

MVP does not include an in-app editor.

Final output is Markdown. Editing happens outside Scan2Text.

In-app Markdown editing is planned as a future feature.

### Rule 7: Unsupported files are non-blocking in batch

Unsupported files should be skipped and logged.

They should not stop valid files from processing.

### Rule 8: No hardcoded paths

All paths must be resolved through a path/service layer.

Do not hardcode machine-specific paths.

### Rule 9: Safe file handling

Never overwrite user files silently.

Use atomic writes where practical.

Validate output directory writability before saving.

### Rule 10: Clear errors with i18n

All exceptions must map to known error codes.

Do not expose raw stack traces to users.

All user-facing error messages must use i18n translation keys.

Known backend errors must map to translated messages.

### Rule 11: Privacy-safe logs

Do not log OCR text or document content by default.

### Rule 12: Follow the v1.6 Command Center shell

Do not add unnecessary screens, settings, or features beyond this PRD.

UI layout must follow the approved v1.6 Command Center shell:

- TopBar
- main content area
- BottomBar

Main layout must follow:

- 34/60 main split
- approximately 2% gutter/spacing budget
- left work column containing Dropzone and Queue
- Dropzone fixed at approximately 38% of left-column space
- Queue flexing into remaining space
- right preview column containing Live Preview

The app shell must be viewport-locked.

Do not deviate from the locked v1.6 layout without CEO approval.

### Rule 13: Tests are required

New behavior requires tests.

Bug fixes require regression tests where practical.

### Rule 14: Memory-only job state

Job state in the frontend must be memory-only.

Use Zustand without persistence middleware for job state.

Do not store job state, task IDs, or file data in localStorage/sessionStorage.

### Rule 15: Persist only user preferences

Only theme preference and language preference may be persisted to localStorage.

All other state must be memory-only or backend-truth.

### Rule 16: i18n for all UI strings, with one brand exception

No hardcoded UI text in React components except the literal brand wordmark.

All UI strings must use react-i18next translation keys.

New UI strings must be added to both:

- `en.json`
- `id.json`

The literal brand wordmark `Scan2Text` is i18n-exempt.

### Rule 17: CPU-only inference

Do not add GPU-specific code paths or dependencies.

All OCR inference must work on CPU.

The model, `vlm.gguf` + `mmproj.gguf`, runs via `llama-cpp-python` with CPU-friendly parameters.

### Rule 18: Desktop-only for MVP

Do not add responsive/mobile layout code.

The Command Center layout is desktop-only.

Mobile/responsive is deferred to a later phase.

### Rule 19: Trace live imports before editing UI

Before editing any visible UI component, trace the live import chain from the actual App entry.

Do not edit a ghost, duplicate, or unused component file and assume it controls the visible UI.

The TopBar that renders in the real App tree is the source of truth for the visible wordmark.

### Rule 20: Preserve the viewport lock

The app shell must remain viewport-locked.

Do not reintroduce page-level scrolling.

Only designated internal ScrollAreas may scroll.

The BottomBar must remain visible without scrolling.

### Rule 21: Scrollbars are affordances

Scrollbars must be always visible where required.

Do not use hover-only scrollbars.

Do not hide scrollbars for aesthetic minimalism.

Scrollbars must remain thin, rounded, warm, and theme-aware.

### Rule 22: Card depth uses inline longhand styles in v1.6

For the v1.6 visual-correctness work, card depth must be applied through theme-aware inline styles.

Depth must use explicit longhand style properties.

Utility classes may support layout and spacing, but the source of truth for card depth must be inline style.

All primary cards must have depth:

- Dropzone card
- Queue card
- Preview card

Flat cards are not allowed.

### Rule 23: Rebuild slices must protect existing UI contracts

When rebuilding or polishing a slice, re-assert all pre-existing row and panel elements, not only the new visual elements.

For queue rows, this includes:

- file type icon
- file name
- file size
- status indicator
- tooltip
- thin fake progress bar

Visual polish must not silently remove metadata or affordances.

### Rule 24: QA script artifact is required

Phase completion requires a manual QA script artifact in:

`second-brain/02-QA/`

The QA script must be run before the phase is marked complete.

The result should be recorded in the QA artifact, commit message, or PR notes.

### Rule 25: Share placeholder only until approved swap

The MVP Share button uses the placeholder target:

`https://placeholder.local`

Do not replace it with a production share URL until the post-GitHub share target is approved.

---

## 21. Definition of Done

The MVP is done when:

- `Scan2Text.exe` launches on Windows 10/11 without admin rights.
- First-run setup creates required folders and settings.
- The v1.6 Command Center shell renders correctly:
  - TopBar
  - main content area
  - BottomBar
- The app shell is viewport-locked using `h-screen` or equivalent.
- The browser/body does not scroll in normal desktop use.
- The BottomBar remains visible without scrolling.
- The main layout reads as 34/60 + 2% gutter spacing.
- The left work column contains Dropzone and Queue.
- The Dropzone occupies a fixed region of approximately 38% of the left-column space.
- The Queue flexes into the remaining left-column space.
- The right preview column shows rendered Markdown full-width and read-only.
- Dark mode is the default theme.
- Coffee & paper visual identity is applied:
  - warm layered surfaces
  - no primary panel card borders
  - subtle depth
  - soft shadows
  - warm glow
- All primary cards have visible depth:
  - Dropzone card
  - Queue card
  - Preview card
- Card depth is implemented through theme-aware inline longhand styles.
- Queue card shows subtle radiant rays.
- Dropzone shows bold ink-black text.
- Dropzone shows colored upload icon on the left.
- Dropzone shows smile emoji on the right.
- ScrollAreas exist for Dropzone, Queue, and Preview.
- Scrollbars or scrollbar rails are always visible.
- Scrollbars are thin, rounded, and warm.
- Hover-only scrollbars are not present.
- TopBar shows literal brand wordmark:
  - `Scan2Text`
- The wordmark is visible in the live TopBar rendered by the actual App import chain.
- A real App render test asserts the wordmark text.
- TopBar icon-only buttons show translated tooltips.
- Theme toggle works and persists to localStorage.
- Language toggle works for EN/ID and persists to localStorage.
- All UI strings are translated except the literal brand wordmark.
- User can drag and drop supported files.
- File validation rejects files greater than 50MB with error toast.
- File validation rejects unsupported types with error toast.
- Unsupported files in a batch are skipped and logged.
- Single image OCR works offline.
- Simple PDF OCR works offline.
- Multi-file queue processes in FIFO order.
- Queue row shows:
  - file type icon
  - file name
  - file size
  - status indicator
  - translated tooltip or accessible equivalent
  - thin fake progress bar
- Queue status indicators render correctly:
  - spinner while uploading/processing
  - glossy green dot on completed
  - red dot on failed
- Fake progress bar animates:
  - 0% to 90% over 30 seconds
  - jump to 100% on completion
- Auto-select shows result when job completes.
- Background jobs re-poll every 60 seconds, maximum 10 times, after 30-second polling timeout.
- Model loading shows progress.
- Each valid input file produces one Markdown file.
- Multiple input files are not merged into one Markdown file.
- Markdown output preserves simple structure on a best-effort basis.
- Output naming is collision-safe.
- Settings persist after restart.
- Update check is non-blocking and works when online.
- Errors are clear, logged, and translated.
- BottomBar shows:
  - icon-only Share button on the left
  - worker status, RAM usage, and version centered
- Share button uses placeholder target:
  - `https://placeholder.local`
- Automated tests pass without requiring the real large model.
- Manual test with 3 CEO-provided samples is accepted by human review.
- Manual QA script exists in `second-brain/02-QA/`.
- Manual QA script has been run and results recorded.
- PRD v1.6 files 01–04 are approved and committed.

---

## 22. Open Items

### Resolved in v1.3

- Exact model file names:
  - `vlm.gguf` for GLM-OCR 0.9B language model
- Exact mmproj file name:
  - `mmproj.gguf` for vision projector
- Read-only preview included:
  - yes

### Resolved in v1.4

- Read-only preview layout:
  - full-width rendered Markdown in right panel
- Panel ratios:
  - 20/20/60 at that time
- Queue Remove button:
  - removed from MVP scope

### Resolved in v1.5

- Final visual styling:
  - coffee & paper palette
- Logo identity at that time:
  - pictogram chip + live-text wordmark

### Resolved in v1.6

- Main layout:
  - 34/60 + 2% gutters
  - supersedes 20/20/60
- Left work column:
  - Dropzone fixed ~38%
  - Queue flex
- App shell:
  - viewport-locked using `h-screen`
- Scroll affordances:
  - always-visible thin warm scrollbars for Dropzone, Queue, and Preview
- TopBar wordmark:
  - literal brand text `Scan2Text`
  - i18n-exempt
- BottomBar:
  - icon-only Share button on left
  - worker/RAM/version centered
- Share target:
  - placeholder `https://placeholder.local`
- Dropzone personality:
  - bold ink-black text
  - colored upload icon left
  - smile emoji right
- Card depth:
  - subtle gradient + shadow on all primary cards
  - theme-aware inline longhand styles
- Queue decoration:
  - radiant rays on Queue card
- Queue row contract:
  - file type icon
  - file name
  - file size
  - status indicator
  - translated tooltip
  - thin fake progress bar

### Still Open

These items will be finalized during implementation/testing:

- Three CEO-provided sample files for OCR validation.
- Final performance thresholds after benchmark.
- Final body font choice.
- Executable icon, scheduled for Phase 7.
- Production share URL swap after GitHub/sharing availability.
- Whether update helper script is needed in a later version.
- macOS packaging in Phase 2.
- Mobile strategy in a later phase.
- Verify PDF-to-image conversion pipeline for GLM-OCR.
- VLM smoke test with real `vlm.gguf` + `mmproj.gguf` via `llama-cpp-python`.
- Backend `GET /health` finalization if not already complete.
- Backend `POST /cancel/{task_id}` endpoint for queue cancel action.
- Review and adjust Indonesian translations drafted by AI.

---

## 23. Future Phases

### Phase 7

- Phase 7 grills and planning.
- Executable icon.
- Production share target replacement if approved.
- Continued visual polish and stability hardening.

### Phase 2

- macOS support
- mobile/responsive layout
- in-app Markdown editing
- editable Markdown with save-to-disk
- copy-to-clipboard button for Markdown results
- real PDF thumbnails via `pdf.js` rendering
- side-by-side image thumbnail compare toggle
- Queue Remove button
- performance optimization for VLM inference
- update helper
- better PDF handling

### Phase 3

- Micro-SaaS version
- cloud API integration
- Tauri/Rust or web app distribution
- account and billing features if needed
- re-evaluate WebSocket transport for real-time progress
- queue cancel backend logic, including interrupting `llama-cpp-python` mid-run

---

## 24. Engineering Note

This PRD is the source of truth for the Scan2Text MVP.

Sources of truth:

- Product scope:
  - `01-product-and-scope.md`, v1.6
- Functional requirements:
  - `02-functional-requirements.md`, v1.6
- Architecture:
  - `03-non-functional-and-architecture.md`, v1.6
- Testing & engineering rules:
  - this document, v1.6

UI layout source of truth:

- v1.6 Command Center shell
- TopBar
- main content area
- BottomBar
- 34/60 main split
- approximately 2% gutter/spacing budget
- left work column containing Dropzone and Queue
- Dropzone fixed at approximately 38% of left-column space
- Queue flexing into remaining space
- right preview column containing Live Preview

Agent memory:

- `AGENTS.md`
- `second-brain/00-Current-State.md`

QA artifact:

- `second-brain/02-QA/scan2text-phase6-manual-test.md`, or equivalent phase QA script

Lessons to add to `AGENTS.md`:

- Depth via inline styles only for v1.6 card depth work.
- Trace live imports before editing UI.
- Preserve the viewport lock.
- QA script artifact exists and must be run.
- Rebuild slices must re-assert all pre-existing row and panel elements, not just new ones.
- Scrollbars are affordances and must always be visible.

Any major technical change requires an ADR.

Any product scope change requires CEO approval.

Any AI-generated implementation must conform to this PRD, the local-first guardrails, and the AIASD rules above.