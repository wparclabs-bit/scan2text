# S11-FIX76-RUST-ORPHAN-KILL

**Status:** COMPLETE
**Date:** 2026-08-20
**Slice:** S11-FIX76-RUST-ORPHAN-KILL

## Problem
Rust native `child.kill()` in `backend_process.rs` only kills the immediate child handle. Python's multiprocessing creates a worker-child process that survives as an orphan when the Rust shell exits. An intermediary Windows spawner disconnects the Rust handle from the actual process tree.

## Root Cause (from S11-DIAG-LINGER-PROCESSES)
1. **WORKER-CHILD**: Second backend process is a Python multiprocessing fork (`--multiprocessing-fork`, parent_pid=8020) spawned by the first backend — NOT a shell double-spawn.
2. **ORPHAN-ON-EXIT**: Both backends survive after shell kill. Backend's parent PID is 9548 (phantom/dead intermediary process), NOT the Rust shell.

## Fix Strategy (CEO/CTO approved)
Use Windows `taskkill /F /T /PID <pid>` to kill the entire process tree. Add a port-wait to ensure 47351 is released before returning.

## Changes

### File: `frontend/src-tauri/src/backend_process.rs`

**Lines 8-10 (imports):**
```diff
- #[cfg(not(debug_assertions))]
- use std::process::Command;
- #[cfg(all(windows, not(debug_assertions)))]
- use std::os::windows::process::CommandExt;
+ use std::process::Command;
+ #[cfg(windows)]
+ use std::os::windows::process::CommandExt;
```

**Lines 100-107 (`BackendManager::stop`):**
```diff
  pub fn stop(&mut self) -> Result<(), String> {
      if let Some(ref mut child) = self.child {
-         stop_backend(child).map_err(|e| e.to_string())?;
+         let pid = child.id();
+         stop_backend(pid, child).map_err(|e| e.to_string())?;
      }
      self.child = None;
      Ok(())
  }
```

**Lines 282-329 (`stop_backend` function — complete replacement):**
```diff
- /// Stop the backend process cleanly.
- pub fn stop_backend(child: &mut Child) -> Result<(), std::io::Error> {
-     child.kill()?;
-     let _ = child.wait()?;
-     Ok(())
- }
+ /// Stop the backend process tree via Windows taskkill /F /T /PID <pid>.
+ /// Falls back to native child.kill() if taskkill fails.
+ /// Then waits for port 47351 to close (up to 5 seconds).
+ pub fn stop_backend(pid: u32, child: &mut Child) -> Result<(), String> {
+     #[cfg(windows)]
+     {
+         log::debug!("Attempting taskkill /F /T /PID {} for backend", pid);
+         let mut taskkill = Command::new("taskkill")
+             .args(["/F", "/T", "/PID", &pid.to_string()])
+             .creation_flags(0x08000000) // CREATE_NO_WINDOW
+             .spawn()
+             .map_err(|e| format!("Failed to spawn taskkill: {}", e))?;
+
+         let taskkill_status = taskkill.wait().map_err(|e| {
+             format!("taskkill wait failed for PID {}: {}", pid, e)
+         })?;
+
+         if !taskkill_status.success() {
+             log::warn!(
+                 "taskkill /F /T /PID {} returned non-zero ({}), falling back to native kill",
+                 pid,
+                 taskkill_status.code().map(|c| c.to_string()).unwrap_or_else(|| "unknown".into())
+             );
+         }
+     }
+
+     #[cfg(not(windows))]
+     {
+         log::warn!(
+             "stop_backend called on non-Windows platform; using native child.kill() for PID {}",
+             pid
+         );
+     }
+
+     // Fallback: always attempt native kill as last resort
+     if let Err(e) = child.kill() {
+         log::warn!("Native child.kill() also failed for PID {}: {}", pid, e);
+     }
+     let _ = child.wait();
+
+     // Port-wait loop: ensure 47351 is released
+     match wait_for_port_closed("127.0.0.1", BACKEND_PORT, Duration::from_secs(5)) {
+         Ok(()) => log::debug!("Port {} closed after stop", BACKEND_PORT),
+         Err(e) => log::warn!("Port-wait timeout after stop: {}", e),
+     }
+
+     Ok(())
+ }
```

## Verification
- **cargo check:** zero errors, zero warnings
- **Commit:** `6a1f07f`
- **Diff:** 1 file changed, 49 insertions(+), 7 deletions(-)

## Obsidian Updates
- `second-brain/00-Current-State.md`: FIX76 entry prepended, S11-DIAG-HEALTH404-BACKGROUND-REPOLL moved to archive
- `second-brain/01-Agent-Memory/Archive/state-history.md`: oldest entry archived
