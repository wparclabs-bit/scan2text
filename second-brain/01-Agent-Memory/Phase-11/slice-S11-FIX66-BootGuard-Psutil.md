# S11-FIX66: BootGuard Psutil AccessDenied

**Date:** 2026-08-19
**Status:** COMPLETE, pending backend rebuild
**Commit:** b0786ffcbef62d2ae8cb7c9705adbeb3a4169ee7

## Problem
`boot_guard.py` crashes on startup with `psutil.AccessDenied` for protected Windows PIDs (0 = System Idle, 4 = System). This causes the backend to fail to boot, resulting in a blank application window.

## Root Cause
`psutil.process_iter()` with explicit `.exe()` and `.status()` calls had no `try/except` for `psutil.AccessDenied`. While `process_iter(attrs=...)` internally skips processes that raise on attribute access, the explicit calls at lines 40 and 45 were unprotected.

## Fix
Wrapped all psutil attribute access in `boot_guard.py` with `try/except (psutil.NoSuchProcess, psutil.AccessDenied)`:
- Line 42: Added `AccessDenied` to existing `status()` except clause
- Line 45-47: Added new try/except around `proc.exe()` call
- Line 73-76: Added try/except around `foreign.exe()` call in error logging

No core logic changed — only exception handling added.

## Test
`test_boot_guard_survives_access_denied` — mocks a process at PID 0 that raises `AccessDenied` on `.exe()`, `.name()`, and `.status()`. Asserts `boot_guard()` returns None without raising.

## Files Changed
- `src/scan2text/boot_guard.py` (+9 lines, -3 lines)
- `tests/test_boot_guard.py` (+27 lines)

## Verification
- `py -3.12 -m pytest tests/test_boot_guard.py -q --tb=line` → 5 passed
- Full suite deferred to GATE slice
