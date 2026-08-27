# 02 — IPC & API Contracts

> Master reference: [`ARCHITECTURE.md`](./ARCHITECTURE.md) · Siblings: [01_FILE_MATRIX](./01_FILE_MATRIX.md) · [03_DATA_FLOWS](./03_DATA_FLOWS.md) · [04_ENVIRONMENT_AND_BUILD](./04_ENVIRONMENT_AND_BUILD.md)

---

## 1. Process Topology, Ports & CORS

```
Scan2Text.exe (Tauri v2 / WebView2, crate app_lib)
   └─ spawns → backend/scan2text-backend.exe (PyInstaller-frozen FastAPI)
                 binds 127.0.0.1:47351        ← prod_runtime.get_port() when sys.frozen
   dev mode: vite dev server :5173  +  uvicorn 127.0.0.1:8000
```

| Property | Value | Source of truth |
|---|---|---|
| Prod port | `47351` (`BACKEND_PORT` const in `backend_process.rs`; `prod_runtime.get_port()` returns `47351` when frozen else `8000`) | `frontend/src-tauri/src/backend_process.rs:13`, `src/scan2text/utils/prod_runtime.py:30-34` |
| Host binding | `127.0.0.1` always (`get_host()`) | `prod_runtime.py:37-40` |
| CORS | `allow_origins=["*"]`, `allow_methods=["*"]`, `allow_headers=["*"]` (localhost-only bind makes this safe) | `api/main.py:54-59` |
| Base URL client-side | `import.meta.env.PROD ? 'http://127.0.0.1:47351' : ''` (dev ⇒ relative to Vite proxy/origin) | `frontend/src/lib/apiBase.ts:1-3` |
| App title/version | `"Scan2Text OCR API"` / `0.1.0` | `api/main.py:47-52`, `routes/health.py:16` |

**Routers mounted in `main.py`:** `health_routes`, `settings_routes`, `feedback_routes`, `download_routes`.
⚠️ `routes/jobs.py` defines an *older, unmounted* `/api/jobs` surface — it is dead code on the live app; the live job endpoints are declared directly in `api/main.py` (`/process`, `/status/{task_id}`, `/ws/progress`).

### Lifespan (`api/main.py:33-44`)
- Creates one `VlmOcrAdapter`, wraps it in `QueueService(ocr_engine=adapter)`; stores on `app.state.queue_service`, `app.state.ws_manager`, `app.state.worker_busy=False`.
- In-memory task store `_task_store: Dict[str, Dict[str, Any]]` keyed by UUID `task_id`; never persisted.

---

## 2. HTTP Endpoint Contract (live surface)

### 2.1 `POST /process` → `202`
- Handler: `process_files(files: List[UploadFile] = Form(default=[]))` — multipart/form-data, field name **`files`** (repeatable).
- Each file saved to `<repo-or-portable-root>/uploads/<uuid4hex><ext>` via `_save_uploaded_file()`; original stem sanitized with `PathService.sanitize_filename` for output naming.
- Spawns `asyncio.create_task(_run_processing(...))`; single-flight guard via `app.state.worker_busy`.
- Response: `{ "task_id": "<uuid>" }` · Errors: `400 "No files provided"` when list empty.

### 2.2 `GET /status/{task_id}`
- Handler: `get_status(task_id)` · Error: `404 "Task not found"`.
- Response fields:

```jsonc
{
  "task_id": "...",
  "status": "queued | processing | completed | failed",
  "processed": 0,
  "total": 3,
  // optional:
  "error_code": "OCR_FAILED | PARTIAL_FAILURE | UNKNOWN_ERROR",  // only when set
  "result_markdown": "# ..."   // only when status==completed and result exists
}
```

- Status semantics from `_run_processing` (`main.py:98-160`): all failed ⇒ `failed`+`OCR_FAILED`; mixed ⇒ `completed`+`PARTIAL_FAILURE`; success joins per-file markdown with `\n---\n`. Any uncaught exception ⇒ `failed`+`UNKNOWN_ERROR`.

### 2.3 `GET /api/health`
- Handler: `health(request)` (`routes/health.py:49-75`). Used by Rust readiness probe and the frontend endurance poller.

```jsonc
{
  "status": "ok",
  "worker": "idle | busy",          // from app.state.worker_busy
  "ram":   { "total_mb": int, "used_mb": int, "percent": float },   // psutil.virtual_memory()
  "cpu":   { "percent": float },
  "model": {
    "name": "OvisOCR2 0.9B",       // MODEL_NAME const
    "loaded": bool,                // VlmOcrAdapter.loaded, fallback = both gguf files present
    "files_present": bool          // settings.model_path||models/vlm.gguf AND mmproj resolved via PathService
  },
  "version": "0.1.0"
}
```

### 2.4 Settings — `GET /api/settings`, `PUT /api/settings`
Pydantic model `AppSettings` (`models/settings.py`) — full request/response schema:

| Field | Type | Default | Notes |
|---|---|---|---|
| `output_dir` | str | `""` | GET fills effective default from `PathService.output_dir` |
| `max_pdf_pages` | int (ge=1) | `50` | |
| `cpu_threads` | int (ge=0) | `0` | 0 = auto (`utils/cpu_budget.calculate_auto_threads` ⇒ 60% logical cores) |
| `check_updates_on_startup` | bool | `true` | |
| `language` | str | `"auto"` | |
| `theme` | str | `"dark"` | |
| `hide_welcome_notice` | bool | `false` | |
| `model_path` | str | `""` | engine knobs (JSON-only, ADR-005) |
| `mmproj_path` | str | `""` | |
| `n_ctx` | int (ge=256) | `8192` | |
| `n_threads` | int (ge=0) | `0` | |
| `ocr_timeout_seconds` | int (ge=10) | `600` | |
| `worker_priority` | str | `"below_normal"` | |

- PUT body = full/partial `AppSettings`; persisted by `SettingsService.save()` to `settings.json`. Errors: `422` with `ErrorEnvelope{error:{code:"SETTINGS_INVALID",...}}`; GET failure ⇒ `500 "SETTINGS_INVALID"`.

### 2.5 Model download — `routes/download.py`
Module singleton `_download_svc = ModelDownloaderService(app_root=PathService().app_root)`.

| Verb & path | Purpose | Notes |
|---|---|---|
| `POST /api/download/start` | background download kick-off | returns current progress dict; 500 on exception |
| `GET /api/download/status` | read progress | `Cache-Control: no-store` headers set |
| `GET /api/download/progress` | same as status | alias endpoint |
| `POST /api/download/cancel` | cancel in-flight download | returns progress |

Progress payload (`ModelDownloaderService.get_progress()`): includes overall `status`, per-model `bytes_downloaded` / `total_bytes`, `error_message`; downloads defined by root `version.json` (URLs + `sha256` + size for `vlm.zip` & `mmproj.zip`), extracted into `models/` after hash verification.

### 2.6 Feedback (offline queue, ADR-007 no-silent-send)
Handlers in `routes/feedback.py`; storage via `FeedbackService` at `feedback/pending/` → `feedback/sent/`.

| Verb & path | Body | Response |
|---|---|---|
| `POST /api/feedback` | `FeedbackPayload { message: str, contact?: str }` | `{ "filename": "<written .txt name>" }` |
| `GET /api/feedback/pending-count` | — | `{ "count": int }` |
| `POST /api/feedback/mark-sent` | `MarkSentPayload { filename: str }` | `{ "moved": bool }` (moves pending→sent) |

### 2.7 Legacy/unmounted (`routes/jobs.py` — NOT registered in main.py)
`POST /api/jobs` (201, `create_job(payload:{file_name,file_path})→OCRJob`), `GET /api/jobs`, `GET /api/jobs/{job_id}`, `POST /api/jobs/process`, `POST /api/jobs/{job_id}/open-output`, `POST /api/output/open`. Documented for completeness; do not call.

---

## 3. WebSocket Protocol

Endpoint: **`ws://127.0.0.1:<port>/ws/progress`** (`api/main.py:218-233`), managed by `ConnectionManager` (`api/websocket_manager.py` — tracks a `Set` of sockets; `connect/disconnect/broadcast(dict)`).

- Server → client JSON frames pushed by `_ws_manager.broadcast(...)`:

```jsonc
{ "task_id": "<uuid>", "status": "processing|completed|failed", "processed": 0, "total": 3 }
```

- Client → server: text `"ping"` ⇒ server replies text `"pong"` (keep-alive).
- Disconnect handled gracefully (`WebSocketDisconnect`); manager removes socket in `finally`.

## 4. Tauri IPC Bridge (Rust ⇄ WebView)

### Commands (invoke handler, `lib.rs:393`)
| Command | Signature | Behavior |
|---|---|---|
| `open_output_folder` | `(path: String) -> Result<(), String>` | validates non-empty (`validate_output_path`), `create_dir_all`, spawns `explorer.exe <path>`; non-Windows ⇒ Err "only supported on Windows". Called from `PreviewPanel.tsx` via `invoke('@tauri-apps/api/core')`. |

### Events
| Event | Direction | Payload | Emitter |
|---|---|---|---|
| `backend-boot-failed` | Rust → JS (`listen` in `useBackendBootFailedListener.ts`) | `string` ("Backend exited within 5s of spawn — check logs/") | `BackendManager.watch_for_early_exit` watcher thread if port closes ≤ `BOOT_FAIL_WINDOW`=5 s after spawn (`backend_process.rs:74-97`) |

### Backend process management internals (`backend_process.rs`)
- `BackendManager { child: Option<Child>, port: u16(47351), app_handle }` — idempotent `start(timeout)`: reuses live child, restarts dead one; dev builds (`debug_assertions`) skip spawn entirely (`dev.ps1` owns backend on :8000).
- `resolve_backend_path()`: `<CARGO_MANIFEST_DIR>/../../../backend/scan2text-backend.exe`, else walk up ≤10 parents from `current_exe()` looking for `backend/scan2text-backend.exe`; panic if absent.
- Readiness: raw-TCP HTTP probe `wait_for_health("127.0.0.1", port, timeout)` performing `GET /api/health HTTP/1.1` and checking body contains `"200"`; default budgets 30 s start + 30 s health (`boot_backend`).
- Spawn flags: `spawn_creation_flags()` (Windows `CREATE_NO_WINDOW`); stdout/stderr piped to log file via `derive_log_path(exe_dir)` + `ensure_log_dir` + `spawn_config`.
- Shutdown: `stop_backend(pid, child)` shells out `taskkill /IM scan2text-backend.exe /T` (image-name kill, not PID — PyInstaller daemon would survive `/PID`); `wait_for_port_closed(..., 30 s)` verifies teardown. `lib.rs run()` hooks `CloseRequested`/`ExitRequested`/`Exit` to `BackendManager::stop()`.

### Capabilities / window config
- `capabilities/default.json` grants core default + shell-open permissions used by `FeedbackButton.tsx` (`@tauri-apps/plugin-shell open`).
- `tauri.conf.json`: identifier `com.wingai.scan2text`, window 1200×800 resizable, `dragDropEnabled:false` (drop handled by HTML5 DnD in `FileDropZone`), `withGlobalTauri:true`, `frontendDist ../dist`, devUrl `http://localhost:5173`, bundle resources `["../../backend"]`.

## 5. Frontend Client Function Matrix

From `lib/api.ts`, `lib/apiBase.ts`, `services/uploadService.ts`, `stores/*.ts`:

| Client function | HTTP target | Method | Contract consumed |
|---|---|---|---|
| `uploadFile(file: File)` | `/process` | POST multipart (`files`) | `UploadResponse { task_id }` |
| `uploadFiles(files: File[])` (`uploadService.ts`) | `/process` | POST multipart batch | same |
| `getTaskStatus(taskId)` | `/status/:id` (`encodeURIComponent`) | GET | `TaskStatusResponse` |
| `isTaskCompleted(r)` / `isTaskFailed(r)` | — | type guards | narrows to `CompletedTaskStatusResponse` / `FailedTaskStatusResponse` |
| `pollTaskStatus(taskId, options, deps)` | loops `getStatus` | — | throws `"Polling timeout"` after `options.maxAttempts` |
| `getHealth()` | `/api/health` | GET | `{ status: string }` |
| `getSettings()` | `/api/settings` | GET | `SettingsResponse { output_dir, max_pdf_pages, cpu_threads, [k:string]:unknown }` |
| `saveSettings(patch)` | `/api/settings` | PUT JSON | `SettingsPatch { output_dir?, max_pdf_pages?, cpu_threads?, theme?, language? }` |
| `buildApiUrl(path)` / `getApiBaseUrl()` | — | — | URL assembly (`PROD ? http://127.0.0.1:47351 : ""`) |
| `invoke('open_output_folder', …)` | Tauri IPC | — | void / string error |

Polling constants actually in source (`stores/scan2text.store.ts:15`): `DEFAULT_POLL_OPTIONS = { maxAttempts: 30, intervalMs: 1000 }` (⇒ ~30 s foreground window), then an unbounded background endurance loop repeating every **60 s**: `getHealth()` before each status probe, failing a job only after **3 consecutive** health failures (`consecutiveHealthFailures`), plus a long-doc hint toast every 2 min. Error-code-specific UX: `PDF_TOO_COMPLEX`, `FILE_TOO_COMPLEX`, `MODEL_NOT_FOUND` (opens downloader modal via `setShowDownloader(true)`).

Zustand state relevant to IPC — `scan2text.store.ts`: `jobs: Record<string, ScanJob>` (fields incl. `taskId`, `consecutiveHealthFailures`, `resultMarkdown`), FIFO `jobOrder: string[]`, single-active enforced by `activeJobId` + `startNextPendingJob/promoteNextPending`, memory-only (never persisted). Preferences (`preferencesStore.ts` → localStorage keys `scan2text:theme`, `scan2text:language` via `lib/preferences.ts`) sync through `saveSettings`.

## 6. Error Model

Canonical enum `ErrorCode` (`models/errors.py`): `MODEL_NOT_FOUND`, `MODEL_LOAD_FAILED`, `UNSUPPORTED_FILE`, `FILE_TOO_LARGE`, `FILE_TOO_COMPLEX`, `PDF_TOO_COMPLEX`, `OCR_FAILED`, `OUTPUT_DIR_NOT_WRITABLE`, `SETTINGS_INVALID`, `PARTIAL_FAILURE`, `UPDATE_CHECK_FAILED`, `UNKNOWN_ERROR`.

Envelope shapes:
- Router-level errors wrap as `ErrorEnvelope{ error: ErrorDetail{ code, message, details{} } }` (settings 422).
- Plain `HTTPException(detail=str)` elsewhere (400/404/500).
- Task-store errors surface flattened on `/status/{id}` as `error_code` (+ `error` string client-side).
