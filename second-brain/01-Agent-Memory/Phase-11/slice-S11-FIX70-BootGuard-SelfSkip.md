# S11-FIX70-BootGuard-SelfSkip

**Date:** 2026-08-20
**Status:** COMPLETE (fix committed; rebuild + GATE gate pending)

## Executive Summary

Root cause from S11-DIAG-EXE-NAME-FORENSICS is now fixed. `boot_guard()` in `src/scan2text/boot_guard.py` was **self-terminating**: its own process name (`scan2text-backend.exe`) matched `_BACKEND_EXE_NAMES` during `psutil.process_iter()`, so `os.getpid()` was appended to `ours_pids` and the kill loop (`proc.kill()`) destroyed the live backend ~3s after boot. The PyInstaller bootloader surfaces that as **exit code 15**.

The fix adds an `os.getpid()` self-exclusion at the **top** of the single `process_iter()` loop so the current process can never be classified as a stale zombie. FIX62's zombie-killing purpose (freeing port 47351) is fully preserved — only self-matching is removed.

## TDD Cycle (Strict Matt Pocock)

### RED
`test_boot_guard_never_kills_itself` in `tests/test_boot_guard.py` — mocks `psutil.process_iter` to yield one fake process whose `pid == os.getpid()`, whose `exe()`/`name()` return `scan2text-backend.exe`, and whose `kill()` records the call. `mock_psutil.Process.return_value` is wired to that same fake so a self-kill lands on it.

```
.....F  [100%]
FAILED ...::TestBootGuard::test_boot_guard_never_kills_itself
AssertionError: Expected 'kill' to not have been called. Called 1 times.
```
RED confirmed: the unfixed code kills its own PID once.

### GREEN
Added `if proc.pid == os.getpid(): continue` at the top of the `process_iter()` loop + `import os` in `boot_guard.py`.

```
......  [100%]
6 passed in 0.04s
```
All 5 pre-existing tests + 1 new test green.

## Files Changed

| File | Change |
|------|--------|
| `src/scan2text/boot_guard.py` | Added `import os` + `if proc.pid == os.getpid(): continue` at top of `process_iter()` loop. No other logic touched. |
| `tests/test_boot_guard.py` | Added `import os` + `test_boot_guard_never_kills_itself` (RED→GREEN). |

## Non-Goals (respected)

No changes to stale-kill or foreign-owner logic beyond self-exclusion. No Rust/frontend edits. No PyInstaller rebuild (GATE is separate). No full-suite run.

## Verification

- RED output captured before fix; GREEN after.
- `git diff --name-only` for the fix = only `src/scan2text/boot_guard.py` + `tests/test_boot_guard.py`.
- Fix committed: `e301f29`.
- Full backend suite deferred to GATE slice.

## Next

Package rebuild (PyInstaller) + GATE gate to confirm exit 15 is resolved end-to-end on the frozen exe. Backend hash in 00-Current-State.md still reflects S11-FIX68 until the rebuild.

## Context

ADR-008 folder-based onedir. `boot_guard` exists to kill stale `scan2text-backend.exe` holding port 47351 (FIX62). Self-exclusion preserves that purpose while ending the self-kill.
