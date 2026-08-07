scan2text/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app entry
│   │   ├── routes/           # API endpoints
│   │   ├── services/         # Business logic
│   │   ├── ocr/              # OCR engine adapter
│   │   └── models/           # Pydantic data contracts
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── stores/           # Zustand stores
│   │   ├── lib/              # API layer, pure TypeScript
│   │   ├── i18n/             # Translation files: en.json, id.json
│   │   └── hooks/            # Custom React hooks
│   └── tests/
├── models/                   # Local model files, gitignored
│   ├── vlm.gguf
│   └── mmproj.gguf
└── second-brain/             # Agent memory system
    ├── 00-Current-State.md
    ├── 01-Agent-Memory/
    └── 03-Sprints/

## 14. Local Application Contract

Scan2Text uses an internal local contract between UI and backend.

This is not a public cloud API. It is an internal app API.

### File Processing

`POST /process`

- Accepts: `multipart/form-data` with file bytes.
- Returns: `{ "task_id": "string" }`
- Starts OCR processing in background.

`GET /status/{task_id}`

- Returns task status and result.
- Status values:
    - `pending`
    - `uploading`
    - `processing`
    - `completed`
    - `failed`
    - `background`
- On completion, includes `result_markdown` field.

### Health / Worker Status

`GET /health`

- Returns worker status: idle/busy.
- Returns RAM usage.
- Returns model loaded state.
- Used by BottomBar status display.

### Settings

`GET /api/settings`

- Returns current app settings.

`PUT /api/settings`

- Updates app settings.

### Future Endpoints

Not in MVP critical path:

- `POST /cancel/{task_id}` — cancel in-progress OCR, future slice.
- `POST /api/output/open` — open output folder.

### Share Placeholder Note

Added in v1.6.

- The MVP Share button is a frontend placeholder.
- The placeholder target is `https://placeholder.local`.
- No production share endpoint is required in MVP.
- Final share URL will be swapped after GitHub/sharing availability.

### Legacy Contract Note

The original PRD defined `/api/jobs` endpoints.

These have been replaced by the simpler contract:

- `POST /process`
- `GET /status/{task_id}`

The `/api/jobs` routes are not used in MVP.

---

## 15. Core Data Contracts

All core objects must use strict typed models.

### AppSettings
python
class AppSettings:
    output_dir: str
    max_pdf_pages: int
    cpu_threads: int
    check_updates_on_startup: bool
    language: str          # "auto" | "en" | "id"
    theme: str             # "dark" | "light"

### JobStatus
python
class JobStatus:
    PENDING = "pending"
    UPLOADING = "uploading"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    BACKGROUND = "background"

### OCRJob — Backend
python
class OCRJob:
    id: str                  # UUID
    file_name: str
    file_path: str
    file_size: int | None    # Added v1.6 for queue row metadata
    status: str
    created_at: datetime
    updated_at: datetime
    output_path: str | None
    error_code: str | None
    error_message: str | None

### ScanJob — Frontend Zustand Store
typescript
interface ScanJob {
  id: string;
  fileName: string;
  fileSize: number | null;   // Added v1.6 for queue row metadata
  taskId: string | null;
  status: JobStatus;
  isBackground: boolean;
  createdAt: number;
  resultMarkdown: string | null;
  error: string | null;
}

Notes:

- `imageUrl` was removed on 2026-08-07.
- Thumbnail feature and side-by-side comparison moved to Phase 2 compare-toggle candidate.
- Queue rows show a file type icon instead of an image thumbnail.
- `fileSize` was added in v1.6 to restore the full FR-04 queue row.

### OCRResult
python
class OCRResult:
    job_id: str
    source_file: str
    output_path: str | None
    full_text: str             # Combined Markdown output
    completed_at: datetime

### ProgressEvent

For future WebSocket support.
python
class ProgressEvent:
    job_id: str
    status: str
    percent: int | None
    eta_seconds: int | None
    message: str | None

### UpdateInfo
python
class UpdateInfo:
    current_version: str
    latest_version: str
    download_url: str
    notes: list[str]
    model_version: str | None

## 16. Global Error Envelope

Example error envelope:
{
  "error": {
    "code": "MODEL_NOT_FOUND",
    "message": "Model file not found. Please reinstall Scan2Text or restore the models folder.",
    "details": {}
  }
}

Error handling principles:

- Unsupported files in a batch should be treated as non-fatal where possible.
- One bad file should not stop the entire batch unless the error is fatal.
- Error codes must be stable and machine-readable.
- User-facing messages must be translated where known.
- Raw stack traces must not be shown to users.

### Frontend Error Mapping and i18n

- All frontend UI error strings use translation keys.
- Known backend error codes are mapped to translated messages.
- Unknown backend errors are shown as-is in English.
- Queue status tooltips must be translated.
- TopBar icon-only button tooltips must be translated.
- Share button tooltip, if present, must be translated.

---

## 17. Update Mechanism

### Update Source

Updates are announced through a GitHub-hosted `version.json`.

Example:

json
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

MVP update process is manual.

No self-updating executable is required.

---

## 18. Logging Requirements

Logs are stored in: logs/app.log

Requirements:

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
- File validation rejections may log file name, rejection reason, and byte count where privacy-safe.
- Queue status changes may be logged without document content.
