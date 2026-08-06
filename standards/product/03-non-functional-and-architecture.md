# Non-Functional Requirements & Architecture — Scan2Text MVP
Version: 1.3
Date: 2026-08-06
Status: Approved for Implementation

## Change Log

| Version | Date       | Changes |
|---------|------------|---------|
| 1.0     | 2026-06-22 | Initial NFR and architecture |
| 1.1     | 2026-06-22 | Minor clarifications |
| 1.2     | 2026-06-22 | Updated output naming, removed in-app editing |
| 1.3     | 2026-08-06 | Updated OCR model to GLM-OCR 0.9B. Replaced HTMX frontend with Vite + React + TypeScript + Tailwind + shadcn. Added Zustand, react-markdown, react-i18next to stack. Updated backend contract from /api/jobs to POST /process + GET /status/{task_id}. Updated JobStatus enum. Added Command Center layout reference. Updated runtime folder structure with new model filenames. Added frontend architecture section. |

---

## 10. Non-Functional Requirements

### NFR-01: Offline-First
- App must work fully offline after initial download.
- No document processing may require internet.
- Update check is optional and non-blocking.

### NFR-02: Privacy
- Document content stays on the local machine.
- No telemetry in MVP.
- No analytics.
- No cloud upload.
- Logs must not contain extracted OCR text by default.

### NFR-03: Performance
- Prioritize accuracy over speed.
- Long-running operations must show progress.
- UI must not freeze during processing.
- Performance thresholds will be refined after real sample testing.
- **CPU-only inference:** GLM-OCR 0.9B is lightweight enough for CPU-only machines. No GPU required.

### NFR-04: Accuracy
- Target: human-validated high accuracy.
- Initial acceptance target: approximately 95% visible text extraction on approved test samples.
- Accuracy is judged by human review.
- Simple structure such as lists and tables should be preserved on a best-effort basis.
- Perfect layout reconstruction is not required.

### NFR-05: Reliability
- One bad file should not crash the whole app.
- One failed queue item should not stop remaining valid queue items unless fatal.
- Unsupported files in a batch should be skipped and logged.
- App must recover gracefully from missing settings by recreating defaults.

### NFR-06: Portability
- App should be distributable as a folder/zip.
- Initial full package may be approximately 1.5 GB due to model assets.
- No complex installer required.

### NFR-07: Compatibility
- Target MVP platform:
  - Windows 10/11
  - x86_64 CPU
  - Minimum RAM: 8 GB
  - Recommended RAM: 16 GB
  - Disk space: at least 5 GB free for app, models, logs, and output
- **Desktop-only for MVP.** Mobile/responsive layout deferred.

---

## 11. Technical Architecture

### Architecture Style
- Local-first modular monolith.
- No cloud services.
- No external database.
- No microservices.
- No Kubernetes.
- No hosted API.

### Runtime Approach
Scan2Text is a portable desktop application with a local web-based UI.

The executable:
- starts a local Python backend (FastAPI),
- serves the React frontend locally,
- opens the UI in a native desktop window.

This allows Python-based OCR processing while keeping the UI portable and future-friendly.

### Frontend-Backend Communication
- **Transport:** HTTP Polling for task status (WebSockets deferred from Sprint 1 ADR-002).
- **Upload:** `POST /process` with `multipart/form-data`.
- **Status:** `GET /status/{task_id}` polled by frontend.
- **Polling config:** 15 attempts × 2000ms = 30 seconds. After timeout, job marked as "background" and auto re-polled every 60 seconds (max 10 re-polls).

---

## 12. Approved MVP Tech Stack

| Component | Technology |
|-----------|------------|
| Language (Backend) | Python 3.11+ |
| Local backend | FastAPI |
| Data contracts | Pydantic |
| OCR runtime | llama-cpp-python |
| OCR model | GLM-OCR 0.9B (`vlm.gguf`) |
| Vision module | `mmproj.gguf` (paired with vlm.gguf) |
| PDF rendering | pypdfium2 or equivalent lightweight PDF rasterizer |
| Frontend framework | Vite + React + TypeScript |
| Frontend styling | Tailwind CSS + shadcn/ui |
| State management | Zustand (memory-only, no persistence for job state) |
| Markdown rendering | react-markdown + remark-gfm (GitHub Flavored Markdown) |
| Internationalization | react-i18next (English + Indonesian) |
| Desktop window | pywebview |
| Packaging | PyInstaller or equivalent |
| Settings storage | JSON |
| Logs | Rotating local log files |

### Key Frontend Decisions
- **No React Router** for MVP. Single-page Command Center dashboard with state-based panel switching.
- **Dark mode default** with light mode toggle. Theme preference persisted to localStorage.
- **Language preference** persisted to localStorage. Auto-detect browser language, fallback to English.
- **Job state is memory-only** (Zustand). No localStorage/sessionStorage for job data.
- **File validation** in DropZone: max 50MB per file, accepted types PNG/JPG/JPEG/WEBP/PDF.

---

## 13. Runtime Folder Structure

This is the deployed portable application folder.

Scan2Text/
├── Scan2Text.exe
├── models/
│ ├── vlm.gguf # GLM-OCR 0.9B language model
│ └── mmproj.gguf # Vision projector (multimodal adapter)
├── assets/
│ ├── icons/
│ └── ui/ # Built React frontend assets
├── output/
├── settings/
│ └── settings.json
└── logs/
└── app.log


**Notes:**
- `models/` contains local OCR model files (vlm.gguf + mmproj.gguf).
- `assets/ui/` contains the built React frontend (compiled from Vite).
- `output/` contains saved Markdown files unless user chooses another output directory.
- `settings/` contains user settings.
- `logs/` contains application logs.
- This is the runtime distribution structure, not necessarily the source-code repository structure.

### Source Code Repository Structure

scan2text/
├── backend/
│ ├── app/
│ │ ├── main.py # FastAPI app entry
│ │ ├── routes/ # API endpoints
│ │ ├── services/ # Business logic
│ │ ├── ocr/ # OCR engine adapter
│ │ └── models/ # Pydantic data contracts
│ └── tests/
├── frontend/
│ ├── src/
│ │ ├── components/ # React components
│ │ ├── stores/ # Zustand stores
│ │ ├── lib/ # API layer (pure TypeScript)
│ │ ├── i18n/ # Translation files (en.json, id.json)
│ │ └── hooks/ # Custom React hooks
│ └── tests/
├── models/ # Local model files (gitignored)
│ ├── vlm.gguf
│ └── mmproj.gguf
└── second-brain/ # Agent memory system
├── 00-Current-State.md
├── 01-Agent-Memory/
└── 03-Sprints/


---

## 14. Local Application Contract

Scan2Text uses an internal local contract between UI and backend.
This is not a public cloud API. It is an internal app API.

### File Processing

POST /process

- Accepts: `multipart/form-data` with file bytes.
- Returns: `{ "task_id": "string" }`
- Starts OCR processing in background.

GET /status/{task_id}

- Returns task status and result.
- Status values: `pending`, `uploading`, `processing`, `completed`, `failed`, `background`.
- On completion, includes `result_markdown` field.

### Health / Worker Status

GET /health

- Returns worker status (idle/busy), RAM usage, model loaded state.
- Used by bottom bar status display.

### Settings

GET /api/settings 
PUT /api/settings

### Future Endpoints (Not in MVP critical path)

POST /cancel/{task_id} # Cancel in-progress OCR (Slice 25) 
POST /api/output/open # Open output folder


**Note:** The original PRD defined `/api/jobs` endpoints. These have been replaced by the simpler `POST /process` + `GET /status/{task_id}` contract established in Phase 4. The `/api/jobs` routes are NOT used in MVP.

---

## 15. Core Data Contracts

All core objects must use strict typed models.

### AppSettings

```python
class AppSettings:
    output_dir: str
    max_pdf_pages: int
    cpu_threads: int
    check_updates_on_startup: bool
    language: str          # "auto" | "en" | "id"
    theme: str             # "dark" | "light"
```

### JobStatus

class JobStatus:
    PENDING = "pending"
    UPLOADING = "uploading"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    BACKGROUND = "background"

### OCRJob (Backend)

class OCRJob:
    id: str                  # UUID
    file_name: str
    file_path: str
    status: str
    created_at: datetime
    updated_at: datetime
    output_path: str | None
    error_code: str | None
    error_message: str | None
    
### ScanJob (Frontend Zustand Store)
(typescript)
interface ScanJob {
    id: string;
    fileName: string;
    taskId: string | null;
    status: JobStatus;
    isBackground: boolean;
    createdAt: number;
    resultMarkdown: string | null;
    error: string | null;
    imageUrl: string | null;   // Object URL for image preview (memory-only)
}

### OCRResult

class OCRResult:
    job_id: str
    source_file: str
    output_path: str | None
    full_text: str             # Combined Markdown output
    completed_at: datetime

### ProgressEvent (for future WebSocket support)

class ProgressEvent:
    job_id: str
    status: str
    percent: int | None
    eta_seconds: int | None
    message: str | None

### UpdateInfo

class UpdateInfo:
    current_version: str
    latest_version: str
    download_url: str
    notes: list[str]
    model_version: str | None

## 16. Global Error Envelope

{
  "error": {
    "code": "MODEL_NOT_FOUND",
    "message": "Model file not found. Please reinstall Scan2Text or restore the models folder.",
    "details": {}
  }
}

### MVP Error Codes

|Code|Description|
|---|---|
|MODEL_NOT_FOUND|Model file missing|
|MODEL_LOAD_FAILED|Model failed to load|
|UNSUPPORTED_FILE|File type not supported|
|FILE_TOO_LARGE|File exceeds 50MB limit|
|PDF_TOO_MANY_PAGES|PDF exceeds max page limit|
|OCR_FAILED|OCR processing failed|
|OUTPUT_DIR_NOT_WRITABLE|Cannot write to output directory|
|SETTINGS_INVALID|Settings validation failed|
|UPDATE_CHECK_FAILED|Update check failed|
|UNKNOWN_ERROR|Unclassified error|

Unsupported files in a batch should be treated as non-fatal where possible.

### Frontend Error Mapping (i18n)

- All frontend UI error strings use translation keys.
- Known backend error codes are mapped to translated messages.
- Unknown backend errors are shown as-is (English).

---

## 17. Update Mechanism

### Update Source

Updates are announced through a GitHub-hosted `version.json`.

Example:

{
  "version": "0.2.0",
  "date": "2026-07-01",
  "download_url": "https://github.com/org/Scan2Text/releases/download/v0.2.0/Scan2Text-windows-x64.zip",
  "model_version": "glm-ocr-0.9b-mmproj-v1",
  "notes": [
    "Improved PDF page rendering",
    "Fixed output naming collision"
  ]
}

### Update Flow

1. App launches.
2. If update check is enabled and internet is available, app fetches `version.json`.
3. If latest version is greater than current version, app shows update notification.
4. User manually downloads update zip.
5. User replaces app files while preserving:
    - `settings/`
    - `output/`
    - `logs/`

MVP update process is manual. No self-updating executable is required.

---

## 18. Logging Requirements

Logs are stored in: `logs/app.log`

**Requirements:**

- Use rotating logs.
- Keep logs small.
- Log operational events:
    - app start
    - settings loaded
    - model load started
    - model load completed
    - job started
    - job completed
    - job skipped
    - job failed
    - output saved
    - update check result
- Do not log extracted OCR text by default.
- Do not log full document contents by default.