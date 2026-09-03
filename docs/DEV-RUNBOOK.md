# Scan2Text — Dev Runbook

## Purpose

This is the operator manual for dev mode. It tells you how to boot, what each component does, which environment variables and ports matter, and how to diagnose the failures you will hit. Boot from repo root with `.\dev.ps1`; if that fails, use the manual fallback commands in this doc. Every failure symptom maps to a concrete first move — read the Failure Dictionary before panicking.

## Quick Start

From repo root `D:\WingAI\Projects\scan2text`:

```powershell
.\dev.ps1
```

Success looks like:

```
Backend (Uvicorn) started [PID <n>] on http://127.0.0.1:47351
Backend healthy after 1s
Starting Tauri dev mode…
```

Then the Tauri window opens. Two green indicators confirm health: **frontend port 707** (Vite HMR) and **backend port 47351** (`/api/health` returns `{"status":"ok"}`). Typecheck must show 0 errors; build must succeed before any slice is considered complete.

## What dev.ps1 Does

1. **Port-occupancy safety belt.** TCP-connects to `127.0.0.1:47351`. If the connection succeeds, another process owns the port — prints a loud error and exits 1 immediately. No backend spawn, no wasted time.

2. **Spawn backend in background.** Sets `$env:PYTHONPATH = <repoRoot>/src`, then runs:
   ```
   py -3.12 -m uvicorn scan2text.api.main:app --host 127.0.0.1 --port 47351 --log-level warning
   ```
   WorkingDirectory is repo root. WindowStyle is Hidden. PID is captured via `-PassThru`.

3. **Health-wait polling.** Loops up to 30 iterations, sleeping 1 s between each. Calls `GET http://127.0.0.1:47351/api/health` with a 2 s timeout. On 200 → prints green "Backend healthy after Ns" and breaks. After 30 failures → kills the backend process and exits 1 with "Backend did not become healthy within 30 s."

4. **Launch Tauri dev.** Changes to `frontend/` and runs `npx tauri dev`. This starts Vite on port 707 (HMR) and the Tauri shell, which proxies API calls to `127.0.0.1:47351`.

5. **Exit trap cleanup.** A PowerShell `trap` block runs on any exit path (normal, Ctrl-C, error). It kills `$script:backendPid` if non-zero, then scans for child Python processes and stops them too. This prevents orphaned backend processes after the window closes.

## Environment Contract

| Key | Value | Notes |
|---|---|---|
| Port | `47351` | Unified dev + prod. Hardcoded in three places: `backend_process.rs`, `apiBase.ts`, `prod_runtime.py`. Never change without updating all three. |
| Interpreter | `py -3.12` | Locked by CEO. Never bare `python` — system default may be 3.14+ lacking native wheels for `llama-cpp-python`. |
| Dev home | Repo root (`D:\WingAI\Projects\scan2text`) | `PathService.resolve_home()` returns `repo_root` in dev mode (parents[3] from source file). Models, settings, logs, output all live here. |
| PYTHONPATH | `<repoRoot>/src` | Set by dev.ps1 before backend spawn. Backend imports resolve against this. |
| version.json | Repo root | Read at runtime for app metadata. Present alongside `dev.ps1`. |
| Frontend proxy target | `http://127.0.0.1:47351` | Configured in `vite.config.ts`. All API calls from the Tauri shell route here. |

## Manual Boot Fallback

When `dev.ps1` cannot be used (e.g., script execution policy blocks it), run these commands manually **from repo root**:

```powershell
# 1. Set PYTHONPATH and spawn backend
$env:PYTHONPATH = (Resolve-Path src).Path
$backendProc = Start-Process -FilePath "py" `
    -ArgumentList "-3.12", "-m", "uvicorn", "scan2text.api.main:app",
        "--host", "127.0.0.1", "--port", "47351", "--log-level", "warning" `
    -WorkingDirectory (Resolve-Path .).Path -PassThru -WindowStyle Hidden

# 2. Wait for health (copy of dev.ps1 loop)
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    try {
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:47351/api/health" `
            -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($resp.StatusCode -eq 200) { Write-Host "Backend healthy"; break }
    } catch { Write-Host "Waiting … ($($i+1)/30)" }
}

# 3. Launch Tauri
Set-Location frontend
npx tauri dev
```

## Failure Dictionary

| Symptom | Meaning | First Move |
|---|---|---|
| `Port 47351 is already occupied` | Another process (stale backend, manual uvicorn) owns the port. dev.ps1 refuses to start. | `netstat -ano \| findstr :47351` → identify PID → `Stop-Process -Id <pid> -Force`. Retry `.\dev.ps1`. |
| `ECONNREFUSED 47351` (frontend can't reach backend) | Backend is down or never started. Tauri proxy has nothing to forward to. | Open `http://127.0.0.1:47351/api/health` in a browser. If it fails, backend died — check the PowerShell console for uvicorn startup errors. |
| `"Could not import module scan2text.api.main"` | PYTHONPATH is wrong or missing. Python can't find `src/` on its import path. | Verify `$env:PYTHONPATH` includes `<repoRoot>/src`. Manual fallback: set it explicitly via `(Resolve-Path src).Path` before spawning uvicorn. |
| `"manifest not found"` (Tauri) | Tauri config (`tauri.conf.json`) is missing or malformed in `frontend/`. | Check that `frontend/src-tauri/tauri.conf.json` exists and contains valid JSON with a `identifier` field. Re-run from repo root, not from inside `frontend/`. |
| Backend healthy line never appears (30 s timeout) | Uvicorn failed to bind, crashed on import, or health endpoint is misconfigured. | Check the hidden console output — run uvicorn manually without `-WindowStyle Hidden` to see stderr. Confirm health URL is `/api/health`, not `/health`. |
| HMR lying (stale UI after edit) | Vite cache or node_modules.vite is serving stale bundles. Common after config changes. | Delete `frontend/node_modules/.vite`, refresh the browser. If still stale, kill all Node processes and relaunch `.\dev.ps1`. |
| Spawned backend dies silently (no error in console) | Exit trap may have killed it, or uvicorn crashed before health check. PID is non-zero but process is gone. | Call `http://127.0.0.1:47351/api/health` manually. If 404/ refused, backend never started — run the manual fallback and watch stderr directly. |
| Frontend port 707 not green | Vite failed to start, or Tauri shell hasn't loaded yet. | Check `frontend/` for TypeScript errors (`npm run typecheck`). Ensure `node_modules` exists. Restart with `.\dev.ps1`. |
