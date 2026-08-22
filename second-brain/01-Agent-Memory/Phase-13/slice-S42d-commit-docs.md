# Slice S42d-COMMIT-DOCS — Regenerated 8-Doc External Pack

**Date:** 2026-08-23  
**Phase:** Phase 13  
**Status:** COMPLETE  
**Scope:** DOC-ONLY (zero source edits)

## Objective

Regenerate failed fact tables from live sources, apply verified corrections, and commit the 8-document external pack (README.md at root + 7 docs under docs/).

## What Changed

### TECH-STACK.md — Regenerated from manifests
- **Frontend prod deps:** Rebuilt table from `frontend/package.json`. Verified: react ^19.2.8, lucide-react ^1.28.0, @tauri-apps/api ^2.11.1, i18next ^26.3.6, react-i18next ^17.0.11.
- **Removed hallucinated packages:** react-router-dom, vaul, postcss, tailwindcss-animate, @tauri-apps/plugin-log, @tauri-apps/plugin-shell — none exist in package.json.
- **eslint → oxlint:** Manifest declares `oxlint ^1.75.0` (not eslint).
- **Backend deps:** Declared ranges from pyproject.toml; resolved versions where available (fastapi 0.141.1, uvicorn 0.52.0, pydantic 2.13.4, llama-cpp-python 0.3.34, pypdfium2 5.12.1).
- **Rust deps:** From Cargo.toml — tauri 2.11.3, tauri-build 2.6.3, serde 1, log 0.4.

### REPO-MAP.md — Regenerated from live tree
- **Backend routes/ EXISTS:** download.py, feedback.py, health.py, jobs.py, settings.py (draft incorrectly said "no separate routes package").
- **Backend utils/ EXISTS:** cpu_budget.py, prod_runtime.py.
- **Backend models/:** errors.py, job.py, ocr_result.py, settings.py.
- **Services corrected:** model_downloader_service.py, logging_service.py (contains PrivacyFilter), boot_guard.py (at package root), path_service.py, file_service.py, queue_service.py, output_service.py, postprocess_service.py, settings_service.py, update_service.py, feedback_service.py, pdf_service.py.
- **Adapters:** ocr_engine.py, vlm_ocr.py.
- **Frontend components added:** WelcomeModal, FeedbackButton, FeedbackDialog, ModelDownloaderModal (draft omitted these).
- **i18n paths corrected:** src/i18n/index.ts + src/locales/*.json (draft had wrong paths).
- **Cargo.lock location:** frontend/src-tauri/Cargo.lock (not root).
- **Untracked files noted:** deploy-fix65d.ps1, verify-fix65d.ps1, _check_structure.py, Lesson-Learned.md, backend/, pastes/.

### ARCHITECTURE.md — Corrections applied
- Model-directory precedence filled: 1) SCAN2TEXT_MODELS_DIR env, 2) frozen grandparent, 3) exe-adjacent models/, 4) dev cwd.
- Test reference corrected: `TestI2PortableRootResolution` in `tests/test_s38_backend_fixes.py`.
- "dedicated" typo fixed.

### README.md — Corrections applied
- Model size filled: "about 1 GB (811 MB + 205 MB)".

### BUILD-AND-RELEASE.md — Corrections applied
- PyInstaller flag filled: `--noconfirm`.

### RUNTIME-LAYOUT.md — Corrections applied
- Settings path corrected: `settings/settings.json` (subfolder), not flat root `settings.json`.

### SECURITY.md — Corrections applied
- Recommendation 3 confirmed per CEO decision: OvisOCR2 Apache-2.0, no upstream NOTICE file, bartowski quantizations carry no extra restrictions (CEO verified 2026-08-23).

### GITHUB-READINESS.md — Corrections applied
- Item 3 decided: private + full vault; fresh repo + different-username + public-at-v1.1 noted.
- Item 5 resolved: license confirmed.
- Public launch plan added.

## Verification Results

| Check | Result |
|---|---|
| `Get-ChildItem docs/` shows 7 files | PASS |
| Select-String "MIT" (outside historical notes) | PASS — only in GITHUB-READINESS.md as historical reference |
| Select-String "D:\Scan2Text" | PASS — zero matches |
| Select-String "engine.py" as live component | PASS — only retirement note in REPO-MAP |
| Select-String "react-router-dom" in REPO-MAP/ARCHITECTURE | PASS — zero matches |

## Remaining [VERIFY] Markers (17 total)

| Doc | Marker |
|---|---|
| README.md | Public download URL |
| README.md | Exact combined model size (shipped in release) |
| BUILD-AND-RELEASE.md | Pinned Node version |
| BUILD-AND-RELEASE.md | Pinned Rust toolchain |
| BUILD-AND-RELEASE.md | Wheel index still current |
| BUILD-AND-RELEASE.md | Exact build script/command of record |
| BUILD-AND-RELEASE.md | Confirmed working URL format per release |
| SECURITY.md | Security contact email |
| TECH-STACK.md | pillow resolved version |
| TECH-STACK.md | requests resolved version |
| TECH-STACK.md | click resolved version |
| TECH-STACK.md | psutil resolved version |
| TECH-STACK.md | python-multipart resolved version |
| TECH-STACK.md | pytest resolved version |
| TECH-STACK.md | httpx resolved version |
| TECH-STACK.md | pytest-asyncio resolved version |

## Spot-Checks (manifest matches)

1. **react:** package.json `"react": "^19.2.8"` → TECH-STACK table: ^19.2.8 ✅
2. **fastapi:** pyproject.toml `fastapi>=0.115` → TECH-STACK table: >=0.115 ✅
3. **tauri:** Cargo.toml `tauri = { version = "2.11.3" }` → TECH-STACK table: 2.11.3 ✅

## Files Changed

- `README.md` — corrected draft (replaced)
- `docs/ARCHITECTURE.md` — regenerated with corrections
- `docs/TECH-STACK.md` — fully regenerated from manifests
- `docs/REPO-MAP.md` — fully regenerated from live tree
- `docs/BUILD-AND-RELEASE.md` — corrections applied
- `docs/RUNTIME-LAYOUT.md` — corrections applied
- `docs/SECURITY.md` — corrections applied
- `docs/GITHUB-READINESS.md` — corrections applied
- `second-brain/00-Current-State.md` — baseline + changelog updated
- `second-brain/01-Agent-Memory/Archive/state-history.md` — S42d-DOCS-FACT-PACK archived
- `second-brain/01-Agent-Memory/Phase-13/slice-S42d-commit-docs.md` — this summary
