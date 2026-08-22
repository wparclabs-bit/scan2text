# S9.1b — Tauri Dev-Mode Plumbing Manual QA

Date: 2026-08-12
Slice: S9.1b
Status: READY FOR CEO MANUAL VERIFICATION

## What This Tests

Tauri v2 dev-mode plumbing around the existing Vite React frontend.
No production build, no model download, no GUI automation.

## Prerequisites

- Node.js v24+ installed
- npm v11+ installed
- Python 3.12 installed (`py -3.12` available)
- Rust toolchain stable (cargo 1.97+, rustc 1.97+)
- WebView2 present (Windows 10/11 ships it; verified via `npx tauri info`)
- MSVC Build Tools present (verified via `npx tauri info`)

## Exact PowerShell Command

From repo root (`D:\WingAI\Projects\scan2text`):

```powershell
.\dev.ps1
```

This script:
1. Starts Uvicorn on `127.0.0.1:8000` with `PYTHONPATH=src`
2. Waits 2 seconds for backend to bind
3. Runs `npx tauri dev` from `frontend/`

## Expected Window Behavior

- A native window titled "Scan2Text" opens
- Dimensions: 1200×800 (resizable)
- The Command Center v1.7 shell renders:
  - TopBar (34px): logo chip + brand image + icon buttons
  - Main area: Dropzone (left, 38%) + Queue (left, 62%) | Preview (right)
  - BottomBar: Worker/RAM/Version telemetry + Share icon
- Dark theme by default
- If model files are absent from `models/`, the Model Downloader modal should appear
- If dummy models exist (current state), Welcome Screen appears until dismissed

## Expected Backend Logs

In the first terminal (Uvicorn):
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

If models are present and adapter initializes:
```
INFO:     Model loaded successfully
```

If models are missing:
```
WARNING:  Model files not found. Awaiting download.
```

## Expected Frontend State

- Vite dev server runs on `http://localhost:5173`
- Tauri loads the page via `http://localhost:5173`
- Console should show zero JS errors
- Network tab: `/api/health` returns 200 with `{"status":"ok",...}`

## What to Do If the Window Does Not Open

1. Check that Uvicorn started — look for "Uvicorn running on" in terminal 1
2. Check that Vite started — look for "Local:   http://localhost:5173" in terminal 2
3. Run `npx tauri info` from `frontend/` to verify all prerequisites
4. If Rust compilation fails, run `cargo clean` in `frontend/src-tauri/` and retry
5. Check Windows Event Viewer for native crash logs if window closes immediately

## Non-GUI Verification (Run Before This QA)

From repo root:
```powershell
$env:PYTHONPATH="src"; py -3.12 -m pytest -q
```
Expected: 199 passed, 1 pre-existing failure (`test_health_contract` — model loaded=True because dummy models exist on disk).

From frontend dir:
```powershell
npm run typecheck   # PASS
npm run build       # PASS
npm run test        # 590 passed
```

---

# S9.1d Addendum — Downloader Windows Rename + Disk-Aware Status + Restart Fix

Date: 2026-08-12
Slice: S9.1d
Status: READY FOR CEO MANUAL VERIFICATION

## What This Tests

Three downloader bugs fixed in this slice:
1. **Windows rename crash** — `os.replace()` now used instead of `path.rename()` so existing targets are overwritten safely.
2. **Disk-aware status** — GET /api/download/status validates files on disk (exist + size + SHA256); if both pass, returns `complete` without downloading.
3. **Restart from failed** — POST /api/download/start allowed from failed/cancelled state; concurrent starts guarded.

## Manual QA Steps

### Step A: Fresh Download (no models)
1. Delete the `models/` folder at repo root.
2. Run `.\dev.ps1` from repo root.
3. Expect: Model Downloader modal appears, downloads ~7MB total, closes automatically when complete, Welcome Screen appears.
4. Verify: `models/vlm.gguf` and `models/mmproj.gguf` exist after download.

### Step B: Restart with Models Present
1. Stop the app (Ctrl+C both terminals).
2. Restart with `.\dev.ps1` — models still on disk.
3. Expect: NO downloader modal; Welcome Screen appears immediately.
4. Verify: GET /api/download/status returns `{"status":"complete",...}` on first poll.

### Step C: Partial Missing Model
1. Stop the app.
2. Delete only `models/mmproj.gguf` (keep `vlm.gguf`).
3. Restart with `.\dev.ps1`.
4. Expect: Modal appears, downloads only mmproj (~2MB), closes, Welcome appears.
5. Verify: Both files present after completion.

### Step D: Restart from Failed State
1. Stop the app.
2. Delete both model files.
3. Restart with `.\dev.ps1`.
4. When modal appears, click "Restart Download" button.
5. Expect: Button is clickable; download restarts from 0%.
6. Verify: Modal shows progress bar advancing.
