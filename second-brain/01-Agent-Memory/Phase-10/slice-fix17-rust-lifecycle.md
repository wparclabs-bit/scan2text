# S10-FIX17 — Rust CREATE_NO_WINDOW + Idempotent Boot Guard

## What Changed
- `frontend/src-tauri/src/backend_process.rs`:
  - Added `#[cfg(windows)] use std::os::windows::process::CommandExt`
  - Added `BACKEND_CREATION_FLAGS` constant (0x08000000 = CREATE_NO_WINDOW)
  - Added `spawn_creation_flags()` helper (pub, for testing)
  - Applied `cmd.creation_flags(BACKEND_CREATION_FLAGS)` in `spawn_config()` on Windows
  - Strengthened `BackendManager::start()` idempotent guard: verifies existing child is alive via `try_wait()` before returning Ok(()); restarts if dead
  - Added 2 unit tests: `test_spawn_creation_flags_no_window_on_windows`, `test_boot_backend_single_live_child`
- `frontend/src/lib/api.ts`: wrap `response.json()` in try/catch, throw "Server communication error" on parse failure
- `frontend/src/lib/api.test.ts`: 2 tests for malformed JSON handling

## Key Decisions
- CREATE_NO_WINDOW (0x08000000) applied via `CommandExt::creation_flags()` gated behind `#[cfg(windows)]`
- Idempotent guard uses `try_wait()` to detect dead children — prevents silent reuse of zombie processes
- Python backend multiprocessing (3 total PIDs: 1 Rust-spawned + 2 worker children) is expected behavior; NOT fixable from Rust per NON-GOALS
- Smoke test confirmed: health OK, 1 Rust-spawned backend PID, no black console window

## Test Coverage
- Rust unit tests: 6 passed (was 4) — +2 new
- Frontend tests: 621 passed (was 621) — +2 new
- Backend tests: 247 passed, 1 pre-existing failure (test_health_contract)
- Build: success

## Open Questions
- CEO eyeball verification: no black console window on launch (CREATE_NO_WINDOW applied but requires manual confirm)

## Hashes
- Old shell hash: 5F676E6DC16E2390FFACE55FD49DAE15B20FE26E46BD1DDAD294C249648643DA
- New shell hash: 8CC8E16239C86A083C23C78D2E0B7A70927169BE435B8B81DA12646BECAC4A3E
