# S21-GATE-BACKEND-REBUILD-DEPLOY

**Phase:** 11 (Backend — PyInstaller rebuild & deploy)
**Date:** 2026-08-22
**Status:** COMPLETE

## Objective
Rebuild the PyInstaller backend artifact to include the S20 fix (`PathService._resolve_app_root()` → `_resolve_portable_root()`) and deploy it to the portable environment at `D:\Scan2Text\backend\`.

## Tasks Executed

### 1. Backend Gate — Full pytest suite
- Command: `$env:PYTHONPATH="src"; py -3.12 -m pytest -q --tb=line`
- Result: **337 passed, 0 failures** in 6.23s
- Status: GREEN (1 more pass than S20 baseline of 336)

### 2. PyInstaller Build
- Command: `py -3.12 -m PyInstaller packaging/scan2text-backend.spec --clean`
- Cleaned old build artifacts, rebuilt from scratch
- Output: `dist/scan2text-backend/` folder artifact
- Contents: `scan2text-backend.exe` (45.59 MB) + `_internal/` (707+ files)
- Status: SUCCESS

### 3. Deploy
- Killed running backend process (PID 3308)
- Copied `dist/scan2text-backend/scan2text-backend.exe` and `_internal/` to `D:\Scan2Text\backend\`
- Preserved: `models123/`, `output/`, `logs/`, `settings/`, `feedback/`, `version.json`, `Scan2Text.exe`
- Status: SUCCESS

### 4. Verification
| Check | Result |
|---|---|
| `Test-Path D:\Scan2Text\backend\scan2text-backend.exe` | True |
| LastWriteTime | 8/21/2026 6:00:19 AM (fresh — build just completed) |
| `Test-Path D:\Scan2Text\version.json` | True |
| `max_pdf_pages` in settings.json | 50 |

## Gate Summary
- Backend pytest: **337 passed, 0 failures** ✓
- PyInstaller build: **success** ✓
- Deployed exe timestamp: **fresh** ✓
- version.json: **present at portable root** ✓
- max_pdf_pages: **50** ✓
- Source edits: **ZERO** (GATE slice constraint met)

## Context
S20 fixed `PathService._resolve_app_root()` in source code but the deployed PyInstaller artifact was stale — it still contained the old broken resolution logic. This slice rebuilt and redeployed the artifact so the fix is active in the CEO's portable environment.

## Files Changed
- `second-brain/00-Current-State.md` — Updated Baseline + changelog entry
- `second-brain/01-Agent-Memory/Phase-11/slice-S21-GATE-BACKEND-REBUILD-DEPLOY.md` — New slice summary
