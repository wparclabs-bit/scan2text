# Slice S10-R3: Rust Boot Log

## What Changed
- `frontend/src-tauri/src/backend_process.rs`: Replaced `Stdio::null()` in `start_backend()` with log file piping.
- Added `derive_log_path(exe_dir)` → `<exe_dir>/logs/backend-boot.log`.
- Added `ensure_log_dir(log_path)` → `create_dir_all(log_path.parent())`.
- Added `spawn_config(exe_path, log_path)` → `OpenOptions::new().create(true).append(true).open(log_path)` with `try_clone()` for shared file handle on stdout+stderr.
- Removed `Stdio` import (no longer needed; `OpenOptions` replaces it).

## Key Decisions
- Log path: `<exe_dir>/logs/backend-boot.log` (relative to the Tauri exe's parent directory).
- Append mode: `OpenOptions::append(true)` so repeated spawns accumulate logs.
- Shared file handle: `try_clone()` lets both stdout and stderr write to the same file.
- Boot log is diagnostic (not app log); exempt from "no file names, no content" rule per CEO locked decisions.

## Test Coverage
- `test_derive_log_path` — verifies path construction.
- `test_ensure_log_dir_creates_directory` — verifies `create_dir_all` + cleanup.
- `test_spawn_config_pipes_to_log` — verifies `spawn_config()` returns a valid `Command`.
- `test_spawn_config_log_captures_stdout` — end-to-end: spawn `cmd.exe /c echo`, verify log contains output.

## Open Questions
- Log rotation: boot log can grow large; future slice may need rotation.
- stderr vs stdout separation: currently merged; could split if diagnostic needs arise.

## Verification
- `cargo test` — 4 new tests pass, 9 total (4+1+4).
- `cargo build` — compiles clean.
- No frontend or Python changes.
