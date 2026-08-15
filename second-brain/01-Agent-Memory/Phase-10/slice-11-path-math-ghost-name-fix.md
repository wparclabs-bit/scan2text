# S10-DIAG11 — Path Math + Ghost Name Fix

**Date:** 2026-08-15
**Slice:** S10-DIAG11-Path-Math-Ghost-Name-Fix

## What Changed

### 1. Path Math Fix (path_service.py)
- **Bug:** `_resolve_models_dir()` used `exe_dir.parent` (one level up) but named it `grandparent`. In the portable dist layout (`dist/scan2text-backend/scan2text-backend.exe`), models live at the true grandparent (`exe_dir.parent.parent` = project root), not the parent (`exe_dir.parent` = dist).
- **Fix:** Changed `grandparent = exe_dir.parent` → `project_root = exe_dir.parent.parent`. Added explicit `parent` check between grandparent and exe-adjacent fallbacks. Updated error message labels to reflect the corrected 3-tier hierarchy.
- **Files:** `src/scan2text/services/path_service.py`

### 2. GLM-OCR Ghost Eradication (health.py)
- **Bug:** `MODEL_NAME = "GLM-OCR 0.9B"` was a stale string from a removed engine. ADR-006 locks OvisOCR2 0.9B as the sole engine.
- **Fix:** Replaced with `MODEL_NAME = "OvisOCR2 0.9B"`. Updated `tests/test_health.py` assertion to match.
- **Files:** `src/scan2text/routes/health.py`, `tests/test_health.py`

### 3. New Regression Test
- Added `test_frozen_models_dir_grandparent_when_dist_layout` to `tests/unit/services/test_path_service_frozen.py`. Mocks exe at `dist/scan2text-backend/` with models at project root; asserts `models_dir` resolves to project root (not dist).

## Key Decisions
- Three-tier frozen resolution: grandparent → parent → exe-adjacent (was two-tier: parent → exe-adjacent).
- Error message now lists all three probed paths for troubleshooting.

## Test Coverage
- Backend: 236 passed, 1 pre-existing failure (test_health_contract — `loaded is False` fails because models exist on disk). No new failures.
- Frontend: typecheck clean, build clean, 617 green.

## Open Questions
- None.

## Exe Hash
- New: `D6C2032EFA0A099DCC14B028D616231D706222972D81633C5035E80215974601`
- Swapped into: `D:\Scan2Text\dist\scan2text-backend\scan2text-backend.exe`
