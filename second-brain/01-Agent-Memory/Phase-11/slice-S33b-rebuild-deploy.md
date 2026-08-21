# S33b-REBUILD-DEPLOY

**Date:** 2026-08-23
**Phase:** Phase 11 (Backend Lockdown)
**Status:** COMPLETE

## Objective
Re-confirm the full backend suite, rebuild the PyInstaller folder artifact from current source, deploy it to D:\Scan2Text\backend\, run a headless smoke test to prove the binary boots, and migrate any stale backend\feedback\ contents to root feedback\. Zero source edits.

## Evidence

### Task 1: Preflight + Test Gate
- No Scan2Text.exe or scan2text-backend.exe process running (Get-Process confirmed)
- Backend test gate: **350 passed, 0 failed** (6.27s)
- `$env:PYTHONPATH="src"; py -3.12 -m pytest -q --tb=line` — GREEN

### Task 2: Rebuild
- Spec discovered at `packaging/scan2text-backend.spec` (unmodified, 97 lines)
- Build command: `py -3.12 -m PyInstaller packaging/scan2text-backend.spec --noconfirm`
- PyInstaller 6.22.0, Python 3.12.9, Windows-11
- Dist artifact: folder-based at `dist/scan2text-backend/`
- Artifacts present:
  - `_internal/pypdfium2_raw/pdfium.dll` ✓
  - `_internal/python312.dll` ✓
  - `_internal/llama_cpp/lib/llama.dll` ✓
  - `scan2text-backend.exe` (45,592,565 bytes)

### Task 3: Deploy + Smoke Test
- Removed old `D:\Scan2Text\backend\_internal` and `scan2text-backend.exe` only
- Copied fresh dist artifact into `D:\Scan2Text\backend\`
- Started hidden: PID 9972
- Port 47351 bound within seconds (TCP connection successful)
- Health endpoint: **200 OK**
  ```json
  {
    "status": "ok",
    "worker": "idle",
    "ram": {"total_mb": 48233, "used_mb": 27244, "percent": 56.5},
    "cpu": {"percent": 0},
    "model": {"name": "OvisOCR2 0.9B", "loaded": false, "files_present": false},
    "version": "0.1.0"
  }
  ```
- Process exited cleanly after health check (PID 9972 no longer found)

### Task 4: Feedback Migration
- Ensured `D:\Scan2Text\feedback\pending` and `D:\Scan2Text\feedback\sent` exist
- `backend\feedback\` was empty — zero files to migrate, zero conflicts

### Task 5: Obsidian + Commit
- Updated `second-brain/00-Current-State.md` baseline block
- Archived oldest changelog entry (S31-RECON-PROBE) to `Archive/state-history.md`
- Wrote slice summary to this file
- Git status: only changes under `second-brain/` — no source edits

## Verification Checklist
- [x] pytest: 350 passed
- [x] Deployed exe: 45,592,565 bytes, timestamp 2026-08-21 23:37:07
- [x] _internal DLL checks: pdfium.dll ✓, python312.dll ✓, llama.dll ✓
- [x] Smoke test: /api/health returned 200 OK
- [x] Feedback migration: 0 files moved, 0 conflicts
- [x] Git status --porcelain: changes only under second-brain/

## Blockers
None.
