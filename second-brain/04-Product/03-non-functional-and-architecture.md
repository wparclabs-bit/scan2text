# Non-Functional Requirements & Architecture — Scan2Text MVP

Version: 1.9
Date: 2026-08-08
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

### NFR-03: Performance

- Prioritize accuracy over speed.
- Long-running operations must show progress.
- UI must not freeze during processing.
- Performance thresholds refined after real sample testing.
- CPU-only inference; no GPU required.
- Zero-CPU idle decoration: all decorative UI (Queue radiant rays, brand glow) static; no ambient canvas/JS loops.
- Internal scrolling must not reflow or page-scroll the shell.

### NFR-04: Accuracy

- Target: human-validated high accuracy (~95% visible text on approved samples).
- Accuracy judged by human review.
- Simple lists/tables preserved best-effort; perfect layout reconstruction not required.

### NFR-05: Reliability

- One bad file must not crash the app.
- One failed queue item must not stop remaining valid items unless fatal.
- Unsupported files skipped and logged.
- Graceful recovery from missing settings (recreate defaults).
- Visual slices must not break queue metadata, status indicators, or progress affordances.

### NFR-06: Portability

- Distributable as folder/zip (~1.5 GB with models).
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

Portable desktop app with local web UI: the executable starts a local FastAPI backend, serves the React frontend locally, opens the UI in a native desktop window (pywebview).

### Frontend-Backend Communication

- Transport: HTTP polling (WebSockets deferred).
- Upload: POST /process (multipart/form-data) → { "task_id": "string" }.
- Status: GET /status/{task_id}; 15 attempts × 2000ms = 30s; then background, re-poll 60s, max 10.

### Frontend Shell Architecture (v1.7)

- Shell: fixed inset-0 flex flex-col overflow-hidden; TopBar shrink-0 (34px); main flex-1 min-h-0; BottomBar shrink-0. 1vh vertical gutter between TopBar and main (v1.8).
- Main grid: grid-cols-[34fr_60fr] gap-[2%]; left column grid-rows minmax(0,38fr)/minmax(0,62fr); all panels min-h-0.
- TopBar: left logo chip + DEMO badge; center brand image text.png 153×34 alt="Scan2Text" + static radial glow (CSS-only); right icon-only theme/language/settings with translated tooltips; all vertically centered.
- BottomBar: grid 1fr auto 1fr; center Worker Idle/Busy (queue-derived) · RAM "—" (until GET /health) · version constant; right icon-only Share (placeholder https://placeholder.local, toast on click).
- Dropzone: no ScrollArea; dashed area flex-1 min-h-0 fills card; bg image layer 15% opacity, background-size single value 100%, center, no-repeat, pointer-events none.
- Queue + Preview: ScrollArea with always-visible warm scrollbars.
- Radix ScrollArea tray neutralized globally via CSS override: [data-radix-scroll-area-viewport] > div { display:block; min-width:0; height:auto } — this is what makes truncation and internal scroll work inside Radix viewports.
- The rendered TopBar must be the live TopBar in the App import chain; ghost components are deleted on sight.

### Frontend Shell Architecture (v1.8)
- Layout: 34/60 + 2% gutters; left rows 38fr/62fr; fixed, not resizable; fixed inset-0 shell; 1vh TopBar gutter (v1.8).


---

## 12. Approved MVP Tech Stack

### Backend

- Python 3.11+; FastAPI; Pydantic; llama-cpp-python; GLM-OCR 0.9B (vlm.gguf) + mmproj.gguf; pypdfium2 or equivalent; JSON settings; rotating local logs.

### Frontend

- Vite + React + TypeScript; Tailwind CSS + shadcn/ui; Zustand (memory-only job state); react-markdown + remark-gfm; react-i18next (en + id); pywebview; PyInstaller or equivalent.

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
├── Scan2Text.exe
├── models/
│   ├── vlm.gguf          # GLM-OCR 0.9B language model
│   └── mmproj.gguf       # Vision projector (multimodal adapter)
├── assets/
│   ├── icons/
│   └── ui/               # Built React frontend assets
├── output/
├── settings/
│   └── settings.json
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
- GET /api/health — worker idle/busy, RAM usage, model loaded state (used by BottomBar; until built, UI shows RAM "—").
- GET /api/settings / PUT /api/settings.
- Future (not MVP-critical): POST /cancel/{task_id}; POST /api/output/open.
- Share placeholder note (v1.7): MVP Share is frontend-only; target constant https://placeholder.local; no backend endpoint; swapped post-GitHub.
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

- Source: GitHub-hosted version.json (version, date, download_url, model_version, notes).
- Flow: launch → if enabled + online, fetch → if newer, notify in top bar → user downloads zip manually → replaces app files preserving settings/, output/, logs/.
- Manual process; no self-updating executable.

---

## 18. Logging Requirements

- Location: logs/app.log; rotating; small.
- Log: app start, settings loaded, model load started/completed, job started/completed/skipped/failed, output saved, update check result, batch-cap skips (filename + byte count only).
- Never log extracted OCR text or full document contents by default.