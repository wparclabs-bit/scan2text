# S11-DIAG-EXE-NAME-FORENSICS

**Date:** 2026-08-20
**Status:** ROOT CAUSE FOUND

## Executive Summary

Exit code 15 is caused by `boot_guard()` in `boot_guard.py` performing **self-termination**. The `_BACKEND_EXE_NAMES` set contains `"scan2text-backend.exe"`, and `boot_guard()` scans all running processes via `psutil.process_iter()`. It finds its own process (basename matches), adds its PID to `ours_pids`, then calls `proc.kill()` on itself. The PyInstaller bootloader receives exit code 15 from the child process.

When the exe is renamed to `scan2text-backend-renamed.exe`, it stays alive and runs Uvicorn normally — proving the filename is the sole trigger.

## Diagnostic Tests Performed

### 1. Zombie Hunt
**Result:** No lingering `scan2text-backend.exe` processes found at time of test.

### 2. Filename Isolation Test
- Copied `scan2text-backend-diag.exe` → `scan2text-backend-test.exe`
- Ran `scan2text-backend-test.exe` with redirected stdout/stderr
- **Result:** Diag test exe stayed alive, printed Uvicorn startup messages, bound to port 47351. **Confirmed: not a filename block for diag-named exe.**

### 3. Real Exe Stdout/Stderr Capture
- Ran `scan2text-backend.exe` with `-RedirectStandardOutput` / `-RedirectStandardError`
- **Result:** Exit code 15. Both files are 0 bytes. Zero output — crash happens during Python startup, not during uvicorn operation.

### 4. Startup Code Forensics
Traced full startup chain:
```
cli.py::main()
  → get_host() / get_port()       # instant, no I/O
  → boot_guard(port)              # SCANS PROCESSES via psutil, KILLS matches
  → uvicorn.run(app, ...)         # lifespan → VlmOcrAdapter → QueueService
```

**Key finding:** `boot_guard()` at `src/scan2text/boot_guard.py:38-93` iterates all processes, checks if their exe basename matches `{"scan2text-backend.exe", "scan2text-backend"}`, and kills any matches. The new process finds **itself** (basename = `scan2text-backend.exe`), adds its PID to `ours_pids`, then kills itself.

### 5. Model Path Check
- `models/` exists at repo root with `vlm.gguf` (811MB) + `mmproj.gguf` (205MB)
- `PathService._resolve_models_dir()` correctly resolves models to repo root via `exe_dir.parent` check
- **Not the root cause** — the process dies before reaching model loading

### 6. Renamed Exe Test (SMOKING GUN)
- Copied real exe to `scan2text-backend-renamed.exe` in a different directory
- Ran it → **stayed alive 10+ seconds**, printed Uvicorn startup, bound to port 47351
- **Confirmed: the issue is 100% the executable filename triggering self-termination in boot_guard.**

## Root Cause

`boot_guard.py` `_is_ours()` matches `scan2text-backend.exe` against itself during process scan. The fix: exclude `os.getpid()` from the kill loop in `boot_guard()`.

## Files Involved

| File | Role |
|------|------|
| `src/scan2text/boot_guard.py` | **Root cause** — self-termination logic |
| `src/scan2text/cli.py` | Entry point — calls boot_guard before uvicorn |
| `src/scan2text/api/main.py` | FastAPI app — lifespan creates VlmOcrAdapter |
| `src/scan2text/utils/prod_runtime.py` | Frozen exe detection, port defaults |
| `packaging/scan2text-backend.spec` | Spec with name="scan2text-backend" |

## Evidence

| Metric | Real exe | Diag exe | Renamed real |
|--------|----------|----------|-------------|
| Name | scan2text-backend | scan2text-backend-diag | scan2text-backend-renamed |
| Behavior | Dies at 3s, exit 15 | Lives indefinitely | Lives indefinitely |
| stdout/stderr | 0 bytes | Uvicorn startup messages | Uvicorn startup messages |
| Port 47351 | Never bound | Bound successfully | Bound successfully |

## Fix Required (Out of Scope for This Slice)

In `boot_guard.py`, add `if proc.pid == os.getpid(): continue` in the first loop (line ~45) to exclude the current process from stale-process detection:

```python
for proc in psutil.process_iter(["pid", "exe", "name", "status"]):
    try:
        if proc.pid == os.getpid():  # <-- ADD THIS
            continue
        if proc.status() == psutil.STATUS_ZOMBIE:
            continue
    except (psutil.NoSuchProcess, psutil.AccessDenied):
        continue
```
