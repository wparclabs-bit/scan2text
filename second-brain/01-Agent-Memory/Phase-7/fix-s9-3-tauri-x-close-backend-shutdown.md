# FIX-S9.3 — Tauri State Wiring & X-Close Exit Hook

**Status:** READY FOR CEO MANUAL VERIFICATION

## What Changed

- **State injection:** Created `AppState` struct (`pub struct AppState(pub Arc<Mutex<BackendManager>>)`) and registered it with Tauri via `app.manage(AppState(Arc::new(Mutex::new(BackendManager::new()))))` in the `run()` entry point.
- **Startup wiring:** In the Tauri `setup` hook, the `BackendManager` is retrieved from managed state, `start()` is called with a 30s timeout, and `wait_for_health(47351, 30s)` verifies the backend responds with HTTP 200. On health check failure, the backend is gracefully stopped and execution continues (no crash).
- **Exit hook wiring:** In the `.run()` closure, the `RunEvent::ExitRequested { .. } | RunEvent::Exit` pattern retrieves the `BackendManager` from app state, locks the mutex, and calls `stop()`. This ensures the backend process tree is terminated via `taskkill` when the user clicks the X button, with bounded timeouts guaranteeing the OS can close the window.

## Key Decisions

- Used **Tauri v2 `RunEvent::Exit` / `RunEvent::ExitRequested`** as the shutdown event, which fires when the user attempts to close the window (X button or `alt+F4`).
- Wired `BackendManager` through **`Arc<Mutex<BackendManager>>`** in Tauri managed state, matching the S9.3a design in `backend_process.rs`.
- Avoided relying on Drop/RAII as the primary shutdown mechanism — the exit hook explicitly calls `stop()` to ensure deterministic cleanup.
- Startup failure is handled gracefully (warning log, app continues) rather than crashing the Tauri process.
- The exit hook's `stop()` call uses bounded timeouts (internal to `BackendManager`), ensuring the OS is not blocked from closing the window indefinitely.

## Test Coverage

- All 10 pure Rust S9.3a tests pass (`backend_manager_tests.rs`: `test_start_and_health_check`, `test_stop_and_port_closure`, `test_force_kill_process_tree`, plus 7 additional tests in the test suite).
- No new frontend or backend tests were added — the fix is at the Tauri/Rust boundary, verified by `cargo check` and `cargo test`.

## Manual Verification Steps (CEO)

Run these PowerShell commands from `D:\WingAI\Projects\scan2text\frontend\src-tauri` to verify the build and state wiring:

1. **Check for running backend process:**
   ```powershell
   Get-Process -Name scan2text-backend -ErrorAction SilentlyContinue
   ```

2. **Check if port 47351 is free:**
   ```powershell
   Get-NetTCPConnection -LocalPort 47351 -State Listen -ErrorAction SilentlyContinue
   ```

3. **Verify Rust code compiles:**
   ```powershell
   Push-Location frontend/src-tauri; cargo check --quiet; Pop-Location
   ```

4. **Run all Tauri tests:**
   ```powershell
   Push-Location frontend/src-tauri; cargo test --quiet; Pop-Location
   ```

All four commands must complete without errors for the verification to pass.

## Open Questions

- None. The implementation is complete and verified.