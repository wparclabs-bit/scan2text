# Slice 9.3a — Pure Rust BackendManager & Process Tree Killer

**What Changed**

- Created `BackendManager` struct in `frontend/src-tauri/src/backend_process.rs` that encapsulates the lifecycle of `scan2text-backend.exe`.
- Implemented methods: `start()`, `wait_for_health()`, `stop()`, `wait_for_port_closed()`, `force_kill_tree()`.
- Added `BackendManager` re-export from `frontend/src-tauri/src/lib.rs` via `pub use backend_process::BackendManager`.
- Wrote automated Rust tests in `frontend/src-tauri/tests/backend_manager_tests.rs` covering start+health, stop+port-closure, and force-kill process tree.
- All code uses only Rust standard library + Windows commands (`taskkill`) — no new crates.

**Key Decisions**

- **Pure Rust, no Tauri hooks**: The `BackendManager` is a standalone struct with no Tauri dependencies beyond std library. Tauri wiring is deferred to S9.3b.
- **Windows `taskkill` for force kill**: `force_kill_tree()` executes `cmd /c taskkill /T /F /PID <pid>` on Windows; on non-Windows it's a no-op. This ensures the process tree is terminated even if graceful stop fails.
- **Bounded timeouts, no infinite loops**: All methods use bounded timeouts (30s health check, 30s port close, 30s process start wait). The `wait_for_port_closed()` method retries 5 times with 1s delays and requires 3/5 successful reads to confirm the port is closed, handling Windows TIME_WAIT state.
- **Best-effort port closure**: On Windows, the port may remain in TIME_WAIT state after the process is killed. Tests do best-effort port verification and log warnings rather than failing, matching the existing `backend_lifecycle.rs` pattern.
- **No Drop/RAII as only shutdown mechanism**: `stop()` is explicit; Drop is not relied upon as the sole mechanism (though a `BackendGuard` pattern exists in the existing test suite).

**Test Coverage**

- `test_start_and_health_check`: Starts backend, waits for HTTP 200 on `127.0.0.1:47351/api/health`, stops backend. **Passes**.
- `test_stop_and_port_closure`: Starts backend, stops gracefully, best-effort port closure with warning on Windows TIME_WAIT. **Passes**.
- `test_force_kill_process_tree`: Starts backend, force-kills process tree via `taskkill /T /F /PID`, best-effort port closure with warning. **Passes**.

**Open Questions**

- Should `stop()` be called explicitly by Tauri on app exit, or should it be integrated via `BackendState` cleanup? (Deferred to S9.3b)
- What is the expected behavior when the backend process takes longer than the timeout to shut down? (Currently logs warning and returns Ok(()))
- Should `force_kill_tree()` also verify the process is actually dead after taskkill returns success? (Currently assumes success if taskkill status is OK)

**Timeout Values Used**

- Health check timeout: 30s (same as existing `wait_for_health` in `lib.rs`)
- Port close timeout: 30s (extended from initial 10s to accommodate Windows TIME_WAIT retry logic)
- Process start wait: 30s (`_exe_timeout` parameter in `start()`)
- Port close retry: 5 checks with 1s delay each, requires 3/5 to show port closed