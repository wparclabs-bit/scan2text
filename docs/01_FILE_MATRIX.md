# File Reference Matrix

> **Generated:** 2026-09-03  
> **Scope:** All source files excluding node_modules, target, _internal, models

---

## Tauri/Rust Shell

| File Path | Language | Primary Responsibility | Direct Imports | External Dependents |
|-----------|----------|------------------------|----------------|---------------------|
| `frontend/src-tauri/src/main.rs` | Rust | Entry point, calls `app_lib::run()` | `app_lib` | None (entry point) |
| `frontend/src-tauri/src/lib.rs` | Rust | App setup, IPC commands, backend cleanup, health checks | `backend_process`, `tauri`, `log`, `std::net::TcpStream`, `std::process` | `main.rs`, Tauri build system |
| `frontend/src-tauri/src/backend_process.rs` | Rust | Backend lifecycle management (spawn, health check, kill) | `std::io`, `std::net::TcpStream`, `std::process`, `std::time`, `tauri` | `lib.rs` |
| `frontend/src-tauri/tauri.conf.json` | JSON | Tauri app config (window size, icons, resources) | N/A | Tauri CLI, build system |
| `frontend/src-tauri/capabilities/main.json` | JSON | Permission caps (core:default, shell:allow-open) | N/A | Tauri runtime |
| `frontend/src-tauri/Cargo.toml` | TOML | Rust dependencies (tauri 2.11, serde, log) | N/A | Build system |

---

## React/TypeScript Frontend

| File Path | Language | Primary Responsibility | Direct Imports | External Dependents |
|-----------|----------|------------------------|----------------|---------------------|
| `frontend/src/main.tsx` | TSX | React entry point, i18n init, preference hydration | `react`, `sonner`, `./i18n`, `./locales/*`, `./stores/preferencesStore` | Vite, Tauri webview |
| `frontend/src/App.tsx` | TSX | Root component, health check, model downloader, welcome modal | `react`, `react-i18next`, `stores/*`, `lib/apiBase`, `components/layout/*`, `hooks/*` | main.tsx |
| `frontend/src/components/layout/CommandCenterLayout.tsx` | TSX | Fixed inset-0 shell, TopBar/Main/BottomBar layout | `./TopBar`, `./BottomStatusBar`, `./panels/*` | App.tsx |
| `frontend/src/components/layout/TopBar.tsx` | TSX | 34px header: logo chip, brand image, theme/lang/settings toggles | `react-i18next`, `stores/preferencesStore`, `lucide-react`, `./SettingsDialog`, `@/components/ui/tooltip` | CommandCenterLayout.tsx |
| `frontend/src/components/layout/BottomStatusBar.tsx` | TSX | 36px footer: worker status, RAM/CPU, version, Share/Feedback buttons | `react`, `react-i18next`, `stores/scan2text.store`, `lucide-react`, `sonner`, `lib/apiBase` | CommandCenterLayout.tsx |
| `frontend/src/components/layout/SettingsDialog.tsx` | TSX | Settings modal: output dir, max PDF pages, CPU threads, enhance toggle | `react`, `react-i18next`, `sonner`, `@/components/ui/*`, `lib/api` | TopBar.tsx |
| `frontend/src/components/layout/panels/DropZonePanel.tsx` | TSX | Left-top panel: file drop zone with background image | `react-i18next`, `stores/preferencesStore`, `@/components/dropzone/FileDropZone`, `@/lib/depthStyles` | CommandCenterLayout.tsx |
| `frontend/src/components/layout/panels/QueuePanel.tsx` | TSX | Left-bottom panel: job list with status dots, retry buttons | `react`, `react-i18next`, `stores/*`, `lib/*`, `@/components/ui/*`, `lucide-react` | CommandCenterLayout.tsx |
| `frontend/src/components/layout/panels/PreviewPanel.tsx` | TSX | Right panel: Markdown preview, Copy/Open Folder buttons | `react-i18next`, `stores/*`, `./MarkdownPreview`, `sonner`, `@/lib/*`, `@tauri-apps/api` | CommandCenterLayout.tsx |
| `frontend/src/components/layout/panels/MarkdownPreview.tsx` | TSX | Renders Markdown with GFM tables, strips raw img tags | `react-markdown`, `remark-gfm` | PreviewPanel.tsx |
| `frontend/src/components/dropzone/FileDropZone.tsx` | TSX | Drag-drop zone with file validation, batch cap enforcement | `react`, `sonner`, `react-i18next`, `@/lib/fileValidation`, `@/stores/scan2text.store` | DropZonePanel.tsx |
| `frontend/src/hooks/useBackendBootFailedListener.ts` | TS | Listens for `backend-boot-failed` Tauri event, shows toast | `react`, `react-i18next`, `@tauri-apps/api/event`, `sonner` | App.tsx |
| `frontend/src/stores/scan2text.store.ts` | TS | Main Zustand store: jobs, upload, polling, progress | `zustand`, `../lib/api`, `../lib/progressManager`, `../i18n`, `sonner` | Multiple components |
| `frontend/src/stores/preferencesStore.ts` | TS | Theme/language Zustand store with localStorage persistence | `zustand`, `../i18n`, `../lib/api`, `../lib/preferences` | App.tsx, TopBar.tsx, panels |
| `frontend/src/lib/api.ts` | TS | HTTP client: uploadFile, getTaskStatus, getSettings, getHealth | `./apiBase` | scan2text.store.ts, components |
| `frontend/src/lib/apiBase.ts` | TS | URL builder: `http://127.0.0.1:47351` | None | api.ts, all API callers |
| `frontend/src/lib/naming.ts` | TS | Output filename generation: `{stem}_{HHmm}_{yyyyMMdd}.md` | None | output_service.py (concept), tests |
| `frontend/src/lib/fileValidation.ts` | TS | Frontend file validation: 20MB limit, allowed types | None | FileDropZone.tsx |
| `frontend/src/lib/preferences.ts` | TS | Theme/language constants and helpers | None | preferencesStore.ts |
| `frontend/src/lib/utils.ts` | TS | Class name utility (cn function) | `class-variance-authority`, `clsx`, `tailwind-merge` | UI components |
| `frontend/src/i18n/index.ts` | TS | i18next initialization | `i18next`, `react-i18next` | main.tsx, components |
| `frontend/src/index.css` | CSS | Tailwind directives, dark mode, panel depth styles, scrollbars | `@tailwind base/components/utilities` | All components |
| `frontend/tailwind.config.js` | JS | Tailwind v3 config: colors, fonts, dark mode class | `@tailwindcss/typography` | index.css |
| `frontend/vite.config.ts` | TS | Vite config: React plugin, proxy /api → 47351 | `vite`, `@vitejs/plugin-react`, `path` | Build system |
| `frontend/tsconfig.app.json` | JSON | TypeScript config for app | N/A | TypeScript compiler |
| `frontend/tsconfig.json` | JSON | Root TS config | N/A | TypeScript compiler |

---

## Python Backend

| File Path | Language | Primary Responsibility | Direct Imports | External Dependents |
|-----------|----------|------------------------|----------------|---------------------|
| `src/scan2text/cli.py` | Python | Production entry point: boot guard, Uvicorn server | `logging`, `multiprocessing`, `uvicorn`, `api.main`, `services/*`, `utils/prod_runtime` | PyInstaller spec, backend_process.rs |
| `src/scan2text/api/main.py` | Python | FastAPI app: routes, lifespan, task store, WebSocket | `fastapi`, `asyncio`, `logging`, `uuid`, `api.websocket_manager`, `routes/*`, `services/*`, `adapters/vlm_ocr` | All route handlers |
| `src/scan2text/api/websocket_manager.py` | Python | WebSocket connection tracker, broadcast | `logging` | api/main.py |
| `src/scan2text/adapters/ocr_engine.py` | Python | OCREngine ABC + FakeOCR for tests | `abc`, `pathlib`, `typing`, `models/ocr_result` | vlm_ocr.py, queue_service.py |
| `src/scan2text/adapters/vlm_ocr.py` | Python | VLM OCR adapter: llama-cpp-python worker, PDF rendering | `base64`, `logging`, `os`, `queue`, `multiprocessing`, `psutil`, `pypdfium2`, `models/settings`, `services/*`, `utils/cpu_budget` | queue_service.py |
| `src/scan2text/routes/health.py` | Python | GET /api/health: system stats, model status | `logging`, `typing`, `psutil`, `fastapi`, `services/path_service`, `services/settings_service` | api/main.py |
| `src/scan2text/routes/settings.py` | Python | GET/PUT /api/settings: load/save AppSettings | `logging`, `fastapi`, `pydantic`, `models/errors`, `models/settings`, `services/*` | api/main.py |
| `src/scan2text/routes/feedback.py` | Python | Feedback API: submit, count, mark sent | `fastapi`, `pydantic`, `services/feedback_service` | api/main.py |
| `src/scan2text/routes/download.py` | Python | Model download API: start, status, cancel | `fastapi`, `services/model_downloader_service`, `services/path_service` | api/main.py |
| `src/scan2text/services/queue_service.py` | Python | Batch orchestrator: process files sequentially | `logging`, `uuid`, `datetime`, `pathlib`, `typing`, `adapters/ocr_engine`, `models/*`, `services/*` | api/main.py |
| `src/scan2text/services/output_service.py` | Python | Markdown writer: render OCRResult to .md file | `logging`, `re`, `pathlib`, `typing`, `models/*`, `services/path_service` | queue_service.py |
| `src/scan2text/services/file_service.py` | Python | File discovery: validate, classify, expand directories | `logging`, `pathlib`, `typing`, `pydantic` | queue_service.py |
| `src/scan2text/services/pdf_service.py` | Python | PDF utilities: detect type, count pages, render | `pypdfium2`, `pathlib`, `typing` | vlm_ocr.py, file_service.py |
| `src/scan2text/services/settings_service.py` | Python | Settings persistence: load/save AppSettings | `json`, `logging`, `os`, `pathlib`, `typing`, `models/errors`, `models/settings`, `services/path_service` | routes/settings.py, api/main.py |
| `src/scan2text/services/path_service.py` | Python | Path resolution: home, models, output, logs | `os`, `sys`, `datetime`, `pathlib` | All services |
| `src/scan2text/services/feedback_service.py` | Python | Offline feedback queue: save/move JSON files | `json`, `logging`, `datetime`, `pathlib`, `typing`, `services/path_service` | routes/feedback.py |
| `src/scan2text/services/model_downloader_service.py` | Python | Model download: stream, verify SHA256, extract | `hashlib`, `json`, `logging`, `os`, `threading`, `urllib`, `pathlib`, `typing`, `zipfile` | routes/download.py |
| `src/scan2text/services/postprocess_service.py` | Python | Post-processing: HTML→GFM, image crop extraction | `logging`, `re`, `html.parser`, `pathlib`, `PIL.Image` | vlm_ocr.py |
| `src/scan2text/services/logging_service.py` | Python | Structured logging: PrivacyFilter, RotatingFileHandler | `datetime`, `json`, `logging`, `re`, `logging.handlers`, `pathlib`, `services/path_service` | cli.py |
| `src/scan2text/services/boot_guard.py` | Python | Port occupancy check: kill stale backends | `logging`, `os`, `sys`, `pathlib`, `psutil` | cli.py |
| `src/scan2text/models/settings.py` | Python | AppSettings Pydantic model | `pydantic` | settings_service.py, routes/settings.py |
| `src/scan2text/models/job.py` | Python | OCRJob Pydantic model | `uuid`, `datetime`, `enum`, `typing`, `pydantic` | queue_service.py, output_service.py |
| `src/scan2text/models/ocr_result.py` | Python | OCRResult/OCRPage Pydantic models | `datetime`, `typing`, `pydantic` | queue_service.py, output_service.py |
| `src/scan2text/models/errors.py` | Python | ErrorCode enum, ErrorDetail/Envelope models | `enum`, `typing`, `pydantic` | routes/*.py, services/*.py |
| `src/scan2text/utils/prod_runtime.py` | Python | Frozen exe detection, port/host constants | `sys`, `pathlib` | cli.py, backend_process.rs (concept) |
| `src/scan2text/utils/cpu_budget.py` | Python | Auto-thread calculation (60% of logical cores) | `os` | vlm_ocr.py |

---

## Configuration & Build Files

| File Path | Type | Purpose |
|-----------|------|---------|
| `frontend/package.json` | JSON | Frontend dependencies, scripts |
| `frontend/tsconfig.json` | JSON | TypeScript root config |
| `frontend/tsconfig.app.json` | JSON | TypeScript app config |
| `frontend/tsconfig.node.json` | JSON | TypeScript node config |
| `frontend/vite.config.ts` | TS | Vite build config |
| `frontend/vite.test.config.ts` | TS | Vitest config |
| `frontend/tailwind.config.js` | JS | Tailwind CSS config |
| `frontend/postcss.config.js` | JS | PostCSS config |
| `frontend/components.json` | JSON | shadcn/ui config |
| `frontend/.oxlintrc.json` | JSON | Oxlint config |
| `frontend/.npmrc` | N/A | npm config |
| `frontend/src-tauri/Cargo.toml` | TOML | Rust dependencies |
| `frontend/src-tauri/tauri.conf.json` | JSON | Tauri app config |
| `frontend/src-tauri/capabilities/main.json` | JSON | Permission capabilities |
| `packaging/scan2text-backend.spec` | Python | PyInstaller build spec |
| `pytest.ini` | INI | Pytest configuration |
| `pyproject.toml` | TOML | Python project metadata |
| `dev.ps1` | PowerShell | Unified dev startup script |

---

## Generated/Built Artifacts (Not in Source Control)

| Path | Description |
|------|-------------|
| `frontend/dist/` | Vite build output |
| `frontend/src-tauri/target/` | Rust build artifacts |
| `dist/scan2text-backend/` | PyInstaller folder artifact |
| `models/*.gguf` | Downloaded model files |
| `settings/settings.json` | User settings (created at runtime) |
| `logs/*.log` | Application logs (rotating) |
| `output/*.md` | OCR output files |
| `feedback/pending/*.json` | Offline feedback queue |
| `uploads/*.png/*.pdf` | Temporary uploaded files |

---

## Dependency Graph (Simplified)

```
main.tsx
  └─ App.tsx
       ├─ CommandCenterLayout.tsx
       │    ├─ TopBar.tsx ──────┐
       │    ├─ BottomStatusBar.tsx ─┤
       │    ├─ DropZonePanel.tsx   │
       │    │    └─ FileDropZone.tsx ──┤
       │    ├─ QueuePanel.tsx         │
       │    └─ PreviewPanel.tsx       │
       │         └─ MarkdownPreview.tsx
       ├─ WelcomeModal.tsx
       ├─ ModelDownloaderModal.tsx
       └─ useBackendBootFailedListener.ts

stores/
  ├─ scan2text.store.ts ──┐
  └─ preferencesStore.ts──┤
                          │
lib/                      │
  ├─ api.ts ──────────────┤
  ├─ apiBase.ts ──────────┤
  ├─ naming.ts ───────────┤
  ├─ fileValidation.ts ───┤
  └─ preferences.ts ──────┘

src-tauri/
  ├─ main.rs ──→ lib.rs ──→ backend_process.rs
  └─ capabilities/main.json
```

```
cli.py
  └─ api/main.py
       ├─ routes/health.py
       ├─ routes/settings.py
       ├─ routes/feedback.py
       ├─ routes/download.py
       ├─ api/websocket_manager.py
       ├─ services/queue_service.py
       │    ├─ adapters/vlm_ocr.py
       │    │    ├─ adapters/ocr_engine.py
       │    │    ├─ services/pdf_service.py
       │    │    ├─ services/postprocess_service.py
       │    │    ├─ services/settings_service.py
       │    │    ├─ services/path_service.py
       │    │    └─ utils/cpu_budget.py
       │    ├─ services/output_service.py
       │    ├─ services/file_service.py
       │    └─ services/model_downloader_service.py
       └─ models/settings.py
            └─ models/errors.py
```
