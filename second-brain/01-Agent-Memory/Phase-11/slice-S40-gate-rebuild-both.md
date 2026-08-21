# S40-GATE-REBUILD-BOTH

**Date:** 2026-08-23
**Phase:** Phase 11 (Backend Lockdown)
**Status:** COMPLETE

## Objective
Full gates + PyInstaller rebuild/deploy + Tauri rebuild/deploy + settings migration + stray cleanup + smoke verification. GATE: ZERO source edits.

## Gates
- **Backend pytest:** 361 passed, 0 failed (7.06s)
- **Frontend vitest:** 682 passed, 0 failed (8.14s, 39 test files)
- **Typecheck:** 0 errors
- **Vite build:** success (880ms, 600.11 kB JS, 51.65 kB CSS)
- **Cargo check:** pass (1 benign dead_code warning: `spawn_creation_flags` in `backend_process.rs:244`)

## I1 Forensic
- `src\scan2text\api\main.py:126`: `task["error_code"] = "OCR_FAILED"` guarded by `if not task.get("error_code")` — preserves the task's own error_code. Verdict: **preserves error_code correctly**.

## Backend Rebuild + Deploy
- Command: `py -3.12 -m PyInstaller packaging/scan2text-backend.spec --noconfirm`
- Preflight: no Scan2Text.exe or scan2text-backend.exe process running
- Dist artifact: folder-based at `dist/scan2text-backend/`
- Deployed by removing old exe + _internal only, copying fresh dist artifact (nested copy fixed via Move-Item)
- **Deployed:** `D:\Scan2Text\backend\scan2text-backend.exe` — 45,593,779 bytes, LastWriteTime `2026-08-22 06:22:06`
- `_internal\pypdfium2_raw\pdfium.dll` ✓

## Shell Rebuild + Deploy
- Command: `npm run tauri -- build` (from `frontend/`)
- Before-build hook: `npm run build` success
- Compiled `app_lib v0.1.0` in release profile (30.17s)
- Produced 2 bundles (MSI + NSIS) + standalone exe
- **Deployed:** `D:\Scan2Text\Scan2Text.exe` — 8,976,896 bytes, LastWriteTime `2026-08-22 06:25:13`

## Migration + Cleanup
- `D:\Scan2Text\logs\app.log`: absent — no move needed
- `D:\Scan2Text\backend\settings\settings.json`: exists; `D:\Scan2Text\settings\settings.json`: already exists → **skip copy per NO OVERWRITE policy**
- Root settings.json parse: OK
- Stray dirs removed: backend\logs, backend\settings, backend\output, backend\models, backend\feedback
- Backend contents after cleanup: `scan2text-backend.exe` + `_internal` only

## Smoke + Verify
- Started hidden (PID obtained), waited 25s
- `/api/health`: **200 OK** — `{"status":"ok","worker":"idle","model":{"name":"OvisOCR2 0.9B","loaded":true,"files_present":true},"version":"0.1.0"}`
- Process exited cleanly after health check
- `"Settings file missing"` count in fresh `D:\Scan2Text\logs\app.log`: **0**
- Backend contents post-smoke: `scan2text-backend.exe` + `_internal` only — **zero stray recreation**

## Evidence Summary
| Gate | Result |
|---|---|
| Backend pytest | 361 passed |
| Frontend vitest | 682 passed |
| Typecheck | 0 errors |
| Vite build | success |
| Cargo check | pass (1 benign warning) |
| Backend artifact | 45,593,779 bytes @ 2026-08-22 06:22:06 |
| Shell artifact | 8,976,896 bytes @ 2026-08-22 06:25:13 |
| Health smoke | 200 OK, status=ok |
| "Settings file missing" spam | 0 |
| Stray recreation | no |
| I1 forensic | preserves error_code ✓ |
| Settings migration | skipped (root existed) |
| Source edits | zero |

## Blockers
None.
