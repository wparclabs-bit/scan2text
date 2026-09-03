# Scan2Text v1.1 — Master Architecture Reference

> **Last Updated:** 2026-09-03  
> **Version:** 1.1.0  
> **Classification:** Principal Systems Audit

---

## Executive Summary

Scan2Text is a portable, offline desktop application that converts images (PNG, JPG, JPEG, WEBP) and PDFs into Markdown using a local vision-language model (OvisOCR2 0.9B) running entirely on CPU. The application follows a three-layer architecture:

1. **Tauri Shell (Rust)** — Desktop window management, backend lifecycle, IPC bridge
2. **React/TypeScript Frontend** — Command Center UI, state management, API client
3. **Python/FastAPI Backend** — OCR pipeline, model inference, file processing

### Key Design Principles
- **Local-first**: All processing happens on the user's machine
- **Offline-capable**: Works without internet after initial model download
- **CPU-only**: No GPU required; uses llama-cpp-python with GGUF models
- **Privacy-focused**: No telemetry, no cloud services, no data collection
- **Portable**: Single-folder deployment, no installer required

---

## Repository Topology

```
Scan2Text/
├── dev.ps1                          # Unified dev startup script
├── frontend/                        # Tauri + React frontend
│   ├── src-tauri/                  # Rust/Tauri shell
│   │   ├── src/
│   │   │   ├── main.rs             # Entry point (5 lines)
│   │   │   ├── lib.rs              # App setup, IPC commands, cleanup
│   │   │   └── backend_process.rs  # Backend lifecycle management
│   │   ├── tauri.conf.json         # Tauri app configuration
│   │   └── capabilities/          # Capability definitions
│   └── src/                        # React/TypeScript frontend
│       ├── main.tsx                # React entry point
│       ├── App.tsx                 # Root component
│       ├── components/
│       │   └── layout/
│       │       ├── CommandCenterLayout.tsx
│       │       ├── TopBar.tsx
│       │       ├── BottomStatusBar.tsx
│       │       ├── SettingsDialog.tsx
│       │       └── panels/
│       │           ├── DropZonePanel.tsx
│       │           ├── QueuePanel.tsx
│       │           ├── PreviewPanel.tsx
│       │           └── MarkdownPreview.tsx
│       ├── stores/
│       │   ├── scan2text.store.ts  # Main Zustand store
│       │   └── preferencesStore.ts # Theme/language store
│       ├── lib/
│       │   ├── api.ts              # API client functions
│       │   ├── apiBase.ts          # Base URL builder
│       │   ├── naming.ts           # Output filename generation
│       │   ├── fileValidation.ts   # File validation logic
│       │   └── preferences.ts      # Theme/language helpers
│       ├── hooks/
│       │   └── useBackendBootFailedListener.ts
│       └── locales/
│           ├── en.json
│           └── id.json
├── src/scan2text/                  # Python backend
│   ├── api/
│   │   ├── main.py                 # FastAPI app, endpoints
│   │   └── websocket_manager.py    # WebSocket connection manager
│   ├── adapters/
│   │   ├── ocr_engine.py           # OCREngine ABC + FakeOCR
│   │   └── vlm_ocr.py              # VLM OCR adapter (OvisOCR2)
│   ├── routes/
│   │   ├── health.py               # /api/health endpoint
│   │   ├── settings.py             # /api/settings endpoints
│   │   ├── feedback.py             # /api/feedback endpoints
│   │   └── download.py             # /api/download endpoints
│   ├── services/
│   │   ├── queue_service.py        # Batch processing orchestrator
│   │   ├── output_service.py       # Markdown file writer
│   │   ├── file_service.py         # File discovery/validation
│   │   ├── pdf_service.py          # PDF detection/rendering
│   │   ├── settings_service.py     # Settings persistence
│   │   ├── path_service.py         # Path resolution
│   │   ├── feedback_service.py     # Offline feedback queue
│   │   ├── model_downloader_service.py  # Model download logic
│   │   ├── postprocess_service.py  # GFM conversion + image crops
│   │   └── logging_service.py      # Structured logging
│   ├── models/
│   │   ├── settings.py             # AppSettings Pydantic model
│   │   ├── job.py                  # OCRJob model
│   │   ├── ocr_result.py           # OCRResult model
│   │   └── errors.py               # ErrorCode enum
│   ├── utils/
│   │   └── prod_runtime.py         # Frozen exe detection
│   └── cli.py                      # Production entry point
├── packaging/
│   └── scan2text-backend.spec      # PyInstaller spec
├── scripts/                        # Build/deployment scripts
└── second-brain/                   # Obsidian vault (local-only; gitignored; NOT published)
```

---

## Cross-Runtime Architecture

### Layer 1: Tauri Shell (Rust)
- **Entry Point:** `frontend/src-tauri/src/main.rs` (5 lines)
- **Core Logic:** `frontend/src-tauri/src/lib.rs` (423 lines)
- **Backend Management:** `frontend/src-tauri/src/backend_process.rs` (542 lines)

**Responsibilities:**
- Window management and lifecycle
- Backend process spawning and cleanup
- Health check polling
- IPC command handling
- Event emission (backend-boot-failed)

**Key Constants:**
- `BACKEND_PORT = 47351` (hardcoded in 3 places)
- `BOOT_FAIL_WINDOW = 5s` (early exit detection)

### Layer 2: React Frontend
- **Entry Point:** `frontend/src/main.tsx` (23 lines)
- **Root Component:** `frontend/src/App.tsx` (102 lines)
- **Layout:** `frontend/src/components/layout/CommandCenterLayout.tsx` (28 lines)

**Responsibilities:**
- UI rendering (Command Center v1.7 layout)
- State management (Zustand stores)
- API communication
- i18n (EN + ID)
- Theme switching (dark/light)

**UI Layout (Fixed 1200×800 window):**
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]                    Scan2Text                    [🌙][🌐][⚙️]  │ ← TopBar (34px)
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌─────────────────────────────────┐  │
│  │                  │  │                                 │  │
│  │   Drop Zone      │  │        Preview Panel            │  │
│  │   (38% height)   │  │        (full height)            │  │
│  │                  │  │                                 │  │
│  ├──────────────────┤  └─────────────────────────────────┘  │
│  │                  │                                       │
│  │    Queue         │                                       │
│  │   (62% height)   │                                       │
│  │                  │                                       │
│  └──────────────────┘                                       │
├─────────────────────────────────────────────────────────────┤
│                    Worker: Idle · RAM — · v1.1.0    [✉️][📤]  │ ← BottomBar (36px)
└─────────────────────────────────────────────────────────────┘
```

### Layer 3: Python Backend
- **Entry Point:** `src/scan2text/cli.py` (35 lines)
- **FastAPI App:** `src/scan2text/api/main.py` (246 lines)
- **OCR Engine:** `src/scan2text/adapters/vlm_ocr.py` (351 lines)

**Responsibilities:**
- HTTP API server (FastAPI + Uvicorn)
- WebSocket broadcasting
- File upload handling
- OCR processing pipeline
- Model management
- Settings persistence

---

## Communication Protocols

### Tauri → Backend (IPC)
The Tauri shell manages the backend process lifecycle:
1. **Spawn:** `backend_process.rs:start_backend()` spawns `scan2text-backend.exe`
2. **Health Check:** Polls `GET /api/health` until 200 or timeout (30s)
3. **Cleanup:** On window close/app exit, calls `taskkill /F /IM scan2text-backend.exe /T`
4. **Event Emission:** Emits `backend-boot-failed` if backend exits within 5s of spawn

### Frontend → Backend (HTTP)
All API calls go through `http://127.0.0.1:47351`:
- `POST /process` — Upload files for OCR
- `GET /status/{task_id}` — Poll job status
- `GET /api/health` — Health check
- `GET /api/settings` — Get settings
- `PUT /api/settings` — Update settings
- `POST /api/feedback` — Submit feedback
- `GET /api/feedback/pending-count` — Check pending feedback
- `POST /api/download/start` — Start model download
- `GET /api/download/status` — Get download progress
- `POST /api/download/cancel` — Cancel download

### Frontend → Backend (WebSocket)
- `WS /ws/progress` — Real-time progress updates (currently unused by frontend)

### Tauri → Frontend (IPC Commands)
- `open_output_folder(path: String)` — Open system file explorer

---

## State Management

### Frontend State (Zustand)
1. **`scan2text.store.ts`** — Job queue, upload status, poll tracking
2. **`preferencesStore.ts`** — Theme, language (synced to localStorage + backend)

### Backend State
- **In-memory task store:** `_task_store: Dict[str, Dict]` (maps task_id → status/result)
- **WebSocket manager:** `ConnectionManager` (tracks active connections)
- **Settings:** Persisted to `settings/settings.json`

### Persistence
- **settings/settings.json:** AppSettings (Pydantic model)
- **localStorage:** Only `scan2text:theme` and `scan2text:language`
- **jobs:** Never persisted (memory-only)
- **logs:** Rotating file handler, 1MB max, filenames/redacted

---

## Security & Privacy

### Network Boundaries
- Backend binds **ONLY** to `127.0.0.1:47351` (localhost only)
- No `0.0.0.0` bindings detected
- CORS enabled with `allow_origins=["*"]` (internal only due to localhost binding)

### Privacy Filters
- `PrivacyFilter` class strips:
  - Windows paths (`[A-Z]:\...`)
  - File extensions with names (`filename.pdf`)
  - Long text blocks (>200 chars) → truncated to 100 chars + `[REDACTED]`
  - Log arguments >40 chars → `[REDACTED]`

### Telemetry Verification
- **No external telemetry detected**
- No analytics SDKs
- No silent network calls
- Feedback is **offline queue** (stored locally, not sent automatically)
- Share button uses placeholder `https://placeholder.local`

---

## Data Flow: Core OCR Pipeline

```
User drops file → FileDropZone.validateFilesBatch()
    ↓
Frontend adds job to Zustand store (status: pending)
    ↓
Frontend calls POST /process (multipart/form-data)
    ↓
Backend saves file to uploads/ directory
    ↓
Backend creates task_id, spawns background coroutine
    ↓
VlmOcrAdapter.ocr() → llama-cpp-python worker process
    ↓
Worker renders PDF pages (pypdfium2) or prepares images (PIL)
    ↓
Worker runs OCR inference (Llama CPP, temperature=0.1)
    ↓
Post-processing: HTML tables → GFM, noise filtering, image crops
    ↓
OutputService.write() → {stem}_{HHmm}_{yyyyMMdd}.md
    ↓
Backend broadcasts progress via WebSocket (if connected)
    ↓
Frontend polls GET /status/{task_id}
    ↓
Frontend updates job status → completed/failed
    ↓
User sees result in PreviewPanel (MarkdownPreview)
```

---

## Build & Runtime Dependencies

### Required Runtimes
- **Python 3.12** (locked, never bare `python`)
- **Node.js ≥ 18** (for Vite, Tauri CLI)
- **Rust ≥ 1.70** (for Tauri compilation)

### Key Dependencies
**Frontend:**
- React 19, TypeScript 6, Vite 8
- Tauri 2.11, Zustand 5, react-i18next 17
- Tailwind CSS 3, shadcn/ui, Lucide icons
- Vitest 4, jsdom 30 (testing)

**Backend:**
- FastAPI, Uvicorn, Pydantic v2
- llama-cpp-python (CPU-only, GGUF models)
- pypdfium2 (PDF rendering)
- Pillow (image processing)
- psutil (process management)

### Build Commands
```powershell
# Development
.\dev.ps1  # Starts backend + Tauri dev mode

# Frontend build
cd frontend && npm run build

# Backend build (PyInstaller)
py -3.12 -m PyInstaller packaging/scan2text-backend.spec

# Full Tauri build
cd frontend && npx tauri build
```

---

## Version & Release

- **Current Version:** 1.1.0
- **Release Format:** Portable ZIP (`Scan2Text-v1.1-Portable-Full.zip`)
- **Deployment:** GitHub Releases
- **Cadence:** Monthly releases

---

## See Also

- [01_FILE_MATRIX.md](./01_FILE_MATRIX.md) — Complete file ledger
- [02_IPC_AND_API_CONTRACTS.md](./02_IPC_AND_API_CONTRACTS.md) — API schemas and contracts
- [03_STATE_AND_PERSISTENCE.md](./03_STATE_AND_PERSISTENCE.md) — State management details
- [04_SECURITY_AND_PRIVACY.md](./04_SECURITY_AND_PRIVACY.md) — Security audit
- [05_DATA_FLOWS.md](./05_DATA_FLOWS.md) — Sequence diagrams
- [06_ENVIRONMENT_AND_BUILD.md](./06_ENVIRONMENT_AND_BUILD.md) — Build instructions
