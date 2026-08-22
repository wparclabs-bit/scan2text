# S11-DIAG-LINGER-PROCESSES — Diagnostic Report

**Date:** 2026-08-20  
**Status:** DIAGNOSIS COMPLETE — Zero source edits  
**Slice Type:** Forensics + live evidence + report only

---

## PID/Parent Table (Live Run @ 18:06:52–18:07:10)

| # | Name | PID | Parent PID | Created | CommandLine |
|---|------|-----|------------|---------|-------------|
| 1 | Scan2Text.exe | 20400 | 18936 (explorer) | 18:06:52 | `"D:\Scan2Text\Scan2Text.exe"` |
| 2 | scan2text-backend.exe | 8020 | **9548** (DEAD) | 18:06:53 | `\\?\D:\Scan2Text\backend\scan2text-backend.exe` |
| 3 | scan2text-backend.exe | 15380 | 8020 | 18:06:55 | `"D:\Scan2Text\backend\scan2text-backend.exe" "--multiprocessing-fork" "parent_pid=8020" "pipe_handle=2244"` |

**Key observations:**
- PID 9548 (parent of backend #1) is **DEAD** — phantom parent. Not a child of Rust shell (PID 20400).
- Rust shell direct children: ONLY `msedgewebview2.exe` (PID 15120). Backend is NOT in the tree.
- Backend #2 is a Python multiprocessing worker child (`--multiprocessing-fork`) of backend #1.
- Port 47351: LISTENING on PID 8020, with 8× TIME_WAIT + 1× FIN_WAIT_2 + 1× CLOSE_WAIT connections.

---

## Classification

### Symptom 1: TWO backends born ~1s apart → **WORKER-CHILD (confirmed)**
- Backend #2 (PID 15380) is parented by backend #1 (PID 8020), spawned via Python multiprocessing `--multiprocessing-fork`.
- This is the PyInstaller onedir artifact's internal worker mechanism. NOT a double-spawn by the shell.
- **Classification: worker-child** — the "second process" is a legitimate Python multiprocessing fork, not a Rust double-spawn.

### Symptom 2: BOTH survive after shell close → **ORPHAN-ON-EXIT (confirmed)**
- After killing Scan2Text.exe (PID 20400), both backend processes (PIDs 8020, 15380) survived.
- Root cause: Backend #1's parent PID is 9548 (phantom/dead), NOT the Rust shell (20400).
- The Rust shell's `BackendManager.child` handle does NOT correspond to PID 8020 — the backend was spawned by an intermediary process (PID 9548) that has since exited.
- When the Rust shell exits, its cleanup handlers (`RunEvent::ExitRequested`, `RunEvent::WindowEvent::CloseRequested`) call `guard.stop()`, but this operates on a `child` handle that doesn't match the actual running backend PID.
- **Classification: orphan-on-exit** — missing kill-on-exit linkage between Rust shell and actual backend process.

### Symptom 3: Backend parent is phantom PID 9548 → **INTERMEDIARY SPOWNER (diagnosed)**
- PID 9548 spawned both the backend AND a `conhost.exe` wrapper, then exited.
- This is consistent with Windows process creation when a GUI process (`windows_subsystem = "windows"`) spawns a child that requires console allocation.
- The Rust `std::process::Command::spawn()` on Windows uses `CreateProcessW`. With the shell having `#[cfg_attr(not(debug_assertions), windows_subsystem = "windows")]`, the child may be created via an intermediary that handles console/window association.
- **The Rust shell's `BackendManager.child` handle is disconnected from the actual backend process tree.**

---

## Rust Spawn/Kill Sites (file:line)

### Spawn Sites
| File | Line | Function | Description |
|------|------|----------|-------------|
| `backend_process.rs` | 270–279 | `start_backend()` | **Primary spawn**: `spawn_config().spawn()`. Pipes stdout/stderr to log file. CREATE_NO_WINDOW flag. Called from `BackendManager.start():65`. |
| `lib.rs` | 131–138 | `start_backend_process()` | Secondary spawn (stdout/stderr → null). NOT called by production code path. |

### Kill/Stop Sites
| File | Line | Function | Description |
|------|------|----------|-------------|
| `backend_process.rs` | 283–287 | `stop_backend()` | `child.kill()` + `child.wait()`. Simple, no escalation. |
| `lib.rs` | 141–181 | `stop_backend_process()` | `taskkill /F /T /PID` with fallback chain (taskkill → direct kill → wait). |
| `lib.rs` | 337–354 | `force_kill_process_tree()` | `taskkill /F /T /PID`. Used as escalation in cleanup. |

### Cleanup/Hook Sites
| File | Line | Event | Description |
|------|------|-------|-------------|
| `lib.rs` | 366–390 | `.setup()` | Calls `boot_backend(&mut mgr)` — spawns backend on app init. |
| `lib.rs` | 396–407 | `RunEvent::WindowEvent::CloseRequested` | Calls `guard.stop()` on window close. |
| `lib.rs` | 409–417 | `RunEvent::ExitRequested \| Exit` | Calls `guard.stop()` on app exit. |

### Idempotency Guard
| File | Line | Description |
|------|------|-------------|
| `backend_process.rs` | 56–62 | `BackendManager.start()`: checks if existing child is alive → returns Ok if alive. Falls through to restart if dead. |

---

## Root Causes

### RC1: Phantom Parent / Disconnected Child Handle (Primary)
The backend process (PID 8020) was spawned by an intermediary process (PID 9548) that has since exited. The Rust shell's `BackendManager.child` handle does NOT correspond to PID 8020. When the Rust shell exits, its cleanup handlers operate on a stale/disconnected handle — the actual backend is orphaned.

**Mechanism:** On Windows, when a GUI process (`windows_subsystem = "windows"`) spawns a child via `CreateProcessW`, the child may be created through an intermediary that handles console/window association. This intermediary (PID 9548) spawns the backend and conhost, then exits. The Rust shell's `Child` handle tracks the intermediary, not the actual backend.

### RC2: No Process Tree Kill on Exit
`BackendManager.stop()` uses `child.kill()` which only kills the direct child. It does NOT use `taskkill /T` to kill the process tree. Even if the handle were correct, Python multiprocessing workers (PID 15380) would survive as orphans.

### RC3: No Port-After-Kill Verification
`BackendManager.stop()` returns immediately after `child.kill()`. It does NOT wait for port 47351 to close. The `stop_backend_process()` in `lib.rs` has this verification, but it's not used by the production path.

---

## Minimal Fix Proposal (ZERO edits in this slice)

### Fix A: Single-Spawn Guard (prevent double-spawn risk)
- **File:** `backend_process.rs:56–62`
- **Change:** Add a `spawned` boolean flag to `BackendManager`. Set to `true` after successful spawn. Check before spawning. This prevents any race condition where the health-check wait could overlap with a re-entry.

### Fix B: Kill Process Tree on Exit (fix orphan-on-exit)
- **File:** `backend_process.rs:283–287` → `stop_backend()`
- **Change:** Replace `child.kill()` with `taskkill /F /T /PID <pid>` (Windows) or `kill -9` + process tree walk (Unix). This ensures Python multiprocessing workers are also killed.

### Fix C: Capture Actual PID via WMI/Query (fix phantom parent)
- **File:** `backend_process.rs:270–279` → `start_backend()`
- **Change:** After spawn, query the actual PID of the running backend process via port scan or WMI, and update `BackendManager.child` to match. Alternatively, use `CREATE_NO_WINDOW` consistently and verify parent-child relationship.

### Fix D: Port-After-Kill Verification
- **File:** `backend_process.rs:101–107` → `BackendManager.stop()`
- **Change:** After kill, wait for port 47351 to close (with timeout). This provides verification that the backend actually terminated.

### Priority Order
1. **Fix B** (kill process tree) — eliminates orphan survivors
2. **Fix C** (capture actual PID) — fixes phantom parent root cause
3. **Fix A** (spawn guard) — prevents double-spawn edge case
4. **Fix D** (port verification) — adds safety verification

---

## Zero-Edits Confirmation
**CONFIRMED:** No source files were modified. This slice produced only diagnostic analysis, live evidence capture, and documentation updates.
