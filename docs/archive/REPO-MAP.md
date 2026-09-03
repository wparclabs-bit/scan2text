# Repository Map

Live snapshot of tracked files (`git ls-files`) and directory structure. Component boundaries
derived from actual file tree, not draft inventories.

## Root

| Entry | Purpose |
|---|---|
| `README.md` | Product overview |
| `LICENSE` | Apache-2.0 license text |
| `NOTICE.md` | Third-party and model attributions |
| `version.json` | Update manifest consumed by the app updater |
| `pyproject.toml` | Python backend package and dependency definitions |
| `pytest.ini` | Backend test configuration |
| `.gitignore` | Excludes `models/`, `*.gguf`, `.dsh/`, build output, and local tooling state |
| `.graphifyignore` / `graphify-out/` | AST knowledge-graph tooling input/output (generated artifacts) |
| `dev.ps1` | Development launcher (shell + backend) |
| `dev-web.ps1` | Development launcher including the Vite dev server |
| `AGENTS.md` / `AGENTS-CTO.md` | Agent operating manuals (engineering rules; CTO-level view) |
| `second-brain/` | Internal Obsidian vault: PRD, ADRs, architecture docs, QA scripts, agent memory. Exposure is gated — see [GITHUB-READINESS.md](GITHUB-READINESS.md) |

> **Untracked files:** `deploy-fix65d.ps1`, `verify-fix65d.ps1`, `_check_structure.py`,
> `Lesson-Learned.md`, `backend/` (folder), `pastes/`, `scripts/`. These are not part of the
> committed source tree.

## `frontend/` — React + Tauri application

| Entry | Purpose |
|---|---|
| `index.html`, `src/main.tsx`, `src/App.tsx` | Entry chain |
| `src/index.css`, `tailwind.config.js`, `postcss.config.js` | Tailwind v3 theme pipeline |
| `components.json` | shadcn/ui generator configuration |
| `Images/` | Brand assets (`logo.png`, `text.png` wordmark, dropzone background) |
| `package.json`, `package-lock.json` | Dependency manifest and lockfile |

**Component map**

| Component | Role |
|---|---|
| `src/components/layout/CommandCenterLayout.tsx` | Viewport-locked three-panel shell |
| `src/components/layout/TopBar.tsx` | Brand image, theme/language/settings controls |
| `src/components/layout/BottomStatusBar.tsx` | Worker state, RAM, version, Share/Feedback actions |
| `src/components/layout/SettingsDialog.tsx` | Settings screen |
| `src/components/layout/WelcomeModal.tsx` | Welcome expectations screen (shown every launch until dismissed) |
| `src/components/layout/FeedbackButton.tsx` | GForm feedback button (left of Share in BottomBar) |
| `src/components/layout/FeedbackDialog.tsx` | Feedback dialog UI |
| `src/components/layout/ModelDownloaderModal.tsx` | Model download progress modal |
| `src/components/layout/panels/DropZonePanel.tsx` + `src/components/dropzone/FileDropZone.tsx` | Drop target and file validation |
| `src/components/layout/panels/QueuePanel.tsx` | FIFO queue rows, status dots, retry |
| `src/components/layout/panels/PreviewPanel.tsx` + `MarkdownPreview.tsx` | Read-only rendered Markdown preview |
| `src/components/ui/*` | shadcn/ui primitives (button, card, dialog, input, label, spinner, tooltip, scroll-area) |
| `src/stores/scan2text.store.ts` | Memory-only Zustand store: FIFO `jobOrder[]`, one active job |
| `src/stores/fileStore.ts` | File queue state store |
| `src/stores/preferencesStore.ts` | Theme + language persistence (localStorage only) |
| `src/lib/api.ts` | Backend HTTP client (process, status polling, health, settings) |
| `src/lib/naming.ts` | `generateOutputFilename()` — `{stem}_{HHmm}_{yyyyMMdd}.md` with collision suffixes |
| `src/lib/utils.ts` | Shared helpers |
| `src/hooks/useBackendBootFailedListener.ts` | Backend boot failure listener hook |
| `src/i18n/index.ts` | i18n initialization (EN + ID) |
| `src/locales/en.json`, `src/locales/id.json` | Translation files |
| `src-tauri/` | Tauri v2 shell: `src/backend_process.rs` (spawn/kill/self-heal), `src/lib.rs`, `src/main.rs`, `tauri.conf.json`, `capabilities/default.json`, icons. **Cargo.lock lives here** (`frontend/src-tauri/Cargo.lock`). |

## `src/scan2text/` — Python backend

| Module | Files | Responsibility |
|---|---|---|
| `api/` | `main.py`, `websocket_manager.py` | FastAPI app: `/process`, `/status/{task_id}`, `/api/health`, `/api/settings`, `/api/feedback/pending-count`; binds 127.0.0.1:47351 |
| `routes/` | `download.py`, `feedback.py`, `health.py`, `jobs.py`, `settings.py` | Route handlers (download, feedback, health, jobs, settings) |
| `models/` | `errors.py`, `job.py`, `ocr_result.py`, `settings.py` | Pydantic data contracts (`AppSettings`, `OCRJob`, results, error types) |
| `services/` | `model_downloader_service.py`, `logging_service.py`, `boot_guard.py` (root), `path_service.py`, `file_service.py`, `queue_service.py`, `output_service.py`, `postprocess_service.py`, `settings_service.py`, `update_service.py`, `feedback_service.py`, `pdf_service.py` | Core business logic: download, logging (with `PrivacyFilter`), boot guard, path resolution, file inspection, queue, output writing, postprocessing, settings, update check, feedback, PDF handling |
| `adapters/` | `ocr_engine.py`, `vlm_ocr.py` | OCR engine abstraction; `VlmOcrAdapter` — OvisOCR2 GGUF inference via llama-cpp-python; PDF page rendering via pypdfium2 |
| `utils/` | `cpu_budget.py`, `prod_runtime.py` | CPU thread budget calculation, production runtime helpers |
| Root files | `cli.py`, `smoke.py` | CLI entry point, smoke test helper |

> **Note:** `engine.py` was retired in S43. It appears only in `__pycache__/` and historical git
> history. No live imports reference it.

## `tests/` — backend test suite

Flat pytest layout with shared fixtures in `conftest.py`. Coverage spans the API surface, services,
portable-root resolution, settings persistence, boot guard, CLI startup, logging, and the VLM
adapter (including PDF page rendering and chart crops). Real inference is replaced by fakes so
tests stay offline and deterministic.

**Structure:**

| Directory | Contents |
|---|---|
| `tests/` (root) | API surface tests (`test_api.py`, `test_api_download.py`, `test_api_feedback.py`, `test_api_surface.py`), boot guard, CLI, health, noise filter, packaging spec, PDF chart crops, PDF guard settings, S38 backend fixes, status semantics, timeout autoscale, VLM OCR |
| `tests/unit/` | Error mapping, file naming, prod runtime, settings validation, version comparison |
| `tests/unit/services/` | Feedback, file, logging, model downloader, models dir priority, output, path service (frozen + models resolution), postprocess, queue, settings services |
| `tests/unit/adapters/` | VLM OCR routing |
| `tests/integration/` | Batch processing, output generation, PDF handling, queue service |

Run with: `py -3.12 -m pytest -q --tb=line` (set `$env:PYTHONPATH="src"` when running from the repo
root). Frontend tests: `npm run test` (Vitest).

## Packaging, scripts, tooling

| Entry | Purpose |
|---|---|
| `packaging/scan2text-backend.spec` | PyInstaller spec producing the folder artifact deployed as `backend/` |
| `dev.ps1`, `dev-web.ps1` | Local development launchers |
| `graphify` + `graphify-out/` | Codebase knowledge graph used for navigation and audits |
| `frontend/src-tauri/tauri.conf.json` | Tauri bundle configuration for the desktop shell |
