# S37-GATE-REBUILD-VERIFY

**Date:** 2026-08-24
**Phase:** Phase 11 — Backend Rebuild + Deploy Gate
**Status:** COMPLETE

## Objective
Rebuild the PyInstaller folder artifact from current fixed source (S36 fixes included), deploy to portable root `D:\Scan2Text\backend\`, boot headless, and prove `D:\Scan2Text\logs\app.log` is created and populated. Zero source edits.

## Execution

### Task 1 — Preflight + Test Gate
- `Get-Process scan2text-backend`: none running ✓
- `$env:PYTHONPATH="src"; py -3.12 -m pytest -q --tb=line`: **352 passed** (baseline 350 + 2 from S36) ✓

### Task 2 — Rebuild
- Spec discovered at `packaging/scan2text-backend.spec` (2,558 bytes)
- Built unmodified: `py -3.12 -m PyInstaller packaging/scan2text-backend.spec --noconfirm`
- Dist artifact: `dist/scan2text-backend/` with `_internal/` + `scan2text-backend.exe` (45,594,717 bytes) ✓

### Task 3 — Deploy
- Removed old `D:\Scan2Text\backend\_internal` and `D:\Scan2Text\backend\scan2text-backend.exe` only
- Copied fresh dist artifact contents into `D:\Scan2Text\backend\`
- Deployed exe: 45,594,717 bytes, timestamp 2026-08-22 00:36:18 ✓

### Task 4 — Boot & Verify Log
- Started hidden: PID 16972
- Waited 10s
- `app.log` found at `D:\Scan2Text\logs\app.log` (96 bytes, 2026-08-22 00:37:57) ✓
- First 5 lines:
  ```
  Starting Scan2Text backend on 127.0.0.1:47351
  Killing stale scan2text-backend.exe (PID 16972)
  Auto-calculated 7 threads for 12 logical cores
  Scan2Text API started
  ```
- Process stopped cleanly ✓

### Task 5 — Cleanup
- `Stop-Process -Id 16972 -Force` ✓
- `00-Current-State.md` updated
- Slice summary written

## Verification Evidence
| Check | Result |
|---|---|
| pytest | 352 passed, 0 failed |
| Deployed exe size | 45,594,717 bytes |
| Deployed exe timestamp | 2026-08-22 00:36:18 |
| `Test-Path D:\Scan2Text\logs\app.log` | True |
| app.log first 5 lines | Contains log entries (see above) |

## Blockers
None.

## Notes
- S36 logging startup fixes are now live in the deployed exe (confirmed by `setup_logging()` and `ensure_runtime_dirs()` running at boot, producing `app.log` at portable root).
- Zero source edits — spec file used unmodified.
- No Tauri shell rebuild (NON-GOAL).
- No deletion of `backend\logs` or `backend\feedback`.
