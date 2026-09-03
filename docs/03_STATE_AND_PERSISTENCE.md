# State Management & Persistence Layer

> **Generated:** 2026-09-03

---

## 1. Frontend State (Zustand Stores)

### 1.1 Main Store: `scan2text.store.ts`

**Location:** `frontend/src/stores/scan2text.store.ts`

**State Interface:**
```typescript
interface Scan2TextState {
  // Data
  jobs: Record<string, ScanJob>;
  activeJobId: string | null;
  selectedJobId: string | null;
  jobOrder: string[];           // FIFO queue
  showDownloader: boolean;
  enhance: boolean;             // S62: image enhancement toggle

  // Actions
  setEnhance: (value: boolean) => void;
  registerJob: (id: string) => void;
  addJob: (input: { id, fileName, fileSize?, fileType?, createdAt? }) => void;
  updateJob: (id: string, patch: Partial<ScanJob>) => void;
  setTaskId: (id: string, taskId: string) => void;
  setStatus: (id: string, status: JobStatus) => void;
  markBackground: (id: string) => void;
  setActiveJob: (id: string | null) => void;
  setSelectedJobId: (id: string | null) => void;
  removeJob: (id: string) => void;
  retryJob: (id: string) => Promise<string>;
  reset: () => void;
  setShowDownloader: (value: boolean) => void;
  startUpload: (input: { file, jobId?, createdAt? }) => Promise<string>;
  pollJob: (input: { jobId: string }) => Promise<void>;
  startPolling: (input: { jobId: string }) => void;
  startNextPendingJob: () => void;
  promoteNextPending: () => void;
}
```

**Job Status Types:**
```typescript
type JobStatus = 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
```

**ScanJob Interface:**
```typescript
interface ScanJob {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  taskId: string | null;
  status: JobStatus;
  isBackground: boolean;
  createdAt: number;
  resultMarkdown: string | null;
  markdownOutput: string;
  error: string | null;
  errorCode: string | null;
  file: File | null;
  progress: number;
  consecutiveHealthFailures: number;
}
```

**Key Behaviors:**
- Jobs are **memory-only** — never persisted to localStorage
- FIFO processing via `jobOrder[]`
- One active job at a time
- Automatic promotion of next pending job on completion/failure
- Health guard: 3 consecutive failures → job marked failed

---

### 1.2 Preferences Store: `preferencesStore.ts`

**Location:** `frontend/src/stores/preferencesStore.ts`

**State Interface:**
```typescript
interface PreferencesState {
  theme: Theme;              // 'dark' | 'light'
  language: Language;        // 'en' | 'id'
  hydratePreferences: (storage?: Storage, browserLanguage?: string) => void;
  setTheme: (theme: Theme, storage?: Storage) => void;
  toggleTheme: (storage?: Storage) => void;
  setLanguage: (language: Language, storage?: Storage) => Promise<void>;
  toggleLanguage: (storage?: Storage) => Promise<void>;
  applySettingsFromResponse: (response: { theme?, language? }) => Promise<void>;
}
```

**Persistence:**
- Theme and language synced to `localStorage`
- Debounced save to backend settings (800ms)
- Applied to `<html>` class for dark mode

---

## 2. Backend State

### 2.1 In-Memory Task Store

**Location:** `src/scan2text/api/main.py:29`

```python
_task_store: Dict[str, Dict[str, Any]] = {}
```

**Structure:**
```python
{
  "task_id": {
    "status": "queued" | "processing" | "completed" | "failed",
    "processed": int,
    "total": int,
    "result_markdown": str | None,
    "error_code": str | None,
  }
}
```

**Lifetime:** Process lifetime only — lost on restart.

---

### 2.2 WebSocket Connection Manager

**Location:** `src/scan2text/api/websocket_manager.py`

```python
class ConnectionManager:
    _connections: Set[Any]
```

**Methods:**
- `connect(websocket)` — Register connection
- `disconnect(websocket)` — Remove connection
- `broadcast(message)` — Send to all connected clients

---

## 3. Persistence Layer

### 3.1 settings/settings.json

**Schema (Pydantic Model):** `src/scan2text/models/settings.py`

```python
class AppSettings(BaseModel):
    # Core
    output_dir: str = ""
    max_pdf_pages: int = Field(default=50, ge=1)
    cpu_threads: int = Field(default=0, ge=0)
    check_updates_on_startup: bool = True
    language: str = "auto"
    theme: str = "dark"
    hide_welcome_notice: bool = False
    enhance_image_quality: bool = False

    # Engine (advanced, no UI in MVP)
    model_path: str = ""
    mmproj_path: str = ""
    n_ctx: int = Field(default=8192, ge=256)
    n_threads: int = Field(default=0, ge=0)
    ocr_timeout_seconds: int = Field(default=600, ge=10)
    worker_priority: str = "below_normal"
```

**Write Strategy:** Atomic write via temp file + `os.replace` (`settings_service.py:71-92`)

---

### 3.2 Browser Storage (localStorage)

**Keys:**
| Key | Type | Value | Source |
|-----|------|-------|--------|
| `scan2text:theme` | string | `"dark"` \| `"light"` | `preferences.ts:1` |
| `scan2text:language` | string | `"en"` \| `"id"` | `preferences.ts:2` |

**Verification:** No sensitive data persisted. Jobs are never saved.

---

### 3.3 File System Persistence

| Path | Purpose | Rotation |
|------|---------|----------|
| `settings/settings.json` | User configuration | None |
| `logs/app.log` | Application logs | 1 MB max, 1 backup |
| `output/*.md` | OCR output files | None |
| `uploads/*.png, *.pdf` | Temporary uploaded files | Per-request |
| `feedback/pending/*.json` | Offline feedback queue | Manual move to `sent/` |
| `feedback/sent/*.json` | Sent feedback archive | None |
| `models/*.gguf` | AI model files | Persistent |
| `failed/*` | Quarantined failed files | 7-day cleanup |

---

## 4. Path Resolution

**Service:** `src/scan2text/services/path_service.py`

**Home Resolution Priority:**
1. `SCAN2TEXT_HOME` environment variable
2. Frozen PyInstaller: `parent of backend executable folder`
3. Dev fallback: repo root (`Path(__file__).resolve().parents[3]`)

**Derived Paths:**
| Property | Path |
|----------|------|
| `settings_path` | `{home}/settings/settings.json` |
| `logs_path` | `{home}/logs` |
| `output_path` | `{home}/output` |
| `models_path` | `{home}/models` |
| `feedback_path` | `{home}/feedback` |
| `log_file` | `{home}/logs/app.log` |

---

## 5. Output Naming Convention

**Utility:** `frontend/src/lib/naming.ts`

**Pattern:** `{stem}_{HHmm}_{yyyyMMdd}.md`

**Collision Handling:** Append `_2`, `_3`, etc.

**Example:** `document_1430_20260903.md` → `document_1430_20260903_2.md`

**Windows Reserved Names:** `CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9` get `_scan` suffix.
