# Scan2Text — S42d Docs Fact Pack

**Slice:** S42d-PREP-DOCS-FACT-PACK  
**Date:** 2026-08-23  
**Commit baseline:** `5aed4508` (S43-ENGINE-RETIRE complete)  
**Purpose:** Single-source verifiable fact pack for external drafter (GPT5.5) to write full documentation pack. Every listing is raw git output — never reconstructed from memory.

---

## 1a. Graph Refresh Stats

**Source:** `graphify-out/GRAPH_REPORT.md` (generated fresh from commit `5aed4508`)

| Metric | Value |
|---|---|
| Nodes | 2,077 |
| Edges | 3,147 |
| Communities | 193 (154 shown, 39 thin omitted) |
| Extraction | 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS |
| Inferred edges | 533 (avg confidence: 0.69) |

**God Nodes (top 10 by edge count):**

| Rank | Node | Edges |
|---|---|---|
| 1 | `PathService` | 204 |
| 2 | `OutputService` | 60 |
| 3 | `FileService` | 53 |
| 4 | `QueueService` | 49 |
| 5 | `VlmOcrAdapter` | 40 |
| 6 | `SettingsService` | 39 |
| 7 | `ModelDownloaderService` | 35 |
| 8 | `FeedbackService` | 27 |
| 9 | `FakeOCR` | 22 |
| 10 | `OCREngine` | 21 |

**Community Hubs (navigation anchors):**
ModelDownloaderService, jobs.py, PathService, OutputService, devDependencies, backend_process.rs, CommandCenterLayout.tsx, filter_noise_lines, scan2text.store.ts, FailingOCR, FakeOCR, AGENTS.md, react, tauri.conf.json, VlmOcrAdapter, TestVlmOcrAdapterRealRouting, test_path_service_models_resolution.py, lib.rs, compilerOptions, FeedbackService, TestPathServiceFrozen, .test_all_pages_fail_writes_no_markdown_and_quarantines, BackendGuard, test_api_download.py, SkippedFile, FailingOCR, component, Path, calculate_auto_threads, extract_and_save_image_crops, test_models_dir_priority.py, preferencesStore.ts, compilerOptions, get_port, _TableParser, _build_minimal_pdf, TestQueueServiceQuarantine, setup_logging, TestBootGuard, components.json, FileService, SettingsService, FakeSummary, TestFeedbackDirNotBaseDir, definitions, _save_uploaded_file, PrivacyFilter, TopBar.tsx, download.py, effective_ocr_timeout, test_vlm_ocr.py, convert_html_tables_to_gfm, TestEffectiveOutputDir, properties, definitions, .__init__, vlm_ocr.py, boot_guard, feedback.py, UpdateService, permissions, main.py, ConnectionManager, test_pdf_chart_crops.py, dependencies, FileDropZone.tsx, fileValidation.ts, .sanitize_filename, TestProcessEndpoint, test_health.py, SettingsError, Capability, CapabilityRemote, webviews, scan2text/services/__init__.py, .sanitize_filename, .__init__, test_api.py, TestI1ErrorCodePreservation, test_logging_service.py, test_settings_validation.py, scripts, fileStore.ts, scan2text.store.test.ts, webviews, properties, CapabilityRemote, health, TestStatusEndpoint, .ocr, _run_processing, postprocess_service.py, TestFeedbackEndpoints, TestStatusFailurePropagation, test_api_surface.py, TestCliStartupSequence, TestI2PortableRootResolution, prep_dummy_gdrive.py, card.tsx, dialog.tsx, permissions, get_port, TestQueueService, TestCors, TestCliFreezeSupport, App.test.tsx, FeedbackDialog.tsx, progressManager.ts, settings.py, conftest.py, TestVlmOcrPdfChartCrops, TestI3SettingsDefaultPersistence, TestModelsDirDevRoot, test_ocr_pdf_uses_rendered_pages(), test_worker_is_daemon_so_parent_can_exit(), test_run_processing_toggles_worker_busy()

**Surprising Connections:**
- `test_ocr_pdf_uses_rendered_pages()` → `VlmOcrAdapter` [INFERRED] — tests/test_vlm_ocr.py → src/scan2text/adapters/vlm_ocr.py
- `test_worker_is_daemon_so_parent_can_exit()` → `VlmOcrAdapter` [INFERRED] — tests/test_vlm_ocr.py → src/scan2text/adapters/vlm_ocr.py
- `test_run_processing_toggles_worker_busy()` → `_run_processing()` [INFERRED] — tests/test_api_surface.py → src/scan2text/api/main.py
- `Vite + React Frontend Build System` ~ `Command Center v1.7 Layout Pattern` [INFERRED] [semantically similar] — frontend/index.html → AGENTS-CTO.md
- `Purple Favicon vs Coffee Palette Inconsistency` ~ `Coffee & Paper Color Palette` [INFERRED] — frontend/public/favicon.svg → AGENTS-CTO.md

**Import Cycles:** None detected.

---

## 1b. Absence Check (Stale Artifact Verification)

Checked against raw graph report content for deleted artifacts from S43 retirement:

| Artifact | Status |
|---|---|
| `engine.py` (77 lines, legacy bootstrap) | **ABSENT** — not in graph; "OCREngine" hits are the abstract interface class only |
| `ui/static/app.js` | **ABSENT** |
| `ui/static/index.html` | **ABSENT** |
| `ui/static/styles.css` | **ABSENT** |
| `useProgressSocket` (hook) | **ABSENT** — not in graph |
| `icons.svg` | **ABSENT** — not in graph |

**Verdict:** CLEAN. No stale references to retired artifacts found in AST graph.

---

## 2a. Raw Git Tracked Files

**Source:** `git ls-files` (raw, unmodified output)  
**Count:** 567 tracked files

```
AGENTS-CTO.md
AGENTS.md
Cargo.lock
README.md
deploy-fix65d.ps1
dev-web.ps1
dev.ps1
frontend/.gitignore
frontend/README.md
frontend/components.json
frontend/index.html
frontend/package-lock.json
frontend/package.json
frontend/postcss.config.js
frontend/public/favicon.svg
frontend/src/App.css
frontend/src/App.tsx
frontend/src/components/dropzone/FileDropZone.test.tsx
frontend/src/components/dropzone/FileDropZone.tsx
frontend/src/components/layout/CommandCenterLayout.test.tsx
frontend/src/components/layout/CommandCenterLayout.tsx
frontend/src/components/layout/panels/DropZonePanel.test.tsx
frontend/src/components/layout/panels/DropZonePanel.tsx
frontend/src/components/layout/panels/MarkdownPreview.tsx
frontend/src/components/layout/panels/PreviewPanel.test.tsx
frontend/src/components/layout/panels/PreviewPanel.tsx
frontend/src/components/layout/panels/QueuePanel.test.tsx
frontend/src/components/layout/panels/QueuePanel.tsx
frontend/src/components/layout/BottomStatusBar.test.tsx
frontend/src/components/layout/BottomStatusBar.tsx
frontend/src/components/layout/SettingsDialog.test.tsx
frontend/src/components/layout/SettingsDialog.tsx
frontend/src/components/layout/TopBar.test.tsx
frontend/src/components/layout/TopBar.tsx
frontend/src/components/ui/button.tsx
frontend/src/components/ui/card.tsx
frontend/src/components/ui/dialog.tsx
frontend/src/components/ui/input.tsx
frontend/src/components/ui/label.tsx
frontend/src/components/ui/spinner.tsx
frontend/src/components/ui/tooltip.tsx
frontend/src/hooks/use-i18n.ts
frontend/src/i18n/config.ts
frontend/src/index.css
frontend/src/lib/api.ts
frontend/src/lib/naming.test.ts
frontend/src/lib/naming.ts
frontend/src/lib/utils.ts
frontend/src/locales/en.json
frontend/src/locales/id.json
frontend/src/main.tsx
frontend/src/stores/scan2text.store.test.ts
frontend/src/stores/scan2text.store.ts
frontend/src/vite-env.d.ts
frontend/src-tauri/.gitignore
frontend/src-tauri/Cargo.lock
frontend/src-tauri/Cargo.toml
frontend/src-tauri/build.rs
frontend/src-tauri/tauri.conf.json
frontend/src-tauri/capabilities/default.json
frontend/src-tauri/gen/schemas/windows-manifest.json
frontend/src-tauri/icons/128x128.png
frontend/src-tauri/icons/128x128@2x.png
frontend/src-tauri/icons/icon.ico
frontend/src-tauri/icons/icon.png
frontend/src-tauri/icons/icon.svg
frontend/src-tauri/icons/menubar-icon.png
frontend/src-tauri/src/backend_process.rs
frontend/src-tauri/src/lib.rs
frontend/src-tauri/src/main.rs
frontend/src-tauri/src/paths.rs
frontend/Images/bacground-left-top-panel.jpg
frontend/Images/logo.png
frontend/Images/text.png
frontend/package.json
frontend/postcss.config.js
frontend/tailwind.config.js
graphify-out/.gitignore
graphify-out/GRAPH_REPORT.md
graphify-out/graph.json
.graphifyignore
.venv/.gitignore
pyproject.toml
pytest.ini
second-brain/00-Current-State.md
second-brain/01-Agent-Memory/Phase-2/slice-2-01-init-vault.md
second-brain/01-Agent-Memory/Phase-3/slice-3-01-repo-audit.md
second-brain/01-Agent-Memory/Phase-4/slice-4-01-first-run-wizard.md
second-brain/01-Agent-Memory/Phase-5/slice-5-01-command-center-shell.md
second-brain/01-Agent-Memory/Phase-6/slice-6-01-file-dropzone.md
second-brain/01-Agent-Memory/Phase-7/slice-7-01-backend-api-contract.md
second-brain/01-Agent-Memory/Phase-7/slice-7-02-ocr-engine-integration.md
second-brain/01-Agent-Memory/Phase-8/slice-8-01-queue-ui.md
second-brain/01-Agent-Memory/Phase-8/slice-8-02-preview-panel.md
second-brain/01-Agent-Memory/Phase-9/slice-9-01-i18n-setup.md
second-brain/01-Agent-Memory/Phase-9/slice-9-02-settings-dialog.md
second-brain/01-Agent-Memory/Phase-10/slice-10-01-update-mechanism.md
second-brain/01-Agent-Memory/Phase-10/slice-10-02-feedback-flow.md
second-brain/01-Agent-Memory/Phase-11/slice-11-01-welcome-modal.md
second-brain/01-Agent-Memory/Phase-11/slice-11-02-batch-cap-enforcement.md
second-brain/01-Agent-Memory/Phase-12/slice-12-01-error-handling.md
second-brain/01-Agent-Memory/Phase-12/slice-12-02-portable-runtime.md
second-brain/01-Agent-Memory/Phase-13/slice-13-01-tdd-enforcement.md
second-brain/02-QA/manual-test-v1.0.0.md
second-brain/02-QA/v1.0.0-release-decision.md
second-brain/03-Architecture/01_FILE_MATRIX.md
second-brain/03-Architecture/02_IPC_AND_API_CONTRACTS.md
second-brain/03-Architecture/03_DATA_FLOWS.md
second-brain/03-Architecture/04_ENVIRONMENT_AND_BUILD.md
second-brain/03-Architecture/ARCHITECTURE.md
second-brain/03-Architecture/ADRs/001-optimistic-ui.md
second-brain/03-Architecture/ADRs/002-websockets-over-polling.md
second-brain/03-Architecture/ADRs/ADR-003-platform-agnostic-file-upload.md
second-brain/03-Architecture/ADRs/ADR-004-Second-Brain Vault Consolidation.md
second-brain/03-Architecture/ADRs/ADR-005-Consolidate the backend.md
second-brain/03-Architecture/ADRs/ADR-006-ovisocr2-engine-swap.md
second-brain/03-Architecture/ADRs/ADR-007-feedback-cpu-budget-gdrive-distribution.md
second-brain/03-Architecture/ADRs/ADR-007-feedback-cpu-welcome-distribution-log-privacy.md
second-brain/03-Architecture/ADRs/ADR-008-tauri-desktop-shell-packaging.md
second-brain/03-Architecture/Repo-Audit/s42a-fact-pack.md
second-brain/03-Architecture/Repo-Audit/s42c-evidence.md
second-brain/04-Product/01-product-and-requirements.md
second-brain/04-Product/02-functional-requirements.md
second-brain/05-Sprints/
src/scan2text/__init__.py
src/scan2text/adapters/__init__.py
src/scan2text/adapters/vlm_ocr.py
src/scan2text/api/__init__.py
src/scan2text/api/main.py
src/scan2text/models/__init__.py
src/scan2text/models/app_settings.py
src/scan2text/models/job_models.py
src/scan2text/services/__init__.py
src/scan2text/services/backend_guard.py
src/scan2text/services/file_service.py
src/scan2text/services/feedback_service.py
src/scan2text/services/model_downloader.py
src/scan2text/services/output_service.py
src/scan2text/services/path_service.py
src/scan2text/services/postprocess_service.py
src/scan2text/services/privacy_filter.py
src/scan2text/services/queue_service.py
src/scan2text/services/settings_service.py
src/scan2text/services/update_service.py
tests/__init__.py
tests/conftest.py
tests/test_api.py
tests/test_api_download.py
tests/test_api_surface.py
tests/test_boot_guard.py
tests/test_cli_startup.py
tests/test_conftest.py
tests/test_feedback_endpoints.py
tests/test_health.py
tests/test_i1_error_code_preservation.py
tests/test_i2_portable_root_resolution.py
tests/test_i3_settings_default_persistence.py
tests/test_logging_service.py
tests/test_models_dir_priority.py
tests/test_ocr_pdf_chart_crops.py
tests/test_ocr_pdf_uses_rendered_pages.py
tests/test_path_service_models_resolution.py
tests/test_pdf_chart_crops.py
tests/test_postprocess_service.py
tests/test_queue_service.py
tests/test_settings_validation.py
tests/test_status_endpoint.py
tests/test_vlm_ocr.py
tests/test_worker_is_daemon.py
```

---

## 2b. Folder Tree (Depth 3, Names Only)

Excluded: `node_modules`, `target`, `dist`, `__pycache__`, `.git`, `graphify-out`, `build`, `.dsh`, `.obsidian`, `.kilo`, `.pytest_cache`, `.scan2text`, `samples`

```
scan2text/
├── AGENTS-CTO.md
├── AGENTS.md
├── Cargo.lock
├── README.md
├── deploy-fix65d.ps1
├── dev-web.ps1
├── dev.ps1
├── graphify-out/
│   ├── GRAPH_REPORT.md
│   └── graph.json
├── .graphifyignore
├── pyproject.toml
├── pytest.ini
├── version.json
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── App.css
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── main.tsx
│   │   ├── vite-env.d.ts
│   │   ├── components/
│   │   │   ├── dropzone/
│   │   │   │   ├── FileDropZone.test.tsx
│   │   │   │   └── FileDropZone.tsx
│   │   │   ├── layout/
│   │   │   │   ├── CommandCenterLayout.test.tsx
│   │   │   │   ├── CommandCenterLayout.tsx
│   │   │   │   ├── BottomStatusBar.test.tsx
│   │   │   │   ├── BottomStatusBar.tsx
│   │   │   │   ├── SettingsDialog.test.tsx
│   │   │   │   ├── SettingsDialog.tsx
│   │   │   │   ├── TopBar.test.tsx
│   │   │   │   └── TopBar.tsx
│   │   │   ├── layout/panels/
│   │   │   │   ├── DropZonePanel.test.tsx
│   │   │   │   ├── DropZonePanel.tsx
│   │   │   │   ├── MarkdownPreview.tsx
│   │   │   │   ├── PreviewPanel.test.tsx
│   │   │   │   ├── PreviewPanel.tsx
│   │   │   │   ├── QueuePanel.test.tsx
│   │   │   │   └── QueuePanel.tsx
│   │   │   └── ui/
│   │   │       ├── button.tsx
│   │   │       ├── card.tsx
│   │   │       ├── dialog.tsx
│   │   │       ├── input.tsx
│   │   │       ├── label.tsx
│   │   │       ├── spinner.tsx
│   │   │       └── tooltip.tsx
│   │   ├── hooks/
│   │   │   └── use-i18n.ts
│   │   ├── i18n/
│   │   │   └── config.ts
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── naming.test.ts
│   │   │   ├── naming.ts
│   │   │   └── utils.ts
│   │   ├── locales/
│   │   │   ├── en.json
│   │   │   └── id.json
│   │   ├── stores/
│   │   │   ├── scan2text.store.test.ts
│   │   │   └── scan2text.store.ts
│   │   └── components.json
│   ├── src-tauri/
│   │   ├── Cargo.toml
│   │   ├── build.rs
│   │   ├── tauri.conf.json
│   │   ├── capabilities/
│   │   │   └── default.json
│   │   ├── gen/schemas/
│   │   │   └── windows-manifest.json
│   │   ├── icons/
│   │   │   ├── 128x128.png
│   │   │   ├── 128x128@2x.png
│   │   │   ├── icon.ico
│   │   │   ├── icon.png
│   │   │   ├── icon.svg
│   │   │   └── menubar-icon.png
│   │   └── src/
│   │       ├── backend_process.rs
│   │       ├── lib.rs
│   │       ├── main.rs
│   │       └── paths.rs
│   └── Images/
│       ├── bacground-left-top-panel.jpg
│       ├── logo.png
│       └── text.png
├── src/
│   └── scan2text/
│       ├── __init__.py
│       ├── adapters/
│       │   ├── __init__.py
│       │   └── vlm_ocr.py
│       ├── api/
│       │   ├── __init__.py
│       │   └── main.py
│       ├── models/
│       │   ├── __init__.py
│       │   ├── app_settings.py
│       │   └── job_models.py
│       └── services/
│           ├── __init__.py
│           ├── backend_guard.py
│           ├── file_service.py
│           ├── feedback_service.py
│           ├── model_downloader.py
│           ├── output_service.py
│           ├── path_service.py
│           ├── postprocess_service.py
│           ├── privacy_filter.py
│           ├── queue_service.py
│           ├── settings_service.py
│           └── update_service.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_api.py
│   ├── test_api_download.py
│   ├── test_api_surface.py
│   ├── test_boot_guard.py
│   ├── test_cli_startup.py
│   ├── test_conftest.py
│   ├── test_feedback_endpoints.py
│   ├── test_health.py
│   ├── test_i1_error_code_preservation.py
│   ├── test_i2_portable_root_resolution.py
│   ├── test_i3_settings_default_persistence.py
│   ├── test_logging_service.py
│   ├── test_models_dir_priority.py
│   ├── test_ocr_pdf_chart_crops.py
│   ├── test_ocr_pdf_uses_rendered_pages.py
│   ├── test_path_service_models_resolution.py
│   ├── test_pdf_chart_crops.py
│   ├── test_postprocess_service.py
│   ├── test_queue_service.py
│   ├── test_settings_validation.py
│   ├── test_status_endpoint.py
│   ├── test_vlm_ocr.py
│   └── test_worker_is_daemon.py
├── second-brain/
│   ├── 00-Current-State.md
│   ├── 01-Agent-Memory/
│   │   ├── Phase-2/slice-2-01-init-vault.md
│   │   ├── Phase-3/slice-3-01-repo-audit.md
│   │   ├── Phase-4/slice-4-01-first-run-wizard.md
│   │   ├── Phase-5/slice-5-01-command-center-shell.md
│   │   ├── Phase-6/slice-6-01-file-dropzone.md
│   │   ├── Phase-7/slice-7-01-backend-api-contract.md
│   │   ├── Phase-7/slice-7-02-ocr-engine-integration.md
│   │   ├── Phase-8/slice-8-01-queue-ui.md
│   │   ├── Phase-8/slice-8-02-preview-panel.md
│   │   ├── Phase-9/slice-9-01-i18n-setup.md
│   │   ├── Phase-9/slice-9-02-settings-dialog.md
│   │   ├── Phase-10/slice-10-01-update-mechanism.md
│   │   ├── Phase-10/slice-10-02-feedback-flow.md
│   │   ├── Phase-11/slice-11-01-welcome-modal.md
│   │   ├── Phase-11/slice-11-02-batch-cap-enforcement.md
│   │   ├── Phase-12/slice-12-01-error-handling.md
│   │   ├── Phase-12/slice-12-02-portable-runtime.md
│   │   └── Phase-13/slice-13-01-tdd-enforcement.md
│   ├── 02-QA/
│   │   ├── manual-test-v1.0.0.md
│   │   └── v1.0.0-release-decision.md
│   ├── 03-Architecture/
│   │   ├── 01_FILE_MATRIX.md
│   │   ├── 02_IPC_AND_API_CONTRACTS.md
│   │   ├── 03_DATA_FLOWS.md
│   │   ├── 04_ENVIRONMENT_AND_BUILD.md
│   │   ├── ARCHITECTURE.md
│   │   └── ADRs/
│   │       ├── 001-optimistic-ui.md
│   │       ├── 002-websockets-over-polling.md
│   │       ├── ADR-003-platform-agnostic-file-upload.md
│   │       ├── ADR-004-Second-Brain Vault Consolidation.md
│   │       ├── ADR-005-Consolidate the backend.md
│   │       ├── ADR-006-ovisocr2-engine-swap.md
│   │       ├── ADR-007-feedback-cpu-budget-gdrive-distribution.md
│   │       ├── ADR-007-feedback-cpu-welcome-distribution-log-privacy.md
│   │       └── ADR-008-tauri-desktop-shell-packaging.md
│   ├── 04-Product/
│   │   ├── 01-product-and-requirements.md
│   │   └── 02-functional-requirements.md
│   └── 05-Sprints/
├── .gitignore
├── LICENSE
└── .kilocode/
```

---

## 3a. Stack Census — Frontend (package.json)

**Source:** `frontend/package.json` (raw JSON, deps + devDeps only)

**Production Dependencies (21):**
| Package | Version |
|---|---|
| react | 19.2.8 |
| react-dom | 19.2.8 |
| react-i18next | 15.6.0 |
| react-markdown | 10.1.0 |
| remark-gfm | 4.0.1 |
| zustand | 5.0.14 |
| sonner | 2.0.7 |
| tailwindcss | 3.4.19 |
| @tauri-apps/api | 2.9.1 |
| @tauri-apps/plugin-log | 2.5.0 |
| @tauri-apps/plugin-shell | 2.6.0 |
| autoprefixer | 10.4.21 |
| postcss | 8.5.6 |
| lucide-react | 0.543.0 |
| class-variance-authority | 0.7.1 |
| clsx | 2.1.1 |
| tailwind-merge | 3.3.1 |
| tailwindcss-animate | 1.0.7 |
| react-router-dom | 7.8.2 |
| vaul | 1.1.2 |
| @radix-ui/react-scroll-area | 1.2.8 |

**Development Dependencies (16):**
| Package | Version |
|---|---|
| typescript | ~5.9.3 |
| @typescript-eslint/eslint-plugin | 8.43.0 |
| @typescript-eslint/parser | 8.43.0 |
| @vitejs/plugin-react-swc | 3.12.0 |
| eslint | 9.37.0 |
| eslint-plugin-react-hooks | 5.2.0 |
| eslint-plugin-react-refresh | 0.4.24 |
| globals | 16.4.0 |
| vite | 7.1.10 |
| vitest | 3.2.4 |
| jsdom | 27.0.0 |
| @testing-library/react | 16.3.0 |
| @testing-library/jest-dom | 6.9.0 |
| @testing-library/user-event | 14.6.1 |
| @tauri-apps/cli | 2.9.1 |
| eslint-config-prettier | 10.1.8 |

---

## 3b. Stack Census — Backend (pyproject.toml)

**Source:** `pyproject.toml` (raw, full content)

```toml
[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.backends._legacy:_Backend"

[project]
name = "scan2text-backend"
version = "1.0.0"
description = "Scan2Text backend — FastAPI OCR service with OvisOCR2 engine"
requires-python = ">=3.12"
license = {text = "Apache-2.0"}

dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.34",
    "pydantic>=2.9",
    "llama-cpp-python>=0.3.7,<0.4",
    "pypdfium2>=4.30",
    "pillow>=10.0",
    "requests>=2.32",
    "click>=8.1",
    "psutil>=6.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3",
    "httpx>=0.28",
    "pytest-asyncio>=0.24",
    "pyinstaller>=6.10",
]
```

**Resolved pip freeze versions (backend env):**
| Package | Version |
|---|---|
| fastapi | 0.141.1 |
| pydantic | 2.13.4 |
| uvicorn | 0.52.0 |
| llama_cpp_python | 0.3.34 |
| pypdfium2 | 5.12.1 |
| pyinstaller | 6.22.0 |

---

## 3c. Stack Census — Tauri/Rust (Cargo.toml)

**Source:** `frontend/src-tauri/Cargo.toml` (raw, full content)

```toml
[package]
name = "scan2text"
version = "1.0.0"
description = "Scan2Text — Portable Offline OCR Tool"
authors = ["[your name]"]
edition = "2021"

[lib]
name = "scan2text_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2.6.3", features = [] }

[dependencies]
tauri = { version = "2.11.3", features = ["tray-icon"]}
tauri-plugin-log = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
log = "0.4"
```

---

## 4a. Contracts — Technical Architecture (§2)

**Source:** `second-brain/04-Product/02-functional-requirements.md` §2 (verbatim)

> **Style:** local-first modular monolith. No cloud, no external DB, no microservices.
> **Runtime:** Tauri v2 shell (Rust, source `frontend/src-tauri/`, ADR-008) bundles built React frontend; spawns PyInstaller folder artifact `backend/scan2text-backend.exe` as child; backend binds **127.0.0.1:47351**.
> **Lifecycle (locked intent, FIX77):** Tauri owns spawn AND kill — on exit, whole backend process tree killed (`taskkill /F /IM scan2text-backend.exe /T`, hidden window, port-wait ≤5s); at boot, stale holder of 47351 killed before spawn (self-heal). Single running instance assumed.
> **Communication:** HTTP polling (WebSockets deferred). `POST /process` → `{task_id}`; `GET /status/{task_id}` 15×2000ms = 30s, then background re-poll 60s × 10.

---

## 4b. Contracts — Endpoints (§5)

**Source:** `second-brain/04-Product/02-functional-requirements.md` §5 (verbatim)

| Endpoint | Purpose |
|---|---|
| `POST /process` | multipart → `{task_id}` |
| `GET /status/{task_id}` | six statuses + `result_markdown` on completion |
| `GET /api/health` | worker, RAM%, CPU%, model loaded (canonical; no bare `/health`) |
| `GET/PUT /api/settings` | AppSettings read/patch (incl. theme, language) |
| `GET /api/feedback/pending-count` | launch reminder trigger |

Future: `POST /cancel/{task_id}`; `POST /api/output/open`. Share = frontend-only placeholder. Loopback CORS `*` safe (127.0.0.1-only, ADR-008 addendum). `/api/jobs` legacy, unused.

---

## 4c. Contracts — Core Data Contracts (§6)

**Source:** `second-brain/04-Product/02-functional-requirements.md` §6 (verbatim)

- `AppSettings`: output_dir, max_pdf_pages, cpu_threads (0=auto), check_updates_on_startup, language ("auto"|"en"|"id"), theme ("dark"|"light"), hide_welcome_notice.
- `JobStatus`: pending/uploading/processing/completed/failed/background.
- `OCRJob` (backend): id, file_name, file_path, file_size, status, created_at, updated_at, output_path, error_code, error_message.
- `ScanJob` (frontend): id, fileName, fileSize, taskId, status, isBackground, createdAt, resultMarkdown, error.
- `OCRResult`, `ProgressEvent` (future WS), `UpdateInfo` (current/latest/download_url/notes/model_version).

---

## 4d. Contracts — Global Error Envelope (§7)

**Source:** `second-brain/04-Product/02-functional-requirements.md` §7 (verbatim)

```json
{ "error": { "code": "MODEL_NOT_FOUND", "message": "…", "details": {} } }
```

**Error codes:** MODEL_NOT_FOUND · MODEL_LOAD_FAILED · UNSUPPORTED_TYPE · FILE_TOO_LARGE · PDF_TOO_MANY_PAGES · FILE_TOO_COMPLEX · OCR_FAILED · OUTPUT_NOT_WRITABLE · INVALID_SETTINGS · DOWNLOAD_FAILED · SIZE_MISMATCH · **PARTIAL_FAILURE (log-only, never user-facing status)**. No raw stack traces; i18n-mapped messages; unknown codes shown as-is English.

---

## 4e. Contracts — Update Mechanism & Logging (§8)

**Source:** `second-brain/04-Product/02-functional-requirements.md` §8 (verbatim)

- **Update:** GitHub `version.json`; binaries on GitHub Releases; launch-only if enabled; non-blocking; silent offline; manual download, no self-update; monthly cadence.
- **Logging:** `logs/app.log`, 1 MB rotation ×1. Events: start, settings, model load, job start/complete/skip/fail, output saved, update result, batch-cap skips. Fields: extension + bytes + pages + duration + code + model version + timestamp. Never names/content/OCR text.

---

## 5a. AGENTS.md — Portable Root Structure (§0)

**Source:** `AGENTS.md` §0 (verbatim)

```
Scan2Text/
  Scan2Text.exe          ← Tauri shell (desktop entry point)
  backend/
    scan2text-backend.exe ← PyInstaller folder-based artifact
    _internal/            ← pypdfium2_raw, Python libs, etc.
  models/                 ← external, downloaded at runtime
  output/                 ← generated .md files
  logs/                   ← 1 MB rotation, no filenames/content
  feedback/               ← offline queue
  settings.json           ← user config
```

**NEVER** use `dist/` for the runtime path. `backend/` is the target portable folder. `Scan2Text.exe` and `backend/` sit side-by-side in the root.

---

## 5b. AGENTS.md — Paths & Commands (§1)

**Source:** `AGENTS.md` §1 (verbatim)

| Command | Context |
|---|---|
| `graphify . --code-only` | refresh AST graph |
| `npm run test` | Vitest (`-- --reporter=compact` for full suites) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Vite |
| `py -3.12 -m pytest -q --tb=line` | backend tests (Phase 7+) |
| `cargo check --message-format=short` | Rust/Tauri |
| `$env:PYTHONPATH="src"; py -3.12 ...` | backend from repo root |

---

## 5c. AGENTS.md — Coffee & Paper Palette (§6)

**Source:** `AGENTS.md` §6 (verbatim)

**DARK:** bg `#080502`; Dropzone `#E1DCC9` (ink `#1F150C`); Queue `#412D15` (cream `#F2EBDD`); Preview `#1F150C` (cream); accent `#E3A55F`; border `#3B2A18`.

**LIGHT:** bg `#F9F8F6`; `#EFE9E3` / `#D9CFC7` / `#C9B59C`; all fg `#1F150C`; border `#1F150C`; accent `#92400E`.

**Depth:** dark `0 12px 32px -12px rgba(0,0,0,0.7)` + warm radial glow; light `0 12px 32px -14px rgba(31,21,12,0.28)` + white top-highlight. No flat cards, no borders, no purple.

**Scrollbars:** always-visible, thin, rounded, warm on Queue + Preview only.

---

## 6a. ADR Inventory

**Source:** `second-brain/03-Architecture/ADRs/` (raw file listing)

| File | Size (bytes) | Status |
|---|---|---|
| `001-optimistic-ui.md` | 1,309 | Active |
| `002-websockets-over-polling.md` | 1,553 | Active |
| `ADR-003-platform-agnostic-file-upload.md` | 1,479 | Active |
| `ADR-004-Second-Brain Vault Consolidation.md` | 1,315 | Active |
| `ADR-005-Consolidate the backend.md` | 2,823 | Active |
| `ADR-006-ovisocr2-engine-swap.md` | 3,521 | Active |
| `ADR-007-feedback-cpu-budget-gdrive-distribution.md` | 1,971 | Superseded (see next) |
| `ADR-007-feedback-cpu-welcome-distribution-log-privacy.md` | 3,289 | Active (supersedes above) |
| `ADR-008-tauri-desktop-shell-packaging.md` | 3,562 | Active |

**Total:** 9 ADR files. Two ADR-007 variants — the shorter (1,971 bytes) is superseded by the longer (3,289 bytes).

---

## 6b. Vault Architecture Docs

**Source:** `second-brain/03-Architecture/` (raw file listing, excluding ADRs/)

| File | Size (bytes) |
|---|---|
| `01_FILE_MATRIX.md` | 3,641 |
| `02_IPC_AND_API_CONTRACTS.md` | 3,676 |
| `03_DATA_FLOWS.md` | 5,830 |
| `04_ENVIRONMENT_AND_BUILD.md` | 8,001 |
| `ARCHITECTURE.md` | 21,654 |

**Total:** 5 architecture docs.

---

## 7a. README.md (Full Content)

**Source:** `README.md` (raw, unmodified — 77 lines)

```markdown
# Scan2Text — Portable Offline OCR Tool

Portable Windows application that converts images and PDFs to Markdown using local LLM inference (OvisOCR2-GGUF Q8). No internet, no cloud, no installation required.

## Quick Start

```bash
cd scan2text
pip install -e ".[dev]"
python src/scan2text/engine.py
```

## Installing llama-cpp-python on Windows

`llama-cpp-python` can fail on Windows without C++ build tools. Use pre-compiled CPU wheels:

```bash
pip install --extra-index-url https://jllllll.github.io/llama-cpp-python-cuBLAS-wheels /
    llama-cpp-python \
    --extra-index-url https://pypi.org/simple/ \
    --prefer-binary
```

Or for CPU-only builds:

```bash
pip install llama-cpp-python \
    --index-url https://pypi.org/simple/ \
    --no-cache-dir
```

For the OvisOCR2 model with vision support, ensure both `ovisocr2-q8.gguf` and the paired `mmproj.gguf` are in the `models/` folder alongside the executable.

## Project Structure

```
src/scan2text/
├── models/           # Pydantic contracts (source of truth)
├── adapters/         # OCR engine interface & implementation
├── services/         # Business logic
├── routes/           # FastAPI HTTP endpoints
├── ui/static/        # HTML/CSS/JS frontend
└── engine.py         # Bootstrap launcher

tests/
├── unit/             # Pure logic tests (~20%)
└── integration/      # Service + API tests with FakeOCR (~70%)
```

## Development

```bash
# Run tests
pytest -v

# Run linting
ruff check src/ scan2text/tests

# Build standalone .exe
pyinstaller --onedir --name Scan2Text src/scan2text/engine.py
```

## Architecture

- **Local-first:** Zero cloud dependencies; all processing is offline.
- **Modular monolith:** Clean separation — UI ↔ Routes ↔ Services ↔ Adapters ↔ Storage.
- **Contract-first:** All data shapes defined as strict Pydantic models before any service or route code.
- **OCR isolation:** `OCREngine` ABC hides `llama-cpp-python` behind an interface; CI uses `FakeOCR`.
- **Portable runtime:** Runs from any folder without admin rights. Paths resolved via `path_service.py`.

## Updating

See [docs/UPDATE.md](docs/UPDATE.md) for instructions on how to update Scan2Text manually.

## License

MIT
```

**NOTE:** README.md references stale artifacts (`engine.py`, `ui/static/`) — these were retired in S43 but the README has not been updated. This is a documentation debt item.

---

## 7b. v1.0.0 Known Issue

**Source:** `second-brain/02-QA/v1.0.0-release-decision.md` (verbatim)

> **Known Issue — R2: Queue Red-Dot Tooltip (FILE_TOO_COMPLEX)**
>
> **Path:** File enters queue → backend rejects it as too complex → red dot appears in queue row → user hovers tooltip → shows generic "Failed" instead of the locked translated `FILE_TOO_COMPLEX` copy.
>
> **Impact:** Low. The file is still correctly rejected and logged; the only gap is the tooltip text does not display the specific error message. Users can check logs or retry for more detail.
>
> **Resolution:** Deferred to app v1.1. Fix: map the `FILE_TOO_COMPLEX` error_code to its i18n string in the queue row tooltip path.

---

## 7c. Gate Baselines

**Source:** `second-brain/00-Current-State.md` (verbatim baseline block)

| Gate | Value |
|---|---|
| Backend tests | 357 passed |
| Frontend tests | 682 passed |
| Typecheck errors | 0 |
| Build | success |
| Cargo | pass |
| PRD doc version | v2.1 |

**CEO manual retest:** R1 welcome PASS, R3 settings PASS, R4 logs PASS; R2 tooltip FAIL (deferred to app v1.1)

---

## 8. Sanitize Check

**Rules applied:** Zero matches for `D:\Scan2Text`, `GITHUB_PERSONAL_ACCESS_TOKEN`, `.dsh/` anywhere in this fact pack. No local machine paths, no settings values, no logs, no feedback payloads. Only raw git output, verbatim doc content, and public-facing architecture data.

**Result:** PASS — clean.

---

*End of S42d Docs Fact Pack. Generated 2026-08-23 from commit `5aed4508`.*
