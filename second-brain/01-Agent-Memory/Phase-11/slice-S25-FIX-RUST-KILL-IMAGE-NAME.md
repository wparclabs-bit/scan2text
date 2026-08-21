# S25-FIX-RUST-KILL-IMAGE-NAME

**Slice:** S25 | **Phase:** 11 | **Date:** 2026-08-23
**Baseline:** S23-DIAG-ZOMBIE-BACKEND-KILL-TREE diagnosed `KILL_SILENT_FAILURE`
**Status:** COMPLETE

## Problem

The Python backend daemonizes (double-spawn pattern): the Rust-spawned outer process spawns a second `scan2text-backend.exe` (inner Uvicorn daemon) and exits within ~2s. Rust tracks only the outer PID in `self.child`. On window close:

1. `RunEvent::WindowEvent::CloseRequested` → `guard.stop()` → `stop_backend()`
2. `stop_backend()` runs `taskkill /F /T /PID <outer_pid>`
3. Outer PID is already gone → taskkill fails silently (returns non-zero)
4. Native `child.kill()` fallback no-ops on the dead child
5. Inner Uvicorn daemon survives as a zombie (~65MB, holding port 47351)

This violates NFR-05 (process must terminate on exit) and the locked FIX7 intent.

## Root Cause

Kill command uses `/PID` targeting the outer process. The daemonized inner process has a different PID that is never tracked. Image-name targeting (`/IM`) is required to catch both processes via the `/T` (tree) flag.

## Solution

### Code Changes — `frontend/src-tauri/src/backend_process.rs`

1. **Extracted `build_kill_command(pid)`** — new public function that builds the taskkill command with CEO-locked args:
   ```
   taskkill /F /IM scan2text-backend.exe /T
   ```
   - `/F` = force kill
   - `/IM scan2text-backend.exe` = target by image name (catches daemonized inner)
   - `/T` = kill process tree (kills parent + all children)

2. **Updated `stop_backend(pid, child)`** — replaced inline `Command::new("taskkill")` with `build_kill_command(pid)`. Updated debug log message to reflect new command format.

3. **Logging fix** — changed failure path from `log::warn!` to `log::error!`:
   - Debug builds: `log::error!` (visible via tauri-plugin-log)
   - Release builds: `eprintln!("[ERROR] ...")` fallback (guaranteed console visibility since release logger plugin is gated by `cfg(debug_assertions)`)

4. **Added TDD test** — `test_kill_command_uses_image_name_not_pid`:
   - Verifies `/IM` flag present
   - Verifies `scan2text-backend.exe` image name target
   - Verifies `/T` and `/F` flags present
   - Asserts `/PID` is NOT present (the bug being fixed)

## Verification

- **Targeted test:** `cargo test test_kill_command_uses_image_name_not_pid` — GREEN (1 passed)
- **Zero errors:** `cargo check --message-format=short` — finished with 0 errors
- **Release compile:** `cargo build --release` — compiles successfully (release test harness has pre-existing Tauri DLL issue `0xc0000139`, not related to this change)
- **Git diff:** only `frontend/src-tauri/src/backend_process.rs` changed

## Files Changed

| File | Change |
|------|--------|
| `frontend/src-tauri/src/backend_process.rs` | +47 lines: `build_kill_command()`, updated `stop_backend()`, new test |

## Commits

1. **Fix commit:** `feat(S25): use taskkill /IM for backend kill to fix zombie daemon` — `backend_process.rs`
2. **Docs commit:** `docs: S25-FIX-RUST-KILL-IMAGE-NAME summary` — Obsidian docs only

## CEO Locked Decisions Honored

- PowerShell only for kill command
- Rust codebase only (no Python edits)
- TDD mandatory (RED→GREEN loop followed)
- Lifecycle intent: `taskkill /F /IM scan2text-backend.exe /T` on exit
