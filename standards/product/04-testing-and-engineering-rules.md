# Testing Strategy & Engineering Rules — Scan2Text MVP
Version: 1.3
Date: 2026-08-06
Status: Approved for Implementation

## Change Log

| Version | Date       | Changes |
|---------|------------|---------|
| 1.0     | 2026-06-22 | Initial testing strategy and engineering rules |
| 1.1     | 2026-06-22 | Minor clarifications |
| 1.2     | 2026-06-22 | Removed in-app editing from scope, updated open items |
| 1.3     | 2026-08-06 | Updated tests for Command Center UI, Zustand store, react-i18next, react-markdown, file validation (50MB), fake progress, auto-select, background re-poll. Added new AIASD rules: memory-only job state, preferences persistence, i18n, CPU-only, desktop-only. Updated Definition of Done. Resolved open items (model names, preview). Added new open items (PDF-to-image, VLM smoke test, worker/cancel endpoints, translation review). Updated Future Phases. |

---

## 19. Testing Strategy

Testing must follow AIASD-friendly behavior testing.

### Test Pyramid

- 70% integration tests
- 20% unit tests
- 10% end-to/manual tests

### Unit Tests

Test small pure logic:

- output file naming (timestamp + collision resolution)
- file-name sanitization
- settings validation
- version comparison
- error mapping (backend code → translated UI message)
- guardrail checks (50MB size, 20-page PDF limit)
- file type validation (PNG/JPG/JPEG/WEBP/PDF)
- i18n key resolution
- fake progress easing function (0→90% over 30s)

### Integration Tests

Test API/service/store behavior without requiring the real 1.5 GB model.
Use a fake OCR engine.

**Backend tests:**
- add valid file to queue
- process job with fake OCR engine
- produce one Markdown file per valid input file
- do not merge multiple input files into one Markdown file
- skip unsupported file in batch and log it
- continue processing valid files after skipped file
- reject oversized PDF (>20 pages)
- reject oversized file (>50MB)
- handle missing output folder
- verify settings persistence
- `GET /status/{task_id}` returns correct status progression
- `POST /process` returns `task_id`
- `GET /health` returns worker state + RAM usage

**Frontend tests:**
- Zustand store: addJob, updateJob, startUpload, pollJob
- FIFO queue order (`jobOrder[]` array)
- Auto-select behavior on job completion
- Background re-poll logic (every 60s, max 10 re-polls)
- Fake progress animation state transitions
- File validation (type + 50MB) with toast errors
- react-markdown + remark-gfm rendering
- i18n key resolution (English + Indonesian)
- Theme toggle (dark ↔ light) with localStorage persistence
- Language toggle with localStorage persistence

### Manual/E2E Tests

Run against real model (GLM-OCR 0.9B) and real samples:

- launch app
- drop image → verify fake progress + Markdown result in right panel
- drop PDF → verify Markdown result with PDF icon placeholder in left column
- drop mixed batch with unsupported file → verify unsupported skipped + valid processed
- drop oversized file (>50MB) → verify error toast
- drag-and-drop + file picker both work
- auto-select shows completed result automatically
- remove completed/failed jobs from queue
- switch language → all UI strings update
- switch theme → dark/light mode toggles correctly
- restart app → settings persist, language/theme persist
- verify bottom bar shows worker status + RAM usage

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
- UI (React components + Zustand stores)
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

### Rule 6: No in-app editing (MVP only)
MVP does not include an in-app editor.
Final output is Markdown. Editing happens outside Scan2Text.
**Note:** In-app Markdown editing is planned as a future feature (Phase 2).

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

### Rule 12: Follow the Command Center layout
Do not add unnecessary screens, settings, or features beyond this PRD.
UI layout must follow the approved Command Center design (3-panel + bottom bar).
Do not deviate from the locked panel ratios (20/35/45) without CEO approval.

### Rule 13: Tests are required
New behavior requires tests.
Bug fixes require regression tests where practical.

### Rule 14: Memory-only job state
Job state in the frontend must be memory-only (Zustand without persistence middleware).
Do not store job state, task IDs, or file data in localStorage/sessionStorage.

### Rule 15: Persist only user preferences
Only theme preference and language preference may be persisted to localStorage.
All other state must be memory-only or backend-truth.

### Rule 16: i18n for all UI strings
No hardcoded text in React components.
All UI strings must use react-i18next translation keys.
New UI strings must be added to both `en.json` and `id.json`.

### Rule 17: CPU-only inference
Do not add GPU-specific code paths or dependencies.
All OCR inference must work on CPU.
The model (`vlm.gguf` + `mmproj.gguf`) runs via `llama-cpp-python` with CPU-friendly parameters.

### Rule 18: Desktop-only for MVP
Do not add responsive/mobile layout code.
The Command Center layout is desktop-only.
Mobile/responsive is deferred to Phase 2.

---

## 21. Definition of Done

The MVP is done when:

- `Scan2Text.exe` launches on Windows 10/11 without admin rights.
- First-run setup creates required folders and settings.
- **Command Center layout renders correctly** (3-panel + bottom bar, dark mode default).
- **Theme toggle works** and persists to localStorage.
- **Language toggle works** (EN/ID) and persists to localStorage.
- User can drag and drop supported files.
- **File validation rejects files >50MB** with error toast.
- **File validation rejects unsupported types** with error toast.
- Unsupported files in a batch are skipped and logged.
- Single image OCR works offline.
- Simple PDF OCR works offline (**with PDF icon placeholder** in right panel).
- **Multi-file queue processes in FIFO order.**
- **Fake progress bar animates** (0→90% over 30s, jump to 100% on completion).
- **Auto-select shows result** when job completes.
- **Background jobs re-poll** every 60s (max 10 times) after 30s polling timeout.
- Model loading shows progress.
- Each valid input file produces one Markdown file.
- Multiple input files are not merged into one Markdown file.
- Markdown output preserves simple structure on a best-effort basis (GFM supported via remark-gfm).
- Output naming is collision-safe.
- Settings persist after restart.
- Update check is non-blocking and works when online.
- Errors are clear, logged, and translated.
- **Bottom bar shows worker status + RAM usage.**
- Automated tests pass without requiring the real large model.
- Manual test with 3 CEO-provided samples is accepted by human review.

---

## 22. Open Items

### Resolved in v1.3

- ✅ Exact model file names → `vlm.gguf` (GLM-OCR 0.9B language model)
- ✅ Exact mmproj file name → `mmproj.gguf` (vision projector)
- ✅ Whether read-only preview included → YES, included in right panel (30% image / 70% Markdown)

### Still Open

These items will be finalized during implementation/testing:

- Three CEO-provided sample files for OCR validation.
- Final performance thresholds after benchmark.
- Final visual styling (exact colors, shadows, spacing per Linear/Vercel inspiration).
- Whether update helper script is needed in a later version.
- macOS packaging in Phase 2.
- Mobile strategy in Phase 3.
- **Verify PDF-to-image conversion pipeline** for GLM-OCR (VLM likely needs rendered pixels, not raw PDF bytes).
- **VLM smoke test** with real `vlm.gguf` + `mmproj.gguf` via `llama-cpp-python`.
- **Build backend `GET /health` endpoint** (worker status + RAM usage).
- **Build backend `POST /cancel/{task_id}` endpoint** (for queue cancel action).
- **Review and adjust Indonesian translations** drafted by AI (casual/friendly tone).

---

## 23. Future Phases

### Phase 2
- macOS support
- Mobile/responsive layout
- In-app Markdown editing (Slices 23-24: toggle view/edit + save to backend)
- Editable Markdown with save-to-disk
- Copy-to-clipboard button for Markdown results
- Real PDF thumbnails (via `pdf.js` rendering)
- Performance optimization (VLM inference tuning)
- Update helper
- Better PDF handling

### Phase 3
- Micro-SaaS version
- Cloud API integration
- Tauri/Rust or web app distribution
- Account and billing features if needed
- Re-evaluate WebSocket transport for real-time progress
- Queue cancel backend logic (interrupt `llama-cpp-python` mid-run)

---

## 24. Engineering Note

This PRD is the source of truth for the Scan2Text MVP.

**Sources of truth:**
- Product scope: `01-product-and-scope.md` (v1.3)
- Functional requirements: `02-functional-requirements.md` (v1.3)
- Architecture: `03-non-functional-and-architecture.md` (v1.3)
- Testing & engineering rules: this document (v1.3)
- UI layout: Command Center (3-panel + bottom bar) as locked in Phase 5
- Agent memory: `AGENTS.md` + `second-brain/00-Current-State.md`
- Phase 5 plan: `second-brain/01-Agent-Memory/Phase-5/phase-5-command-center-plan.md`

Any major technical change requires an ADR.
Any product scope change requires CEO approval.
Any AI-generated implementation must conform to this PRD, the local-first guardrails, and the AIASD rules above.