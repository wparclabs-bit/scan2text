# IPC and API Contracts

> **Generated:** 2026-09-03  
> **Scope:** All communication layers across Tauri, React, and Python

---

## 1. Tauri IPC Bridge

### 1.1 Command: `open_output_folder`

**Definition:** `frontend/src-tauri/src/lib.rs:216`

**Purpose:** Open the user's output folder in the system file explorer.

**Payload:**
```typescript
interface OpenOutputFolderParams {
  path: string;  // Validated output directory path
}
```

**Return:**
```typescript
type OpenOutputFolderResult = Result<(), String>;
```

**Validation:**
- Rejects empty/whitespace-only paths
- Requires existing directory
- Windows-only implementation

**Caller:** `PreviewPanel.tsx:42` (Open Folder button)

---

### 1.2 Tauri Events

#### Event: `backend-boot-failed`

**Emitted:** `frontend/src-tauri/src/backend_process.rs:87-90`

**Trigger:** Backend process exits within `BOOT_FAIL_WINDOW` (5 seconds) of spawn.

**Payload:**
```rust
struct BootFailurePayload {
  message: String,  // "Backend exited within 5s of spawn — check logs/"
}
```

**Listener:** `frontend/src/hooks/useBackendBootFailedListener.ts:11`

**UI Response:** Shows error toast: "Backend failed to start. Check logs/ for details."

---

## 2. HTTP API Contract

**Base URL:** `http://127.0.0.1:47351` (hardcoded in `apiBase.ts:2`)

### 2.1 Endpoints Summary

| Method | Path | Purpose | Status Codes |
|--------|------|---------|--------------|
| POST | `/process` | Upload files for OCR | 202, 400 |
| GET | `/status/{task_id}` | Poll job status | 200, 404 |
| GET | `/api/health` | System health check | 200 |
| GET | `/api/settings` | Get settings | 200, 500 |
| PUT | `/api/settings` | Update settings | 200, 422 |
| POST | `/api/feedback` | Submit feedback | 200 |
| GET | `/api/feedback/pending-count` | Count pending feedback | 200 |
| POST | `/api/feedback/mark-sent` | Mark feedback as sent | 200 |
| POST | `/api/download/start` | Start model download | 200, 500 |
| GET | `/api/download/status` | Get download progress | 200 |
| GET | `/api/download/progress` | Get download progress (alias) | 200 |
| POST | `/api/download/cancel` | Cancel download | 200 |
| WS | `/ws/progress` | Real-time progress (unused) | 101 |

---

### 2.2 POST /process

**Handler:** `src/scan2text/api/main.py:168-206`

**Request:**
```typescript
interface ProcessRequest {
  files: File[];           // Multipart: PNG, JPG, JPEG, WEBP, PDF
  enhance?: boolean;       // Optional: PIL contrast + color enhancement
}
```

**Response (202 Accepted):**
```typescript
interface ProcessResponse {
  task_id: string;  // UUID v4
}
```

**Error (400):**
```typescript
interface ErrorResponse {
  detail: string;  // "No files provided"
}
```

**Processing Flow:**
1. Save uploaded files to `uploads/` directory with UUID filenames
2. Create task entry in `_task_store`
3. Spawn background coroutine `_run_processing()`
4. Return task_id immediately

---

### 2.3 GET /status/{task_id}

**Handler:** `src/scan2text/api/main.py:209-226`

**Response (200):**
```typescript
interface TaskStatusResponse {
  task_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  processed: number;    // Files completed
  total: number;        // Total files in batch
  error_code?: string;  // Optional: OCR_FAILED, PDF_TOO_COMPLEX, etc.
  result_markdown?: string;  // Only present on completion
}
```

**Error (404):**
```typescript
interface ErrorResponse {
  detail: string;  // "Task not found"
}
```

---

### 2.4 GET /api/health

**Handler:** `src/scan2text/routes/health.py:49-74`

**Response (200):**
```typescript
interface HealthResponse {
  status: 'ok';
  worker: 'idle' | 'busy';
  ram: {
    total_mb: number;
    used_mb: number;
    percent: number;
  };
  cpu: {
    percent: number;
  };
  model: {
    name: string;           // "OvisOCR2 0.9B"
    loaded: boolean;
    files_present: boolean;
  };
  version: string;          // "0.1.0"
}
```

**Polling:** Called every 10 seconds by `BottomStatusBar.tsx:27-44`

---

### 2.5 GET /api/settings

**Handler:** `src/scan2text/routes/settings.py:18-29`

**Response (200):**
```typescript
interface SettingsResponse {
  output_dir: string;
  max_pdf_pages: number;        // Default: 50
  cpu_threads: number;          // Default: 0 (auto)
  check_updates_on_startup: boolean;
  language: string;             // "auto", "en", "id"
  theme: string;                // "dark" | "light"
  hide_welcome_notice: boolean;
  enhance_image_quality: boolean;
  model_path: string;           // Empty = default
  mmproj_path: string;          // Empty = default
  n_ctx: number;                // Default: 8192
  n_threads: number;            // Default: 0
  ocr_timeout_seconds: number;  // Default: 600
  worker_priority: string;      // "below_normal"
}
```

---

### 2.6 PUT /api/settings

**Handler:** `src/scan2text/routes/settings.py:32-41`

**Request:**
```typescript
interface SettingsPatch {
  output_dir?: string;
  max_pdf_pages?: number;
  cpu_threads?: number;
  theme?: string;
  language?: string;
  enhance_image_quality?: boolean;
}
```

**Response (200):** Returns updated `AppSettings`

**Validation Error (422):**
```typescript
interface ValidationError {
  error: {
    code: "SETTINGS_INVALID";
    message: string;
    details: Record<string, any>;
  };
}
```

---

### 2.7 Feedback Endpoints

#### POST /api/feedback

**Handler:** `src/scan2text/routes/feedback.py:24-29`

**Request:**
```typescript
interface FeedbackPayload {
  message: string;
  contact?: string;  // Optional email
}
```

**Response (200):**
```typescript
interface FeedbackResponse {
  filename: string;  // Timestamp JSON filename
}
```

#### GET /api/feedback/pending-count

**Handler:** `src/scan2text/routes/feedback.py:32-36`

**Response (200):**
```typescript
interface PendingCountResponse {
  count: number;
}
```

#### POST /api/feedback/mark-sent

**Handler:** `src/scan2text/routes/feedback.py:39-44`

**Request:**
```typescript
interface MarkSentPayload {
  filename: string;
}
```

**Response (200):**
```typescript
interface MarkSentResponse {
  moved: boolean;
}
```

---

### 2.8 Download Endpoints

#### POST /api/download/start

**Handler:** `src/scan2text/routes/download.py:18-25`

**Response (200):**
```typescript
interface DownloadProgressResponse {
  status: 'idle' | 'downloading' | 'complete' | 'failed' | 'cancelled';
  bytes_downloaded: number;
  total_bytes: number;
  error_message?: string;
}
```

#### GET /api/download/status & GET /api/download/progress

**Handler:** `src/scan2text/routes/download.py:28-43`

**Response:** Same as above. Includes cache-control headers to prevent caching.

#### POST /api/download/cancel

**Handler:** `src/scan2text/routes/download.py:46-50`

**Response:** Same as above with status = 'cancelled'

---

### 2.9 WebSocket /ws/progress

**Handler:** `src/scan2text/api/main.py:231-245`

**Purpose:** Real-time progress broadcasting (currently unused by frontend).

**Message Format:**
```typescript
interface ProgressMessage {
  task_id: string;
  status: 'processing' | 'completed' | 'failed';
  processed: number;
  total: number;
}
```

---

## 3. CORS Configuration

**Location:** `src/scan2text/api/main.py:54-59`

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Security Note:** CORS allows all origins, but this is safe because the server binds only to `127.0.0.1` (localhost).

---

## 4. Error Code Enum

**Location:** `src/scan2text/models/errors.py:9-21`

```python
class ErrorCode(str, Enum):
    MODEL_NOT_FOUND = "MODEL_NOT_FOUND"
    MODEL_LOAD_FAILED = "MODEL_LOAD_FAILED"
    UNSUPPORTED_FILE = "UNSUPPORTED_FILE"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    FILE_TOO_COMPLEX = "FILE_TOO_COMPLEX"
    PDF_TOO_COMPLEX = "PDF_TOO_COMPLEX"
    OCR_FAILED = "OCR_FAILED"
    OUTPUT_DIR_NOT_WRITABLE = "OUTPUT_DIR_NOT_WRITABLE"
    SETTINGS_INVALID = "SETTINGS_INVALID"
    PARTIAL_FAILURE = "PARTIAL_FAILURE"
    UPDATE_CHECK_FAILED = "UPDATE_CHECK_FAILED"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
```

---

## 5. Port Contract

**Hardcoded Value:** `47351`

**Locations (must change together):**
1. `frontend/src-tauri/src/backend_process.rs:13` — `BACKEND_PORT` constant
2. `frontend/src/lib/apiBase.ts:2` — `getApiBaseUrl()` return value
3. `src/scan2text/utils/prod_runtime.py:31-32` — `get_port()` return value

**Dev Mode:** Unified to 47351 (CEO decision 2026-09-02)

**Verification:** `dev.ps1` checks port occupancy before starting backend.
