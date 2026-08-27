# 01 — Repository Topology & File Reference Matrix

> Master reference: [`ARCHITECTURE.md`](./ARCHITECTURE.md) · Siblings: [02_IPC_AND_API_CONTRACTS](./02_IPC_AND_API_CONTRACTS.md) · [03_DATA_FLOWS](./03_DATA_FLOWS.md) · [04_ENVIRONMENT_AND_BUILD](./04_ENVIRONMENT_AND_BUILD.md)

## 1. Directory Tree (source-of-truth files; build artifacts collapsed)

```
scan2text/
├── AGENTS.md · AGENTS-CTO.md · README.md · LICENSE · NOTICE.md
├── CODE_OF_CONDUCT.md · CONTRIBUTING.md · Lesson-Learned.md
├── pyproject.toml · pytest.ini · version.json
├── dev.ps1 · dev-web.ps1 · verify-fix65d.ps1 · .gitignore · .graphifyignore
├── src/scan2text/                     ← Python FastAPI backend package
│   ├── cli.py · boot_guard.py · smoke.py
│   ├── adapters/      ocr_engine.py · vlm_ocr.py
│   ├── api/           main.py · websocket_manager.py
│   ├── models/        errors.py · job.py · ocr_result.py · settings.py
│   ├── routes/        download.py · feedback.py · health.py · jobs.py · settings.py
│   ├── services/      feedback_service.py · file_service.py · logging_service.py
│   │                  model_downloader_service.py · output_service.py · path_service.py
│   │                  pdf_service.py · postprocess_service.py · queue_service.py
│   │                  settings_service.py · update_service.py
│   └── utils/         cpu_budget.py · prod_runtime.py
├── tests/                             ← pytest suite (21 files + conftest.py)
├── frontend/
│   ├── package.json · vite.config.ts · vite.test.config.ts · tsconfig{,.app,.node}.json
│   ├── tailwind.config.js · postcss.config.js · index.html · components.json · .npmrc
│   ├── Images/  logo.png · text.png · bacground-left-top-panel.jpg
│   ├── src/
│   │   ├── main.tsx · App.tsx · index.css · test-setup.ts · vite-env.d.ts
│   │   ├── components/layout/          CommandCenterLayout.tsx · TopBar.tsx · BottomStatusBar.tsx
│   │   │                               SettingsDialog.tsx · ModelDownloaderModal.tsx · WelcomeModal.tsx
│   │   │                               FeedbackButton.tsx · FeedbackDialog.tsx
│   │   ├── components/layout/panels/   DropZonePanel.tsx · QueuePanel.tsx · PreviewPanel.tsx
│   │   │                               MarkdownPreview.tsx
│   │   ├── components/dropzone/        FileDropZone.tsx
│   │   ├── components/ui/              button.tsx card.tsx dialog.tsx input.tsx label.tsx
│   │   │                               scroll-area.tsx spinner.tsx tooltip.tsx
│   │   ├── hooks/                      useBackendBootFailedListener.ts
│   │   ├── i18n/                       index.ts
│   │   ├── lib/                        api.ts apiBase.ts cleanupObjectURLs.ts depthStyles.ts
│   │   │                               fileKind.ts fileValidation.ts formatBytes.ts naming.ts
│   │   │                               preferences.ts progressManager.ts utils.ts
│   │   ├── locales/                    en.json · id.json
│   │   ├── services/                   uploadService.ts
│   │   ├── stores/                     fileStore.ts preferencesStore.ts scan2text.store.ts
│   │   └── theme/  __tests__/          palette-lock.test.ts · s34-frontend-polish.test.tsx
│   └── src-tauri/
│       ├── Cargo.toml · Cargo.lock · tauri.conf.json · build.rs
│       ├── capabilities/default.json
│       └── src/  main.rs · lib.rs · backend_process.rs   (+ tests/backend_lifecycle.rs,
                                                               backend_manager_tests.rs)
├── scripts/  build-backend.ps1 · package-portable.ps1 · verify-portable.ps1
│             deploy-fix66.ps1 · verify-fix66.ps1
├── packaging/  scan2text-backend.spec (+ build/, dist/ = PyInstaller artifacts)
├── tools/    prep_dummy_gdrive.py · dummy_models/{vlm.gguf,mmproj.gguf}
├── docs/     ARCHITECTURE.md · BUILD-AND-RELEASE.md · GITHUB-READINESS.md · REPO-MAP.md
│             RUNTIME-LAYOUT.md · SECURITY.md · TECH-STACK.md
├── docs1/    ← this documentation set
├── graphify-out/  graph.json · GRAPH_REPORT.md (AST knowledge graph)
├── second-brain/  00-Current-State.md · 01..05 vault folders (Obsidian)
├── .github/ .kilo/ .vscode/ .obsidian/
└── runtime artifacts (built): backend/scan2text-backend.exe + backend/_internal/,
    output/ · logs/ · uploads/ · feedback/ · models/ · settings.json
```

## 2. File Reference Matrix

Legend — **Direct Imports**: first-party project modules only (stdlib/py externals abbreviated). **External Dependents**: project files importing/referencing this one. Test files listed grouped after their subject.

### 2.1 Python backend (`src/scan2text/`)

| File Path | Runtime | Primary Responsibility | Direct Imports | External Dependents |
|---|---|---|---|---|
| `src/scan2text/cli.py` | Python 3.12 | Frozen/dev entry point: logging setup, runtime dirs, boot guard, uvicorn start | `scan2text.api.main.app`, `services.logging_service.setup_logging`, `services.path_service.get_paths`, `utils.prod_runtime.{get_host,get_port}` | PyInstaller spec (`entrypoint`), `tests/test_cli.py`, `test_cli_startup.py` |
| `src/scan2text/boot_guard.py` | Python 3.12 | Single-instance/process-alive guard via psutil before uvicorn bind | `logging`, `os`, `sys`, `pathlib`, `psutil` | `cli.py` |
| `src/scan2text/smoke.py` | Python 3.12 | Manual smoke-check runner exercising `VlmOcrAdapter` on a sample input | `adapters.vlm_ocr.VlmOcrAdapter` | developer workflow only |
| `src/scan2text/api/main.py` | FastAPI | App factory/object; CORS; lifespan; **live** endpoints `/process`, `/status/{task_id}`, `/ws/progress`; `_task_store`; `_run_processing` worker | `websocket_manager.ConnectionManager`, `routes.{health,settings,feedback,download}`, `services.queue_service.QueueService`, `services.path_service.PathService`, `adapters.vlm_ocr.VlmOcrAdapter` | `cli.py`, `tests/test_api*.py`, frontend HTTP client |
| `src/scan2text/api/websocket_manager.py` | FastAPI/WS | `ConnectionManager` socket registry: connect/disconnect/broadcast | stdlib typing/logging | `api/main.py` |
| `src/scan2text/routes/health.py` | FastAPI | `GET /api/health` — RAM/CPU/model-loaded/version telemetry | `PathService`, `SettingsService`, psutil | `main.py` router mount; Rust readiness probe; `lib/api.getHealth` |
| `src/scan2text/routes/settings.py` | FastAPI | `GET/PUT /api/settings`, effective output_dir fill, `SETTINGS_INVALID` errors | `models.errors`, `models.settings.AppSettings`, `PathService`, `SettingsService` | `main.py`; `lib/api.{getSettings,saveSettings}` |
| `src/scan2text/routes/download.py` | FastAPI | `/api/download/start\|status\|progress\|cancel` over singleton `ModelDownloaderService` | `ModelDownloaderService`, `PathService` | `main.py`; `ModelDownloaderModal.tsx` |
| `src/scan2text/routes/feedback.py` | FastAPI | Offline feedback endpoints (`FeedbackPayload`, `MarkSentPayload`) | `FeedbackService` | `main.py`; `FeedbackDialog.tsx` |
| `src/scan2text/routes/jobs.py` | FastAPI ⚠️ unmounted | Legacy `/api/jobs*` surface (`ProcessRequest`, `_job_queue`) | `models.job/errors`, `output_service.save_markdown`, `adapters.ocr_engine.OCREngine` | none live (tests reference semantics); kept for compat |
| `src/scan2text/models/job.py` | Pydantic | `JobStatus` enum (queued/loading_model/processing/done/failed/skipped), `OCRJob` model | pydantic | `queue_service`, `routes/jobs.py`, `output_service`, `models/__init__` |
| `src/scan2text/models/settings.py` | Pydantic | `AppSettings` schema (13 fields incl. engine knobs) | pydantic | `settings_service`, routes/health+settings, `vlm_ocr`, `models/__init__` |
| `src/scan2text/models/errors.py` | Pydantic | `ErrorCode` enum, `ErrorDetail`, `ErrorEnvelope` | pydantic | settings/jobs routes, `settings_service`, `queue_service`, `models/__init__` |
| `src/scan2text/models/ocr_result.py` | Pydantic | `OCRPage`, `OCRResult` result records | pydantic | `adapters.ocr_engine`, `output_service`, `queue_service`, `models/__init__` |
| `src/scan2text/services/path_service.py` | stdlib | Portable-root resolution (`_resolve_portable_root/_resolve_base_dir/app_root`), dirs (`output/logs/models/feedback/assets`), `sanitize_filename`, `resolve_model_path`, `resolve_output_path`, `ensure_runtime_dirs`, module fn `get_paths()` | os/sys/pathlib/datetime | nearly all services + routes; `cli.py`; heavily tested (`test_path_service_*`, `TestPathServiceFrozen`) |
| `src/scan2text/services/queue_service.py` | threading/to-thread | Batch orchestration: `BatchSummary`, `QueueService.process_batch/_process_one_job/process_image_paths`, quarantine naming, `cleanup_old_failures` | `OCREngine`, file/output/path/pdf/settings services, models | `api/main.py`; `TestQueueServiceQuarantine`, `TestQueueAcceptsPathsAndDiscoveryResult` |
| `src/scan2text/services/file_service.py` | pydantic/stdlib | Input discovery/classification: `DiscoveredFile/SkippedFile/DiscoveryResult`, `is_supported`, `validate_size`, `FileService.discover`, `sanitize_filename` | pydantic, pathlib | `queue_service` (imports several symbols), `TestQueueAcceptsPathsAndDiscoveryResult` |
| `src/scan2text/services/pdf_service.py` | pypdfium2 | `detect_file_type`, `count_pdf_pages`, `check_page_limit`, `check_pdf_size`, `render_pdf_to_images` | pypdfium2, pathlib | `queue_service` (`detect_file_type`), `vlm_ocr`, `test_pdf_chart_crops.py`, `test_pdf_guard_settings.py` |
| `src/scan2text/adapters/ocr_engine.py` | ABC | Engine protocol `OCREngine` + test double `FakeOCR` | `models.ocr_result` | `adapters/__init__`, `queue_service`, `routes/jobs.py`, adapter tests |
| `src/scan2text/adapters/vlm_ocr.py` | llama.cpp (multiprocessing worker) | `VlmOcrAdapter`: model load resolve (mmproj+vlm gguf), `_VLM_PROMPT`, `temperature=0.1`, full-page normalization resize, per-file worker subprocess w/ timeout (`OCR_TIMEOUT` sentinel), PDF page resilience | psutil, pypdfium2, PIL, multiprocessing, `AppSettings`, `PathService`, `cpu_budget.calculate_auto_threads`, `postprocess_service` (tables/noise/crops), `SettingsService`, `pdf_service.detect_file_type` | `api/main.py` lifespan, `smoke.py`, `adapters/__init__`, `test_vlm_ocr*.py` |
| `src/scan2text/services/postprocess_service.py` | stdlib HTMLParser/PIL | `_TableParser` grid extraction, `_normalize_rows/_rows_to_gfm_lines/convert_html_tables_to_gfm`, `_strip_tags`, `extract_and_save_image_crops`, `filter_noise_lines` | html.parser, re, logging, PIL | `vlm_ocr`; `test_noise_filter.py`, `test_pdf_chart_crops.py`, `convert_html_tables_to_gfm` consumers |
| `src/scan2text/services/output_service.py` | pathlib | `has_no_text` guard, `OutputService.render_markdown/_has_raw_text/write`, legacy `save_markdown(job,…)` | models.job/ocr_result, `PathService` | `queue_service`, `routes/jobs.py`, status/no-text tests |
| `src/scan2text/services/settings_service.py` | json/os | `SettingsService.load/create_default/save` ↔ `settings.json`; `SettingsError(code,message)` | models.errors/settings, `PathService` | routes/health+settings+jobs, `queue_service`, `vlm_ocr`, settings tests |
| `src/scan2text/services/model_downloader_service.py` | urllib/threading/zipfile/hashlib | Threaded download of `version.json`-defined artifacts; sha256+size verification; progress state machine; cancel | hashlib/json/os/urllib/zipfile/threading | `routes/download.py`, `test_api_download.py`, `test_models_dir_priority.py` |
| `src/scan2text/services/feedback_service.py` | json | Offline queue writer/counter/mover (`save_pending_feedback/get_pending_count/move_pending_to_sent`) | `PathService` | `routes/feedback.py`, `test_api_feedback.py`, `TestFeedbackDirNotBaseDir` |
| `src/scan2text/services/update_service.py` | requests | `UpdateService.check()` remote-version compare (`_newer`) | requests, json | version-check flow referenced from health/version docs; `UPDATE_CHECK_FAILED` producer |
| `src/scan2text/services/logging_service.py` | logging | `PrivacyFilter` (no filenames/content), `StructuredFormatter`, `setup_logging(log_path?)`, nested `log_ocr_event`, 1 MB rotation | logging/handlers, re, json | `cli.py`, all loggers via config |
| `src/scan2text/utils/cpu_budget.py` | math/os | `calculate_auto_threads` — auto thread count (60% of logical cores, ADR-007) | math/os | `vlm_ocr` |
| `src/scan2text/utils/prod_runtime.py` | sys/pathlib | Frozen detection `is_frozen/frozen_exe_dir`, `get_port()` (47351 frozen / 8000 dev), `get_host()=127.0.0.1` | sys/pathlib | `cli.py` |
| `src/scan2text/adapters/__init__.py` | — | re-exports `OCREngine`, `FakeOCR` | `ocr_engine` | importers of `scan2text.adapters` |
| `src/scan2text/services/__init__.py` | — | re-exports FileService family, OutputService, PathService, QueueService/BatchSummary, SettingsService/SettingsError | file/output/path/queue/settings services | broad service imports |
| `src/scan2text/models/__init__.py` | — | re-exports core models | all four model modules | model importers |

### 2.2 Tauri / Rust shell (`frontend/src-tauri/`)

| File Path | Language | Primary Responsibility | Direct Imports | External Dependents |
|---|---|---|---|---|
| `src/main.rs` | Rust | Binary entry (`[[bin]] Scan2Text`) calling into lib | `app_lib::run()` | Tauri bundle target |
| `src/lib.rs` | Rust | App builder `run()`: `AppState`, plugin init, `boot_backend` in setup, invoke handler `[open_output_folder]`, window-close/exit teardown; helpers `wait_for_health`, `is_port_open`, `wait_for_port_closed`, `start_backend_process`, `stop_backend_process`, `validate_output_path`, `cleanup_backend_state/process`, `force_kill_process_tree`; legacy `BackendState` | `backend_process::{boot_backend, BackendManager}`, tauri, tauri_plugin_{log,shell}, log | `main.rs`, integration tests (`tests/backend_lifecycle.rs`), WebView `invoke('open_output_folder')` from PreviewPanel |
| `src/backend_process.rs` | Rust (Windows-aware) | `BackendManager` lifecycle, `BACKEND_PORT=47351`, early-exit watcher emitting `backend-boot-failed`, `boot_backend`, `resolve_backend_path`, TCP health probe, log-file spawn config, image-name taskkill stop, port-closed wait | std net/process/windows CommandExt, tauri (Emitter) | `lib.rs` (pub use), `tests/backend_manager_tests.rs` |
| `tauri.conf.json` | JSON | Window (1200×800), identifier `com.wingai.scan2text`, devUrl :5173, frontendDist ../dist, bundle resources `../../backend` | — | cargo-tauri build & CLI |
| `capabilities/default.json` | JSON | Permission grants (core defaults + shell open) | — | Tauri ACL generated schemas in `gen/schemas/` |
| `build.rs` | Rust | `tauri_build::build()` | tauri-build | compile step |
| `Cargo.toml` | TOML | crate `app_lib` (staticlib/cdylib/rlib) + bin `Scan2Text`; deps tauri 2.11.3, tauri-plugin-log/shell 2, serde(_json), log 0.4 | — | lockfile/build system |

### 2.3 React frontend (`frontend/src/`)

| File Path | Language | Primary Responsibility | Direct Imports | External Dependents |
|---|---|---|---|---|
| `main.tsx` | TS/TSX | Root render, `<Toaster/>`, i18n bootstrap, theme class application | react-dom, sonner, i18n, locales, preferencesStore, App | index.html entry |
| `App.tsx` | TSX | Health-gated shell composition; boot-failed listener; Welcome/Downloader modal control | stores, apiBase, CommandCenterLayout, WelcomeModal, ModelDownloaderModal, useBackendBootFailedListener, sonner | `__tests__/s34`, App.test |
| `components/layout/CommandCenterLayout.tsx` | TSX | v1.7 kiosk shell: fixed inset-0 grid 34/60, TopBar/Main/BottomBar wiring | TopBar, BottomStatusBar, DropZonePanel, QueuePanel, PreviewPanel | App |
| `TopBar.tsx` | TSX | Logo chip, brand image (153×34), theme/language/settings icon actions | lucide icons, preferencesStore, SettingsDialog, images | CommandCenterLayout |
| `BottomStatusBar.tsx` | TSX | Worker idle/busy · RAM from `/api/health` polling · version · Share placeholder toast · FeedbackButton | store, tooltip, sonner, apiBase, FeedbackButton | CommandCenterLayout |
| `DropZonePanel.tsx` / `QueuePanel.tsx` / `PreviewPanel.tsx` / `MarkdownPreview.tsx` | TSX | Panel shells implementing locked layout; queue rows w/ dot-status + retry; preview copy/open-folder (`invoke('open_output_folder')`) ; react-markdown GFM render | store(s), lib/formatBytes/fileKind/depthStyles/naming, ui/*, getSettings, tauri invoke | layout, panels tests, integration tests |
| `FileDropZone.tsx` | TSX | Drag/browse intake → validateFilesBatch → aggregated toast → store startUpload | fileValidation, scan2text.store, sonner, i18n | DropZonePanel |
| `SettingsDialog.tsx` / `ModelDownloaderModal.tsx` / `WelcomeModal.tsx` / `FeedbackDialog.tsx` / `FeedbackButton.tsx` | TSX | Settings CRUD via api.ts; download progress polling of /api/download/status; welcome dismissal; offline feedback submit; GForm shell-open | ui/dialog etc., lib/api, apiBase, plugin-shell, sonner | TopBar/App/BottomStatusBar |
| `hooks/useBackendBootFailedListener.ts` | TS | `listen('backend-boot-failed')` → toast/state | @tauri-apps/api/event, sonner, i18n | App |
| `lib/api.ts` | TS | Typed fetch client: uploadFile/getTaskStatus/pollTaskStatus/type guards/getHealth/get|saveSettings (+interfaces) | apiBase | stores, dialogs, panels, api.test |
| `lib/apiBase.ts` | TS | Base URL resolution (prod 127.0.0.1:47351 / dev '') | — | nearly all networked files |
| `lib/fileValidation.ts` | TS | 20 MB cap; PNG/JPG/JPEG/WEBP/PDF allowlist; batch split {validFiles,skippedFiles} | — | FileDropZone (+tests) |
| `lib/naming.ts` | TS | `generateOutputFilename(stem, ext, taken…)` `{stem}_{HHmm}_{yyyyMMdd}.md`, `_2/_3` collisions | — | Preview/copy flows, naming.test |
| `lib/preferences.ts` | TS | localStorage keys `scan2text:theme`/`scan2text:language`, browser-language detect, initial getters | — | preferencesStore, main/App/TopBar |
| `preferencesStore.ts` | TS | Zustand persisted theme/language; syncs via saveSettings | zustand, i18n, api.saveSettings | App/TopBar/panels |
| `scan2text.store.ts` | TS | Memory-only job state machine (see 02 §5): jobs/jobOrder/activeJobId, startUpload/pollJob/background loop/promoteNextPending/retryJob | zustand, api, progressManager, i18n, sonner | FDZ, QueuePanel, PreviewPanel, BottomStatusBar, App |
| `fileStore.ts` | TS | Lightweight selected-file persistence helper store | zustand | minor consumers/tests |
| `progressManager.ts` | TS | Simulated/deterministic progress ticking per jobId (global map) | — | scan2text.store (+tests) |
| `uploadService.ts` | TS | Batch uploadFiles() variant of /process POST | apiBase | guarded for future batch use (test-referenced) |
| `lib/i18n/index.ts` (`i18n/index.ts`) | TS | i18next + react-i18next init, EN/ID resource merge, `auto` language resolution | i18next, locales | whole UI, tests (`initI18n`) |
| `locales/en.json`, `locales/id.json` | JSON | All UI strings; parity enforced by resources.test | — | i18n runtime |
| `components/ui/*` (button/card/dialog/input/label/scroll-area/spinner/tooltip) | TSX | shadcn/Rix primitives (Radix) + CVA variants; ScrollArea neutralization hookups | radix packages, cn(utils) | every feature component |
| `lib/utils.ts` cn(), `depthStyles.ts`, `formatBytes.ts`, `fileKind.ts`, `cleanupObjectURLs.ts` | TS | styling/formatting utilities | clsx/tailwind-merge | panels/dialogs |
| `index.css`, `tailwind.config.js`, `postcss.config.js`, `theme/palette-lock.test.ts` | CSS/Tailwind v3 + test | Coffee&Paper token definitions, prose typography, scrollbar rules; palette-lock test asserts hex tokens | tailwind chain | global build; lock test prevents drift |
| Test files (`*.test.ts(x)` under src/**, plus `__tests__/s34-frontend-polish.test.tsx`, `theme/palette-lock.test.ts`) | Vitest | Unit/integration suites co-located per component/util/store | vitest, RTL, subjects above | CI/Vitest run (`npm run test`) |
| Configs: `vite.config.ts`, `vite.test.config.ts`, `tsconfig{,.app,.node}.json`, `package.json`, `components.json`, `.npmrc`, `.oxlintrc.json`, `index.html` | — | Build/test/lint toolchain and aliases (`@/ → src/`) | — | npm scripts, editors |

### 2.4 Repo-level infra

| File Path | Type | Responsibility | Dependents |
|---|---|---|---|
| `pyproject.toml` | TOML | Python package metadata + pins (fastapi≥0.115, uvicorn[standard], pydantic≥2.9, python-multipart, llama-cpp-python ≥0.3.7<0.4, pypdfium2≥4.30, pillow, requests, click, psutil; dev extras pytest/httpx/pytest-asyncio/pyinstaller) | pip builds, PyInstaller env |
| `pytest.ini`, `tests/conftest.py` + 21 `tests/test_*.py` | pytest | Backend suite (api surface, health, boot, packaging spec, noise filter, pdf crops/guards, status semantics, timeouts, vlm adapters…) | `py -3.12 -m pytest` |
| `packaging/scan2text-backend.spec` | PyInstaller spec | Freezes `src/scan2text/cli.py` → `backend/scan2text-backend.exe(+_internal)` | scripts/build-backend.ps1, test_packaging_spec.py |
| `scripts/build-backend.ps1` | PS | Runs PyInstaller spec into backend/ portable folder | release pipeline |
| `scripts/package-portable.ps1` | PS | npm build → `npx tauri build` → stage Thin (~81 MB)/Full (~1.1 GB) ZIPs incl. version.json; exclude logs/output/feedback (created empty) | GitHub Releases |
| `scripts/verify-portable.ps1`, `verify-fix66/deploy-fix66/verify-fix65d` | PS | Post-build smoke/layout verification & historical fix deployments | QA |
| `version.json` | JSON | Download manifest consumed at runtime by `ModelDownloaderService` (URLs/sha256/sizes for vlm.zip, mmproj.zip) | downloader service; required inside portable ZIPs |
| `dev.ps1`, `dev-web.ps1` | PS | Dev orchestration: backend uvicorn :8000 + Vite dev server parallel sessions | developers |
| `docs/*.md`, `second-brain/**` | Markdown | Prior architecture docs, ADRs, PRD, sprint/QA notes | humans/agents |
| `graphify-out/graph.json` | JSON | AST code-graph produced by `graphify . --code-only` | MCP/graph queries |
| `tools/prep_dummy_gdrive.py`, `tools/dummy_models/*` | util | Fake GGUF fixtures for local downloader testing | manual |

## 3. Source vs Runtime Artifacts

| Artifact | Produced by | Consumed by |
|---|---|---|
| `frontend/dist/` | `npm run build` (vite) | `tauri.conf.json frontendDist` |
| `frontend/src-tauri/target/` | cargo | bundled `Scan2Text.exe` |
| `packaging/dist/scan2text-backend/` | PyInstaller spec build | copied/staged as portable `backend/` |
| Portable root (`Scan2Text.exe` + `backend/` + `models/ output/ logs/ feedback/ settings.json version.json`) | `scripts/package-portable.ps1` | end user; **never** reference `dist/` as runtime path |
