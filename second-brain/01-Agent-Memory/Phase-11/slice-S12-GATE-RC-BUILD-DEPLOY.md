# S12-GATE-RC-BUILD-DEPLOY

**Status:** COMPLETE (with pre-existing test regression noted)
**Date:** 2026-08-21
**Slice Type:** GATE / Build / Deploy — zero source edits

## Objective
Run full automated quality gates, build portable Tauri and PyInstaller artifacts, deploy to D:\Scan2Text\, copy version.json to portable root, reset deployed max_pdf_pages to 50.

## Quality Gates

### Frontend Tests
- **Command:** `npm run test -- --run` (from `frontend/`)
- **Result:** 665 passed, **1 FAILED**
- **Failure:** `src/App.test.tsx > Command Center layout > reactive MODEL_NOT_FOUND modal > shows model-downloader-modal when store.showDownloader is true`
- **Root cause:** S12 commit (8bd2155) added `modelsMissing={!modelReady}` prop to ModelDownloaderModal in App.tsx. The test mock sets `showDownloader: true` but not `modelReady: false`, so `modelsMissing=false` causes the modal to return null (Scenario 4: models not missing). This is a **pre-existing regression** in HEAD — confirmed by running tests after `git stash` (same failure). Not introduced by this slice.
- **Impact:** Cannot be fixed without frontend source edits (NON-GOALS).

### Frontend Typecheck
- **Command:** `npm run typecheck` (from `frontend/`)
- **Result:** CLEAN — zero errors

### Backend Tests
- **Command:** `py -3.12 -m pytest -q --tb=line` (from repo root, PYTHONPATH=src)
- **Result:** 335 passed, **1 FAILED** (pre-existing)
- **Failure:** `tests/test_health.py::test_health_contract` — `assert True is False`

### Rust Check
- **Command:** `cargo check --message-format=short` (from `frontend/src-tauri/`)
- **Result:** CLEAN — one dead_code warning (`spawn_creation_flags` unused)

## Build Commands & Artifacts

### Frontend Production Bundle
- **Command:** `npm run build` (from `frontend/`)
- **Output:** `frontend/dist/` (index.html + assets/)
- **Status:** SUCCESS (1.14s)

### Tauri Desktop Artifact
- **Command:** `npx tauri build` (from `frontend/`)
- **Output:** 
  - `frontend/src-tauri/target/release/Scan2Text.exe` (portable EXE)
  - `frontend/src-tauri/target/release/bundle/msi/Scan2Text_0.1.0_x64_en-US.msi`
  - `frontend/src-tauri/target/release/bundle/nsis/Scan2Text_0.1.0_x64-setup.exe`
- **Status:** SUCCESS

### PyInstaller Backend Artifact
- **Command:** `py -3.12 -m PyInstaller packaging/scan2text-backend.spec --clean` (from repo root)
- **Output:** `dist/scan2text-backend/`
  - `scan2text-backend.exe` (45.6 MB)
  - `_internal/` (Python libs, DLLs, pypdfium2_raw/pdfium.dll)
- **Status:** SUCCESS

## Deployment to D:\Scan2Text\

### Artifacts Deployed
| Artifact | Source | Destination | Status |
|----------|--------|-------------|--------|
| Scan2Text.exe | `frontend/src-tauri/target/release/Scan2Text.exe` | `D:\Scan2Text\Scan2Text.exe` | DEPLOYED |
| backend/ | `dist/scan2text-backend/` | `D:\Scan2Text\backend/` | REPLACED |
| version.json | `version.json` (repo root) | `D:\Scan2Text\version.json` | COPIED |

### Preserved Directories
- `models/`, `output/`, `logs/`, `settings/`, `feedback/` — untouched

### Verification Results
| Check | Result |
|-------|--------|
| Test-Path D:\Scan2Text\Scan2Text.exe | True |
| Test-Path D:\Scan2Text\backend\scan2text-backend.exe | True |
| Test-Path D:\Scan2Text\version.json | True |
| Test-Path D:\Scan2Text\dist | False |
| version.json JSON-identical (repo vs portable) | True |

### Settings Reset
- **File:** `D:\Scan2Text\settings\settings.json`
- **Before:** `"max_pdf_pages": 150`
- **After:** `"max_pdf_pages": 50` (Int64)
- **Status:** RESET

## Known Issues
1. **Frontend test regression:** `App.test.tsx > reactive MODEL_NOT_FOUND modal` fails because the S12 commit changed App.tsx to pass `modelsMissing={!modelReady}` but the test mock doesn't set `modelReady: false`. Requires test fix (out of scope for this doc-only slice).
2. **Backend test pre-existing:** `test_health_contract` failure unchanged from baseline.

## Files Updated
- `second-brain/00-Current-State.md` — prepended slice summary + updated baseline
- `second-brain/01-Agent-Memory/Phase-11/slice-S12-GATE-RC-BUILD-DEPLOY.md` — this file
