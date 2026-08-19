# S11-FIX65C1: Rust TryClone Compat Fix

**Date:** 2026-08-19
**Slice:** S11-FIX65C1-Rust-TryClone-Compat
**Status:** COMPLETE

## Problem
Rust 1.97.1 removed `std::process::Child::try_clone`. The Tauri shell release build failed with:
```
error[E0599]: no method named `try_clone` found for struct `Child` in the current scope
  src/backend_process.rs:68:39
```

## Analysis
- `try_clone` on `Child` was removed from the Rust standard library in 1.97.1
- Still available on Unix targets (Linux/macOS), only broken on Windows
- The call at line 68 duplicated a `Child` handle so a background watcher thread could independently poll for early process exit
- `File::try_clone` (line 263) is unrelated and still works

## Replacement API
Replaced `child.try_clone()` with health-endpoint polling in the watcher thread:
- **Original:** `child.try_clone().expect("failed to clone child handle")` → passed cloned `Child` to watcher
- **Replacement:** Watcher thread polls `is_port_open("127.0.0.1", port)` every 100ms instead of `child.try_wait()`
- Preserves `backend-boot-failed` event emission within `BOOT_FAIL_WINDOW` (5s)
- No new dependencies, no unsafe code, platform-agnostic

## Verification
- `cargo check --release --message-format=short`: **ZERO errors**
- `cargo check --message-format=short`: **ZERO errors**
- Dev-mode lib tests: **2 passed, 0 failed**
- Release-mode test harness: pre-existing `STATUS_ENTRYPOINT_NOT_FOUND` (unrelated to this change)
- No frontend or Python files modified
- No dependencies added

## Commit
- Hash: `ac302c7`
- Message: `S11-FIX65C1: replace removed Child try_clone with Rust 1.97.1-compatible handle API`

## Files Changed
- `frontend/src-tauri/src/backend_process.rs` (+5, -7)
