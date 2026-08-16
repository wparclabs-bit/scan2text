# Slice 9.1b — Tauri Dev-Mode Plumbing

Date: 2026-08-12
Phase: Phase 7
Status: READY FOR CEO MANUAL VERIFICATION

## What Changed

- Installed `@tauri-apps/cli@^2` (v2.11.4) as frontend devDependency
- Initialized Tauri v2 project at `frontend/src-tauri/` via `npx tauri init --ci`
- Configured `tauri.conf.json`: app title "Scan2Text", window 1200×800, devUrl http://localhost:5173, frontendDist ../dist, beforeDevCommand "npm run dev", withGlobalTauri true
- Created `dev.ps1` — repo-root script that starts Uvicorn (py -3.12) on 127.0.0.1:8000 then launches `npx tauri dev`
- Created `dev-web.ps1` — same but launches Vite directly (no Tauri wrapper)
- Added `"tauri": "tauri"` script to `frontend/package.json`

## Key Decisions

- Tauri CLI installed in `frontend/` (not repo root) — matches official docs for web-framework-first projects
- `src-tauri/` lives inside `frontend/`, not repo root — consistent with Tauri's expected layout for existing frontends
- Window size set to 1200×800 (larger than default 800×600) to accommodate the fixed inset-0 Command Center shell comfortably
- No native menu disable — Tauri v2 doesn't expose a simple conf.json toggle for this; can be addressed in a future slice if needed
- Orchestration scripts use relative paths (`Split-Path -Parent $MyInvocation.MyCommand.Path`) — no hardcoded D:\ paths
- Backend uses `py -3.12 -m uvicorn scan2text.api.main:app --host 127.0.0.1 --port 8000` with `PYTHONPATH=src`

## Test Coverage

- Frontend tests: 589 passed (no regression)
- Frontend typecheck: PASS
- Frontend build: PASS
- Backend tests: 196 passed, 1 pre-existing failure (`test_health_contract` — model.loaded=True because dummy models now exist on disk; unrelated to Tauri)

## Commands Run

```powershell
# Audit
node --version          # v24.18.1
npm --version           # 11.14.1
py -3.12 --version      # 3.12.9
cargo --version         # 1.97.1
npx tauri info          # all checks pass (WebView2, MSVC, Rust)

# Install
cd frontend && npm install --save-dev @tauri-apps/cli@^2

# Init
npx tauri init --ci --app-name Scan2Text --window-title "Scan2Text" --dev-url "http://localhost:5173" --frontend-dist "../dist" --before-dev-command "npm run dev" --force

# Verify
$env:PYTHONPATH="src"; py -3.12 -m pytest -q   # 196 passed, 1 failed (pre-existing)
npm run typecheck                                # PASS
npm run build                                    # PASS
npm run test                                     # 589 passed
```

## Manual CEO Verification Required

Run `.\dev.ps1` from repo root and confirm:
- Native window titled "Scan2Text" opens
- Command Center shell renders correctly (TopBar, Dropzone, Queue, Preview, BottomBar)
- Backend logs show Uvicorn running on 127.0.0.1:8000
- No JS console errors

See `second-brain/02-qa/phase-7/s9-1b-tauri-dev-plumbing.md` for full QA steps.

## Open Questions

- Should native menus be explicitly disabled? (Tauri v2 doesn't have a simple conf.json flag; may require Rust code change)
- Icon assets: Tauri init generated placeholder icons — should we replace with project logo.png?
- `withGlobalTauri: true` exposes `window.__TAURI__` — needed for future Tauri API calls but not used yet
