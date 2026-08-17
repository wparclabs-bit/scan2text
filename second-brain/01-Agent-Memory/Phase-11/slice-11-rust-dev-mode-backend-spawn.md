# S11-FIX-Rust-Dev-Mode-Backend-Spawn

## What Changed
- `frontend/src-tauri/src/backend_process.rs`: Added `#[cfg(debug_assertions)]` early-return in `BackendManager::start()` and `boot_backend()` so the Tauri shell skips spawning the PyInstaller backend executable when running in debug/dev mode. The dev script (`dev.ps1`) already manages the Python Uvicorn backend on port 8000.
- Gated all release-only code with `#[cfg(not(debug_assertions))]`: `resolve_backend_path()`, `derive_log_path()`, `ensure_log_dir()`, `BACKEND_CREATION_FLAGS`, `spawn_config()`, `start_backend()`, and their unit tests.
- Gated integration tests `backend_lifecycle.rs` and `backend_manager_tests.rs` with `#![cfg(not(debug_assertions))]` since they require the PyInstaller backend exe.
- Gated `spawn_creation_flags()` and its test with `#[cfg(all(windows, not(debug_assertions)))]` to eliminate the dead_code warning.
- Fixed unused import warnings by gating `PathBuf`, `Command`, and `CommandExt` imports.

## Key Decisions
- Used `#[cfg(debug_assertions)]` / `#[cfg(not(debug_assertions))]` rather than runtime `cfg!()` macros for zero-cost compile-time branching.
- Gated entire integration test files rather than individual tests for cleanliness — these tests are inherently release-mode only.
- Kept `BackendManager::stop()`, `get_pid()`, `wait_for_health()`, and `wait_for_port_closed()` available in both modes since they're part of the public API and safe no-ops when `child` is None.

## Test Coverage
- Rust: `cargo check` — 0 warnings. `cargo test` — clean (release-only tests gated, 0 run in debug).
- Frontend: 633 passed, 0 failures.
- Typecheck: clean. Build: success.

## Open Questions
- None.
