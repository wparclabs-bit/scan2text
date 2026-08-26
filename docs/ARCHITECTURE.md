# Architecture

Scan2Text is a **local-first modular monolith**: one desktop process pair, no cloud services, no
external database, no microservices. All recognition happens locally; the only outbound network
traffic is the optional update check, the model downloader, and the user-initiated feedback form.

## Components

| Component | Technology | Role |
|---|---|---|
| Desktop shell | Tauri v2 (Rust), source `frontend/src-tauri/` | Bundles the built React frontend; owns the backend lifecycle (spawn and kill) |
| Frontend | React + Zustand, built with Vite | Command Center UI: dropzone, queue, preview; memory-only job state |
| Backend | FastAPI packaged with PyInstaller (`backend/scan2text-backend.exe`) | Validation, FIFO queue, OCR worker, output writing, settings, updates |

The shell spawns the PyInstaller backend as a child process bound to **127.0.0.1:47351**.

## Backend lifecycle

The shell owns spawn **and** kill:

- **Spawn:** on launch the shell starts `backend/scan2text-backend.exe` as a hidden child process
  and waits for port 47351 (wait capped at 5 s).
- **Kill:** on exit the shell kills the whole backend process tree
  (`taskkill /F /IM scan2text-backend.exe /T`). Closing the app leaves zero leftover processes.
- **Boot-time self-heal:** before spawning, the shell kills any stale process still holding
  port 47351 (for example after a crash).
- A single running instance per machine is assumed.

## Communication: HTTP polling

Frontend and backend communicate over local HTTP. WebSockets were evaluated and deliberately
deferred (see ADR `002-websockets-over-polling`); polling is sufficient for one active job.

- `POST /process` returns `{task_id}` immediately.
- The frontend polls `GET /status/{task_id}` 15 times at 2000 ms intervals (30 s active window).
- If the job is still running, it moves to a background re-poll schedule: 60 s intervals, 10 attempts.
  Background jobs are surfaced with the `background` status.

## Endpoints

| Endpoint | Purpose |
|---|---|
| `POST /process` | Multipart upload; returns `{task_id}` |
| `GET /status/{task_id}` | Six statuses (`pending`, `uploading`, `processing`, `completed`, `failed`, `background`) plus `result_markdown` on completion |
| `GET /api/health` | Worker idle/busy, RAM %, CPU %, model loaded. Canonical health endpoint; there is deliberately no bare `/health` |
| `GET /api/settings`, `PUT /api/settings` | Read/patch `AppSettings` (includes theme and language) |
| `GET /api/feedback/pending-count` | Drives the launch-time feedback reminder |

Planned, not yet implemented: `POST /cancel/{task_id}`, `POST /api/output/open`.
Legacy: `/api/jobs` exists but is unused. CORS allows all origins — safe because the server is
loopback-only (ADR-008 addendum).

## Global error envelope

Every backend error uses one envelope:

```json
{ "error": { "code": "MODEL_NOT_FOUND", "message": "...", "details": {} } }
```

Full code list: `MODEL_NOT_FOUND` · `MODEL_LOAD_FAILED` · `UNSUPPORTED_TYPE` · `FILE_TOO_LARGE` ·
`PDF_TOO_MANY_PAGES` · `FILE_TOO_COMPLEX` · `OCR_FAILED` · `OUTPUT_NOT_WRITABLE` ·
`INVALID_SETTINGS` · `DOWNLOAD_FAILED` · `SIZE_MISMATCH` · `PARTIAL_FAILURE`
(log-only; never a user-facing status).

Rules: no raw stack traces reach the UI; messages are i18n-mapped; unknown codes are shown as-is
in English.

## Data flow

1. **Drop** — user drops up to 10 files; frontend validates type and 50 MB size cap. Invalid files
   are rejected with one aggregated toast; extras beyond the cap are skipped with a warning and
   logged. Invalid files never enter the queue.
2. **Upload** — valid files are posted to `POST /process`; each returns a `task_id`.
3. **Queue** — jobs are held FIFO in a memory-only Zustand store (`jobOrder[]`, one active job;
   jobs never persist across restarts). The backend maintains its own queue with quarantine
   semantics: one bad file never stops the batch.
4. **Inspect** — the backend re-checks PDF size (50 MB) and page count (50) before rendering.
5. **OCR worker** — `VlmOcrAdapter` renders PDF pages and runs the OvisOCR2 GGUF model through
   llama-cpp-python, CPU-only. The model loads on demand. `cpu_threads = 0` selects automatic
   thread count. Jobs longer than 2 minutes trigger a repeating hint toast in the UI.
6. **Postprocess** — model output is normalized and converted to GitHub-Flavored Markdown
   (HTML tables become GFM tables; noise lines are filtered).
7. **Output** — `OutputService` writes one `.md` per valid input using
   `{stem}_{HHmm}_{yyyyMMdd}.md` naming with `_2`/`_3` collision suffixes; never overwrites.

Partial success: a batch or PDF with at least one successful unit completes (green); `failed` is
shown only when zero units succeed.

## Path resolution (portable root)

All runtime paths derive from the portable root — the folder containing `Scan2Text.exe` — and are
centralized in `PathService` (the highest-connectivity module in the codebase). The root contains
`backend/`, `models/`, `output/`, `logs/`, `feedback/`, and `settings/settings.json` side by side;
`dist/` is never a runtime path. Model lookup applies a directory priority order:

1. `SCAN2TEXT_MODELS_DIR` environment variable (if set)
2. Frozen grandparent (`exe_dir.parent.parent`) when `models/` exists there
3. Executable-adjacent `models/` directory
4. Development current working directory (source: `tests/unit/services/test_models_dir_priority.py`)

Portable-root resolution is covered by dedicated integration tests
(`TestI2PortableRootResolution` in `tests/test_s38_backend_fixes.py`,
`test_models_dir_priority.py`, `test_path_service_models_resolution.py`).

Details: [RUNTIME-LAYOUT.md](RUNTIME-LAYOUT.md).

## Update mechanism

- A `version.json` manifest on GitHub carries `current`, `latest`, `download_url`, `notes`, and
  `model_version`.
- Application ZIPs and model GGUF files are hosted on GitHub Releases; updates are manual downloads —
  there is no self-updater.
- The check runs at launch only, only if `check_updates_on_startup` is enabled; it is non-blocking
  and fails silently offline. Release cadence is monthly.
- Model downloads are streamed to a `.part` file and atomically renamed only after the SHA256 hash
  (and size) from `version.json` verifies.
