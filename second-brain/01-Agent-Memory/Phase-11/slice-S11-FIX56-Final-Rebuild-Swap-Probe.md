# S11-FIX56 — Final Rebuild + Swap + Probe

**Date:** 2026-08-18
**Phase:** Phase 11 (Polling Endurance)
**Status:** COMPLETE

## What Changed

S11-FIX55 updated the source code to enforce a 50-page PDF limit, but the packaged artifacts in `D:\Scan2Text` were still the stale S11-FIX53 build (20-page limit). This slice rebuilt both the PyInstaller backend and the Tauri frontend shell, wiped the portable directory (preserving user data), swapped in the fresh artifacts, and ran boot-gate + PDF probes.

### Builds
- **Backend:** `py -3.12 -m PyInstaller packaging/scan2text-backend.spec --noconfirm --clean` → exit 0
- **Frontend:** `npx tauri build --no-bundle` → exit 0 (43s release compile)

### Wipe & Swap
- Preserved in `D:\Scan2Text`: `models/`, `output/`, `settings/`, `logs/`, `feedback/`
- Deleted: old `Scan2Text.exe`, old `scan2text-backend/`, old `dist/`
- Copied new `Scan2Text.exe` and new `scan2text-backend/` folder

### Probe Results
- **Boot gate:** health `ok`, `model.loaded=true`, `files_present=true`, `dll_count=19`, `pdfium.dll` present (7.2MB)
- **PDF probe:** POST `/process` → `task_id` → status `completed` within 240s
- **Backend logs:** zero `ModuleNotFoundError`

## New Artifact Hashes
- **Tauri shell:** `0B0F8371C408C1A865042D593AA6E2546F530850DBFC98B84B3AAF79DE806EBB`
- **Backend:** `4EBD872A6563E3DE199D50A69A4DB904E0864D6F28A74C3D34B343C7DDA5F216`

## Key Decisions
- No source edits per NON-GOALS.
- Used `Remove-Item -Recurse -Force` for selective wipe.
- Used Python `requests` for PDF probe (fake httpx module in `.tmp/pdf_probe.py` rewrites `/api/` paths and hung on long-running jobs).
- Backend process killed after probe via `Stop-Process -Force`.

## Test Coverage
- Backend: 316 passed, 1 pre-existing failure (test_health_contract)
- Frontend: 637 passed, 0 failures
- Typecheck: zero errors
- Build: success (both PyInstaller and Tauri)
- Probe: exit 0, final status completed

## Open Questions
None. Ready for CEO final re-smoke.
