# Non-Functional Requirements & Architecture — Scan2Text MVP

Version: 1.14
Date: 2026-08-16
Status: Approved for Implementation
Format: clean non-table (CEO instruction)

## Change Log

- 1.0 — 2026-06-22 — Initial NFR and architecture.
- 1.1 — 2026-06-22 — Minor clarifications.
- 1.2 — 2026-06-22 — Updated output naming, removed in-app editing.
- 1.3 — 2026-08-06 — Model GLM-OCR 0.9B; Vite + React + TS + Tailwind + shadcn frontend; Zustand, react-markdown, react-i18next; contract POST /process + GET /status/{task_id}; Command Center reference; runtime folder with vlm.gguf/mmproj.gguf.
- 1.4 — 2026-08-07 — ScanJob.imageUrl removed (Phase 2 compare-toggle candidate); styling locks of that time (zinc+purple, 20/20/60, radiant-lines center panel); NFR-03 zero-CPU idle decoration.
- 1.5 — 2026-08-07 — Coffee & paper palette; no panel borders; depth recipe; top bar logo chip + live-text wordmark + DEMO badge; radiant-lines recolored warm.
- 1.6 — 2026-08-07 — Phase 6 Finale: 34/60 + 2% gutters; left work column (Dropzone ~38% + Queue flex); viewport-locked shell; always-visible warm scrollbars; literal wordmark; BottomBar share + centered telemetry; Dropzone personality; inline longhand depth; Queue radiant rays; share placeholder; queue row regression contract.
- 1.7 — 2026-08-07 — Hotfix finale (CEO-approved): shell = fixed inset-0 absolute viewport lock (fractions decide, content never resizes panels); TopBar 34px with CENTER brand image text.png 153×34 alt="Scan2Text" + static glow; left = logo chip + DEMO intact, no literal text wordmark; Share moved to BottomBar RIGHT (click = soft toast, no navigation); BottomBar left empty, center telemetry (Worker Idle/Busy · RAM "—" until GET /health · version), pinned at any window size; Dropzone: dashed area fills card, bg image bacground-left-top-panel.jpg 15% opacity single-value size centered, header + footer bold ink #1F150C, footer adds "max 10 files per batch", Dropzone ScrollArea removed; 10-file batch cap enforced; queue fixed 14px dot-only status slot (grey / yellow spinner / glossy green / glossy red) with translated tooltips; depth = visible-subtle gradation; Preview header buttons borderless transparent with caramel hover; Radix ScrollArea tray neutralized via CSS override.
- 1.8 — 2026-08-08 — Phase 6 closure: 1vh TopBar gutter; pathological short-window accepted edge; fake progress deferred to v2/v3; vault map per ADR-004; Phase 6 COMPLETE.
- 1.9 — 2026-08-08 — ADR-005 consolidation: backend source of truth = src/scan2text; §13 repo tree updated; §14 canonical health = /api/health.
- 1.10 — 2026-08-10 — ADR-006 engine swap; §12/§13 model lines updated; NFR-04 known-defect reference; NFR-06 model size note.
- 1.11 — 2026-08-10 — ADR-007: CPU budget auto = 60% of logical cores; feedback folder in runtime tree; GDrive distribution + in-app downloader.
- 1.12 — 2026-08-13 — DOC-02: aligned with ADR-008; pywebview replaced by Tauri v2; runtime folder + tech stack updated; stale /api/health note removed.
- 1.13 — 2026-08-13 — DOC-05: folded PRD-04 §19 Testing Strategy into PRD-03 as §19 (trimmed historical QA run records per CEO Option A); PRD-04 dissolution step 1 of 4.
- 1.14 — 2026-08-16 — Phase 10 closure: BottomBar telemetry adds CPU%; GET /api/health returns cpu percent; loopback-CORS note points to ADR-008 addendum.

---

## 10. Non-Functional Requirements

### NFR-01: Offline-First

- App must work fully offline after initial download.
- No document processing may require internet.
- Update check is optional and non-blocking.

### NFR-02: Privacy

- Document content stays on the local machine.
- No telemetry, no analytics, no cloud upload.
- Logs must not contain extracted OCR text by default.
- Logs contain no file names and no document content; feedback is never auto-sent (ADR-007).

### NFR-03: Performance

- Prioritize accuracy over speed.
- Long-running operations must show progress.
- UI must not freeze during processing.
- Performance thresholds refined after real sample testing.
- CPU-only inference; no GPU required.
- Zero-CPU idle decoration: all decorative UI (Queue radiant rays, brand glow) static; no ambient canvas/JS loops.
- Internal scrolling must not reflow or page-scroll the shell.
- CPU budget: auto threads = 60% of logical cores (floor, min 1) so the PC stays usable during OCR (ADR-007).

### NFR-04: Accuracy

- Target: human-validated high accuracy (~95% visible text on approved samples).
- Accuracy judged by human review.
- Simple lists/tables preserved best-effort; perfect layout reconstruction not required.
- Known model limitations recorded in ADR-006 defect register; accuracy judged by human review against originals.

### NFR-05: Reliability

- One bad file must not crash the app.
- One failed queue item must not stop remaining valid items unless fatal.
- Unsupported files skipped and logged.
- Graceful recovery from missing settings (recreate defaults).
- Visual slices must not break queue metadata, status indicators, or progress affordances.

### NFR-06: Portability

- Distributable as folder/zip (~1.5 GB with models). Models ≈1.0GB (Q8 0.81 + mmproj 0.20), within ~1.5GB budget.
- No complex installer.

### NFR-07: Compatibility

- Windows 10/11, x86_64, min 8 GB RAM (16 GB recommended), ≥5 GB free disk.
- Desktop-only for MVP; mobile/responsive deferred.
- Shell designed for a fixed desktop viewport.

### NFR-08: Visual Affordance and Shell Stability (added v1.6, hardened v1.7)

- Shell pinned to viewport: fixed inset-0 flex-col overflow-hidden. The screen is the only sizing authority.
- No window/body scroll at any window width or height; BottomBar always visible.
- Panels sized by fractions (minmax(0,fr) tracks); content can never stretch a panel (dropzone size constant regardless of job count).
- Scrollbars are affordances: always visible, thin, rounded, warm on Queue + Preview (Dropzone excluded v1.7).
- All primary cards carry visible-subtle depth via theme-aware inline longhand styles; no flat cards.
- Dropzone high-contrast: bold ink header + footer over 15% bg image.
- Brand image with alt="Scan2Text" visible in live TopBar.
- 1vh vertical gutter between TopBar and main (v1.8, CEO delta).
- Pathological short-window heights are a CEO-accepted edge (v1.8); normal short windows fully supported.

---

## 11. Technical Architecture

### Architecture Style

Local-first modular monolith. No cloud services, no external database, no microservices, no Kubernetes, no hosted API.

### Runtime Approach

Portable desktop app with local web UI: a Tauri v2 shell (Rust, ADR-008) bundles the built React frontend and spawns the PyInstaller folder-based backend artifact (dist/scan2text-backend/scan2text-backend.exe) as a child process; the WebView2-backed native window presents the UI. Backend binds 127.0.0.1:47351 in production.

### Frontend-Backend Communication

- Transport: HTTP polling (WebSockets deferred).
- Upload: POST /process (multipart/form-data) → { "task_id": "string" }.
- Status: GET /status/{task_id}; 15 attempts × 2000ms = 30s; then background, re-poll 60s, max 10.

### Frontend Shell Architecture (v1.7)

- Shell: fixed inset-0 flex flex-col overflow-hidden; TopBar shrink-0 (34px); main flex-1 min-h-0; BottomBar shrink-0. 1vh vertical gutter between TopBar and main (v1.8).
- Main grid: grid-cols-[34fr_60fr] gap-[2%]; left column grid-rows minmax(0,38fr)/minmax(0,62fr); all panels min-h-0.
- TopBar: left logo chip + DEMO badge; center brand image text.png 153×34 alt="Scan2Text" + static radial glow (CSS-only); right icon-only theme/language/settings with translated tooltips; all vertically centered.
- BottomBar: grid 1fr auto 1fr; center Worker Idle/Busy (queue-derived) · RAM · CPU% · version constant; right icon-only Share (placeholder https://placeholder.local, toast on click).
- Dropzone: no ScrollArea; dashed area flex-1 min-h-0 fills card; bg image layer 15% opacity, background-size single value 100%, center, no-repeat, pointer-events none.
- Queue + Preview: ScrollArea with always-visible warm scrollbars.
- Radix ScrollArea tray neutralized globally via CSS override: [data-radix-scroll-area-viewport] > div { display:block; min-width:0; height:auto } — this is what makes truncation and internal scroll work inside Radix viewports.
- The rendered TopBar must be the live TopBar in the App import chain; ghost components are deleted on sight.

### Frontend Shell Architecture (v1.8)
- Layout: 34/60 + 2% gutters; left rows 38fr/62fr; fixed, not resizable; fixed inset-0 shell; 1vh TopBar gutter (v1.8).


---

## 12. Approved MVP Tech Stack

### Backend

- Python 3.11+; FastAPI; Pydantic; llama-cpp-python; OvisOCR2 0.9B (vlm.gguf Q8_0 + mmproj.gguf f16, ADR-006); pypdfium2; JSON settings; rotating local logs.

### Frontend

- Vite + React + TypeScript; Tailwind CSS + shadcn/ui; Zustand (memory-only job state); react-markdown + remark-gfm; react-i18next (en + id); Tauri v2 (desktop shell, ADR-008); PyInstaller (backend artifact only, folder-based — ADR-008).

### Key Frontend Decisions (v1.8)

- No React Router; single-page Command Center.
- Dark default + light toggle; theme + language persisted to localStorage; auto-detect browser language, fallback English.
- Job state memory-only; no localStorage/sessionStorage for job data.
- Validation: PNG/JPG/JPEG/WEBP/PDF; 50MB per file; batch cap 10 files (first 10 kept, extras skipped + warning toast + logged).
- Layout: 34/60 + 2% gutters; left rows 38fr/62fr; fixed, not resizable; fixed inset-0 shell; 1vh TopBar gutter (v1.8).
- Palette — DARK: bg #080502; Dropzone #E1DCC9 (ink #1F150C); Queue #412D15 (cream #F2EBDD); Preview #1F150C (cream); accent #E3A55F. LIGHT: bg #F9F8F6; #EFE9E3 / #D9CFC7 / #C9B59C; accent #92400E. Purple retired; DEMO amber retained; green/red dots retained.
- Depth: no borders; visible-subtle gradation via theme-aware inline longhand styles (gradient + inset top highlight + soft shadow + warm glow). Queue card radiant rays (static, zero CPU).
- Identity: logo chip + DEMO left; center brand image alt="Scan2Text" + static glow; icon-only buttons with translated tooltips.
- Typography: Quantico display + readable swap-friendly body font (single CSS variable; final choice open).
- Components: shadcn primitives (Dialog, Tooltip, Spinner, Progress, Switch) + ScrollArea (Queue/Preview) + toast.

---

## 13. Runtime Folder Structure

```text
Scan2Text/
├── Scan2Text.exe                  # Tauri v2 shell (ADR-008); bundles built React frontend
├── scan2text-backend/             # PyInstaller folder-based artifact (ADR-008)
│   └── scan2text-backend.exe      # FastAPI backend; binds 127.0.0.1:47351 in prod
├── models/                        # EXTERNAL — not bundled; downloaded at runtime (ADR-008)
│   ├── vlm.gguf          # OvisOCR2 0.9B language model (ADR-006)
│   └── mmproj.gguf       # Vision projector (multimodal adapter)
├── output/
├── settings/
│   └── settings.json
├── feedback/
│   ├── pending/
│   └── sent/
└── logs/
    └── app.log
```

### Source Code Repository Structure

```text
scan2text/
    ├── src/scan2text/            # Python backend, src layout (ADR-005)
    │   ├── api/                  # FastAPI OCR pipeline: POST /process, GET /status/{task_id}
    │   ├── routes/               # GET /api/health, GET/PUT /api/settings
    │   ├── adapters/             # OCREngine ABC + FakeOCR + LlamaCPP real engine
    │   ├── services/             # file/output/path/pdf/queue/settings/logging/update
    │   └── models/               # Pydantic data contracts
    ├── tests/                    # backend pytest suite (pytest.ini pythonpath=src)
├── frontend/
│   ├── src/
│   │   ├── components/       # layout/, layout/panels/, ui/, dropzone/
│   │   ├── stores/           # Zustand stores
│   │   ├── lib/              # API layer, depthStyles, formatBytes, fileKind
│   │   ├── i18n/             # en.json, id.json
│   │   └── hooks/
│   ├── Images/               # logo.png, text.png, bacground-left-top-panel.jpg
│   └── tests/
├── models/                   # gitignored
└── second-brain/
    ├── 00-Current-State.md
    ├── 00-Inbox/
    ├── 01-Agent-Memory/      # Phase-2 … Phase-6 slice summaries
    ├── 02-QA/                # manual test scripts (Phase 6 closure)
    └── 03-Architecture/      # Architecture docs/ADR
    └── 04-Product/           # PRD Files (source of truth)
    └── 05-Sprints/           # Sprint Summaries 
```

---

## 14. Local Application Contract

Internal local contract (not a public API).

- POST /process — multipart file bytes → { "task_id" }; starts background OCR.
- GET /status/{task_id} — status (pending/uploading/processing/completed/failed/background) + result_markdown on completion.
- GET /api/health — worker idle/busy, RAM percent, CPU percent (psutil.cpu_percent()), model loaded state (used by BottomBar).
- GET /api/settings / PUT /api/settings.
- Future (not MVP-critical): POST /cancel/{task_id}; POST /api/output/open.
- Share placeholder note (v1.7): MVP Share is frontend-only; target constant https://placeholder.local; no backend endpoint; swapped post-GitHub.
- Loopback CORS: backend `allow_origins=["*"]` is safe because backend binds 127.0.0.1 only (local-first, NFR-02). See ADR-008 addendum 2026-08-16 for full rationale.
- Legacy note: /api/jobs routes are NOT used in MVP.

---

## 15. Core Data Contracts

All core objects use strict typed models.

```python
class AppSettings:
    output_dir: str
    max_pdf_pages: int
    cpu_threads: int          # 0 = automatic
    check_updates_on_startup: bool
    language: str             # "auto" | "en" | "id"
    theme: str                # "dark" | "light"
    hide_welcome_notice: bool # ADR-007
```

```python
class JobStatus:
    PENDING = "pending"
    UPLOADING = "uploading"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    BACKGROUND = "background"
```

```python
class OCRJob:                 # backend
    id: str                   # UUID
    file_name: str
    file_path: str
    file_size: int | None     # added v1.6 for queue row metadata
    status: str
    created_at: datetime
    updated_at: datetime
    output_path: str | None
    error_code: str | None
    error_message: str | None
```

```typescript
interface ScanJob {           // frontend Zustand store
  id: string;
  fileName: string;
  fileSize: number | null;    // added v1.6 for queue row metadata
  taskId: string | null;
  status: JobStatus;
  isBackground: boolean;
  createdAt: number;
  resultMarkdown: string | null;
  error: string | null;
}
```

Notes: imageUrl removed 2026-08-07 (Phase 2 compare-toggle candidate); queue rows show file type icon instead.

```python
class OCRResult:
    job_id: str
    source_file: str
    output_path: str | None
    full_text: str
    completed_at: datetime

class ProgressEvent:          # future WebSocket support
    job_id: str
    status: str
    percent: int | None
    eta_seconds: int | None
    message: str | None

class UpdateInfo:
    current_version: str
    latest_version: str
    download_url: str
    notes: list[str]
    model_version: str | None
```

---

## 16. Global Error Envelope

```json
{
  "error": {
    "code": "MODEL_NOT_FOUND",
    "message": "Model file not found. Please reinstall Scan2Text or restore the models folder.",
    "details": {}
  }
}
```

- Unsupported files in a batch are non-fatal where possible.
- Error codes stable and machine-readable; no raw stack traces to users.
- Frontend mapping: all UI error strings via translation keys; known backend codes mapped to translated messages; unknown shown as-is English.
- Queue status tooltips and TopBar/Share tooltips translated.

---

## 17. Update Mechanism

- Source: GitHub-hosted version.json; binaries (app zip + models) hosted on Google Drive; download_url points to GDrive. First run: in-app model downloader (progress + cancel + size verify) or manual zip replacement (ADR-007).
- Flow: launch → if enabled + online, fetch → if newer, notify in top bar → user downloads zip manually → replaces app files preserving settings/, output/, logs/.
- Manual process; no self-updating executable.

---

## 18. Logging Requirements

- Location: logs/app.log; size-based rotation: maxBytes 1 MB, backupCount 1.
- Log: app start, settings loaded, model load started/completed, job started/completed/skipped/failed, output saved, update check result, batch-cap skips (extension + byte count + page count only; no file names; no content).
- Fields: extension + byte count + page count + duration + error/warning code + model version + timestamp.
- Never log extracted OCR text or full document contents by default.

---

## 19. Testing Strategy

Testing must follow AIASD-friendly behavior testing.

### Test Pyramid

- 70% integration tests
- 20% unit tests
- 10% end-to/manual tests

### Unit Tests

- output file naming (timestamp + collision resolution)
- file-name sanitization
- settings validation
- version comparison
- error mapping (backend code → translated UI message)
- guardrail checks (50MB size, 20-page PDF limit, 10-file batch cap)
- file type validation (PNG/JPG/JPEG/WEBP/PDF)
- i18n key resolution
- fake progress easing function (0→90% over 30s)
- file-size formatting for queue rows

### Integration Tests

Backend (fake OCR engine):

- add valid file to queue; process; one Markdown per valid input; never merge
- skip unsupported file in batch + log; continue valid files
- reject oversized PDF (>50 pages) and file (>50MB)
- handle missing output folder; settings persistence
- POST /process returns task_id; GET /status/{task_id} progression; GET /health worker + RAM
- queue status slot per status: grey dot (pending), yellow spinner (uploading/processing), glossy green (completed), glossy red (failed); dot-only, no visible text; translated tooltips; retry on failed; absence test asserts NO fake progress bar (deferred v2/v3, v1.8)

Frontend:

- Zustand store: addJob, updateJob, startUpload, pollJob; FIFO order; auto-select; background re-poll (60s × 10)
- fake progress transitions; file validation toasts
- 10-file cap: dropping 12 valid files creates exactly 10 jobs + warning toast + logged skips
- queue status slot per status: grey dot (pending), yellow spinner (uploading/processing), glossy green (completed), glossy red (failed); dot-only, no visible text; translated tooltips; thin fake progress bar while active; retry on failed
- react-markdown + remark-gfm rendering; i18n EN/ID; theme + language persistence

Frontend v1.7 visual-contract (real <App /> render):

- brand image with alt="Scan2Text" present in live TopBar + logo chip left
- TopBar 34px; items vertically centered
- shell has fixed inset-0 + flex-col + overflow-hidden; main flex-1 min-h-0; left column grid-rows minmax(0,38fr)/minmax(0,62fr)
- BottomBar: shrink-0; grid 1fr auto 1fr; center telemetry (Worker/RAM/version); Share icon-only RIGHT; no text label
- Dropzone: dashed area flex-1 min-h-0; NO ScrollArea; bg layer opacity 0.15 + single-value background-size; header + hint bold ink
- Preview header: two real <button> elements, borderless, transparent bg, translated labels
- index.css contains the Radix tray override selector
- structural constancy: render with 0 jobs vs 10 jobs — same panel structure

### Manual/E2E Tests

Run against real model and real samples:

- launch app; first-run setup; drag-and-drop + picker
- drop image / PDF → fake progress + Markdown in right panel; auto-select
- mixed batch with unsupported → skipped + logged; oversized → toast
- drop 11 files → first 10 processed + warning toast; dropzone size unchanged
- wide window (2560px) + short window → BottomBar always visible; no page scroll
- queue: names truncate with ellipsis; status dots visible at row right; warm always-visible scrollbar on queue + preview
- TopBar: brand image + glow; logo chip + DEMO; icon-only tooltips translated
- language + theme toggles persist; restart persistence
- bottom bar telemetry centered; Share right with toast on click
- drop image / PDF → status spinner + Markdown in right panel; auto-select

### QA Manual Test Script Artifact

- Must exist at `second-brain/02-QA/scan2text-phase6-manual-test.md`.
- Must include: baseline verification (npm run test count, git log top 3, AGENTS.md map), all visual/scroll/queue/share checks above, result recording (pass/fail, date, commit).
- Must be RUN before Phase 6 is marked complete.

### OCR Accuracy Validation

- CEO provides 3 representative samples; human review in right panel; ~95% visible text target; best-effort lists/tables.