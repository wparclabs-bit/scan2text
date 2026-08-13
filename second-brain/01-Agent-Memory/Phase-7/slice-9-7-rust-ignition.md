# S9.7 — Rust Ignition (Micro-Slice)

## What Changed
- **BackendManager struct** (backend_process.rs): New `pub struct BackendManager { child: Option<Child>, port: u16 }` with methods `new()`, `start()`, `stop()`, `get_pid()`, `wait_for_health()`, `wait_for_port_closed()` — delegates to existing standalone functions.
- **boot_backend()** (backend_process.rs): New `pub fn boot_backend(manager: &mut BackendManager) -> Result<(), String>` that calls `manager.start(30s)` then `manager.wait_for_health(30s)`.
- **lib.rs setup hook**: Replaced separate `mgr.start()` + `wait_for_health()` with single `boot_backend(&mut mgr)` call; returns `Err` on failure instead of graceful degradation.
- **Exports**: `boot_backend` re-exported from `app_lib` alongside `BackendManager`.
- **stop_backend fix**: Added `.map_err(|e| e.to_string())?` for proper error conversion from `std::io::Error` to `String`.
- **Infrastructure repair**: Reconstructed Cargo.toml, build.rs, and capabilities/default.json (lost during blown slice cleanup). Removed broken icon references from tauri.conf.json.

## Key Decisions
- `BackendManager::start()` internally resolves exe path via `resolve_backend_path()` and calls `start_backend()`, then delegates to `wait_for_health()` — keeping the standalone function API intact.
- `wait_for_port_closed()` accepts `port: u16` argument (not from struct field) to match the existing committed test API.
- `boot_backend()` is a free function (not a method) so it can be tested independently and wired into the Tauri setup hook.
- Setup hook now fails fast: `boot_backend()` error → `return Err(e.into())` — no graceful degradation on boot failure.

## Test Coverage
- `test_boot_backend`: NEW — asserts `boot_backend(&mut manager)` returns `Ok`, then stops.
- `test_start_and_health_check`: EXISTING — passes (now compiles with BackendManager).
- `test_stop_and_port_closure`: EXISTING — passes.
- `test_force_kill_process_tree`: EXISTING — passes.
- **Total**: 4 passed, 0 failed.

## Open Questions
- Tauri build infrastructure (Cargo.toml, build.rs, icons) was reconstructed from forensics docs; may need review against production build expectations.
- The `mobile` cfg warning in lib.rs — should be addressed in a future slice.
