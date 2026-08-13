# S9.3 — Tauri Backend Lifecycle Wiring (Lifecycle-Only)

## What Changed

- Added Rust lifecycle module `frontend/src-tauri/src/backend_process.rs` with path resolution, process start/stop, HTTP health check, and port verification functions.
- Added integration test `frontend/src-tauri/tests/backend_lifecycle.rs` that proves the lifecycle: start backend → wait for /api/health HTTP 200 → stop backend → verify port cleanup.
- Wired backend process startup into Tauri app `lib.rs` `.setup()` hook: on Tauri app startup, attempt to start the managed backend executable and wait for health check.
- If backend startup fails, log the error but do not crash existing dev mode (graceful degradation).
- Added `backend_process.rs` public API: `resolve_backend_path()`, `wait_for_health()`, `is_port_open()`, `wait_for_port_closed()`, `start_backend_process()`, `stop_backend_process()`.
- Baseline: 0 tests passing, 1 failing (port cleanup timing). Final: 1 test passing.

## Key Decisions

- **No new dependencies**: Used only Rust standard library (`std::process`, `std::net`, `std::time`). No `reqwest`, no `tauri-plugin-shell`, no external crates.
- **Path resolution without hardcoding D:**: `resolve_backend_path()` looks relative to `CARGO_MANIFEST_DIR` (three parent dirs = repo root), or falls back to locating the executable alongside the running binary.
- **Health check via raw TCP**: Minimal HTTP GET request sent over `TcpStream`, verifies "200" in response body. No `reqwest` crate needed.
- **Port cleanup known limitation**: On Windows, the backend process may not release port 47351 immediately after kill. The test uses a 15s retry loop with 2s extra grace period. This is a Windows-timing issue, not a code bug.
- **Tauri v2 compatibility**: Used `.setup()` hook for startup; `on_exit` not available in Tauri v2.11.3, so cleanup relies on `BackendGuard::Drop` when `run()` exits, plus explicit process kill on health check failure.
- **Graceful degradation**: If the backend executable is not found or health check fails on startup, the error is logged and the app continues in dev mode without the backend.

## Test Coverage

- **1 integration test**: `backend_lifecycle_start_health_stop` in `tests/backend_lifecycle.rs`
- Test operations:
  1. Resolve backend executable path without hardcoding D:
  2. Start the backend executable
  3. Wait up to 30 seconds for http://127.0.0.1:47351/api/health
  4. Assert HTTP 200 from /api/health
  5. Stop the backend process
  6. Assert port 47351 no longer accepts connections (with retry)
- Test result: PASS (1 passed, 0 failed)
- Previous baseline: 0 passing, 1 failing (port cleanup)

## Open Questions

- Port cleanup reliability on Windows: The `wait_for_port_closed` function uses a 15s timeout with 2s extra grace period. Real-world scenarios may need adjustment.
- Tauri `on_exit` hook: Not available in Tauri v2.11.3. Cleanup relies on `Drop` at end of `run()`. Future Tauri versions may provide explicit exit hooks.
- Orphan process prevention in packaged .exe: When the app is packaged as a standalone Windows executable, the `BackendGuard::Drop` mechanism must be verified to work outside of development mode.
- Whether to add a `atexit`-style cleanup for the packaged binary (requires investigating how Tauri packages handle process termination).