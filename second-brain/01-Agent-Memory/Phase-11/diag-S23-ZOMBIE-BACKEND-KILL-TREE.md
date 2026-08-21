# S23-DIAG-ZOMBIE-BACKEND-KILL-TREE

- **Slice:** S23 (Phase 11) — diagnosis only, no source edits.
- **Date:** 2026-08-23
- **Status:** DIAGNOSIS COMPLETE
- **Root cause classification:** `KILL_SILENT_FAILURE`
- **Scope:** Rust/Tauri backend lifecycle ONLY. No Rust/Python/frontend edits, no rebuild, no redeploy. PowerShell forensics only.

---

## 1. Symptom (CEO baseline)
Closing `D:\Scan2Text\Scan2Text.exe` (the Tauri shell) leaves `scan2text-backend.exe` alive in Task Manager (~45–65 MB RAM), still bound to `127.0.0.1:47351`. This violates **NFR-05** and the locked **FIX77** lifecycle intent ("Tauri owns spawn AND kill; exit must kill the backend tree within 5s and free port 47351"). Backend boot logs also show repeated `Failed to kill stale PID <n>: process PID not found` self-heal lines.

## 2. Method
1. Clean state (Stop-Process both, confirm port 47351 free — no S22 probe conflict).
2. Rust forensics via `graphify query` + direct source read of `backend_process.rs` and `lib.rs`.
3. Deploy freshness: `Get-FileHash` deployed vs `target/release`.
4. Live probe: launch shell, `WM_CLOSE` (PostMessage) to simulate X, observe backend.
5. Direct-diskriminator: `taskkill /F /T /PID <backend>` to prove the kill command works on this binary.
6. Process-tree tracing (`Get-CimInstance Win32_Process`) to find the backend's real parent.

## 3. Spawn wiring (evidence)
File: `frontend/src-tauri/src/backend_process.rs`
- `BackendManager::start()` **L48–70** (release cfg): resolves path, calls `start_backend(&exe_path)` (**L64**), stores the child **`self.child = Some(child)` (L66)**, arms `watch_for_early_exit` (L67), then `wait_for_health` (L68).
- `start_backend()` **L270–280**: builds `spawn_config`, pipes stdout+stderr to `logs/backend-boot.log`, spawns with `CREATE_NO_WINDOW` (0x08000000, L264).
- `resolve_backend_path()` **L143–172**: locates `backend/scan2text-backend.exe` via CARGO_MANIFEST_DIR or alongside the running exe.
- State lives in `AppState(Arc<Mutex<BackendManager>>)` (`lib.rs:13,365`); booted inside `.setup()` (`lib.rs:375–387`).

**Spawn wiring is correct.** The child IS captured and stored.

## 4. Kill wiring (evidence) — which event triggers it
File: `frontend/src-tauri/src/lib.rs`, `.run()` closure **L394–420**:
- **`RunEvent::WindowEvent { event: WindowEvent::CloseRequested }` → L396–408** → `guard.stop()` (**L402**). **This is the X-close path.**
- `RunEvent::ExitRequested | RunEvent::Exit` → L409–417 → `guard.stop()`.

File: `backend_process.rs`:
- `BackendManager::stop()` **L100–107**: if `self.child` is present, calls `stop_backend(pid, child)` (**L103**).
- `stop_backend()` **L285–329** (Windows branch L286–306): runs
  `taskkill /F /T /PID <pid>` (**L289–290**), `.wait()` (L295); on non-success only `log::warn!` (L300–305). Non-Windows branch is a warn-only no-op (L309–314). Then native fallback `child.kill()` (L317–319, failure swallowed), `let _ = child.wait()` (L320), then port-wait up to 5s (L323–326).

**Kill wiring exists and is structurally correct.** `CloseRequested` DOES reach it.

## 5. Exact kill command + error handling
- Command: **`taskkill /F /T /PID <pid>`** (`backend_process.rs:289–290`).
- Deviation from CEO locked intent: uses **`/PID`**, not the locked **`/IM scan2text-backend.exe`** (`FIX77`: `taskkill /F /IM scan2text-backend.exe /T`). `/PID` targets only the Rust-tracked child PID; `/IM` would catch the daemon by image name regardless of PID.
- Error handling is **silently swallowed**: taskkill non-success → `log::warn!` only (L300–305); native `child.kill()` failure → `log::warn!` then `let _ =` (L318); port-wait timeout → `log::warn!` (L325). **None of these surface in release** — see §7 (no logger installed).

## 6. Deploy freshness
| Artifact | SHA-256 |
|---|---|
| Deployed `D:\Scan2Text\Scan2Text.exe` | `8CDF8DD6C2DBCBA786386FEC4B4EA0E6CB47BE41BDB57079D698F5F9CEE12E19` |
| Release `frontend/src-tauri/target/release/Scan2Text.exe` | `8CDF8DD6C2DBCBA786386FEC4B4EA0E6CB47BE41BDB57079D698F5F9CEE12E19` |
| **Result** | **MATCH** — deployed shell is current and contains the kill wiring. |

→ `DEPLOYED_SHELL_STALE` is **ruled out**. (Note: `00-Current-State.md` baseline records a different hash `7120B637…` "unchanged from S17"; that recorded value is stale vs the actual deployed binary.)

## 7. Live probe timeline
Clean state confirmed first (no processes, port 47351 free). Launch one shell; `WM_CLOSE` via `PostMessage(WM_CLOSE=0x10)` to the shell window handle (faithful PowerShell equivalent of `CloseMainWindow()` / the X button).

| Phase | Shell | Backend | Port 47351 |
|---|---|---|---|
| **Before close** (≈5s after launch) | alive (~25 MB) | **alive** (~65 MB) | **HELD** by backend |
| **After `WM_CLOSE` + 10s** | **DEAD** | **ALIVE (zombie)** | **HELD** by the orphaned daemon |

Zombie reproduced deterministically. Direct-diskriminator: `taskkill /F /T /PID <inner_backend>` → `SUCCESS: … has been terminated`, port freed. **The kill command works on this backend when invoked directly** → `KILL_COMMAND_WRONG` is effectively ruled out; the defect is that the close-path never successfully targets the live daemon.

## 8. Mechanism found: backend daemonization (double-spawn)
`Get-CimInstance Win32_Process` rapid tracing (sub-second snapshots at launch) shows a consistent two-level spawn:

```
shell (my launched PID)
  └─ scan2text-backend.exe  <— OUTER: Rust's self.child (spawned, then exits within ~2s)
       └─ scan2text-backend.exe  <— INNER: real Uvicorn daemon, binds 127.0.0.1:47351, survives
```

Consequences that explain every observation:
- The backend's parent is **never** my launched shell — it is the transient OUTER process (seen as 28756 / 7456 / 7780 / 14720 across probes). This is why naive "parent != shell" readings looked wrong.
- Rust stores the OUTER PID in `self.child`; the OUTER exits (~2s after spawn), leaving the INNER orphaned but holding the port.
- On close, `stop_backend()` runs `taskkill /F /T /PID <outer_pid>` → **`ERROR: The process PID <outer> not found`** (outer already gone). The `/T` tree-kill cannot help because there is no live outer to walk from. Native `child.kill()` no-ops on the dead tracked child. INNER survives silently.
- Correlates with the boot logs: each new boot's Python `boot_guard` reads a PID file (the OUTER/pre-daemonize PID) and finds it `not found` — because that PID exits as part of daemonization.

## 9. Why the kill path is silent (release logger gap)
The Rust `log::debug!`/`warn!` kill-path messages go to **no destination** in production: the `tauri_plugin_log` plugin is only registered inside `if cfg!(debug_assertions)` (`lib.rs:367`). In release there is no global logger, so every `log::warn!` in `stop_backend` is a compile-time no-op. The failure to kill is therefore invisible to the CEO — consistent with "silent failure."

## 10. Root cause classification
**`KILL_SILENT_FAILURE`**

Reasoning against the five options:
- `DEPLOYED_SHELL_STALE` — **ruled out** (hash MATCH).
- `EXIT_KILL_NOT_WIRED_TO_WINDOW_CLOSE` — **ruled out**: `CloseRequested` → `stop()` → `stop_backend()` is present, compiled into the deployed binary, and does execute on close.
- `KILL_COMMAND_WRONG` — **partially applicable** (uses `/PID` not locked `/IM`), but the command syntax/flags are otherwise valid and it DOES kill the backend when pointed at the live process; the defect is *what* it targets, not the command form.
- `KILL_SILENT_FAILURE` — **best fit**: the kill runs on close but fails to terminate the inner daemon, and the failure is swallowed (warn-only logs invisible in release + no-op native fallback). Net effect: backend survives invisibly.
- `UNKNOWN` — not applicable; mechanism identified.

Contributing factors (root of the silent failure):
1. **Backend daemonization** — Rust tracks an outer process that exits; the port-holding daemon is a separate, orphaned child.
2. **`/PID` vs locked `/IM`** — even without daemonization, `/PID <outer>` cannot reach a re-parented inner; `/IM scan2text-backend.exe /T` would.
3. **No release logger** — the failure never surfaces.

## 11. Recommended remediation slice (NOT implemented)
1. **Kill by image name per FIX77 locked intent:** replace `taskkill /F /T /PID <pid>` with `taskkill /F /IM scan2text-backend.exe /T` in `stop_backend()` (`backend_process.rs:289`). This catches the daemonized inner regardless of PID. (Validate `/T`/`/IM` combo on Windows; `/IM` alone enumerates by image and kills the tree.)
2. **Prefer the inner daemon's PID** as a secondary: after spawn, read the backend's PID file (written post-daemonize) to track the real port-holder instead of the OUTER bootstrap PID.
3. **Add a release logger** (e.g., `tauri_plugin_log` under release too, or write Rust logs to `logs/`) so kill-path success/failure is observable.
4. **Assert post-kill:** after `stop_backend`, verify port 47351 is free; if not, escalate to image-name kill rather than silently warning.
5. Add a regression test: spawn → daemonize → simulate close → assert no `scan2text-backend.exe` remains and port 47351 is free.

## 12. Open uncertainty
- Could not read Rust kill-path logs (silent in release) — the conclusion that `stop_backend()` *runs but fails on a dead PID* is inferred from the daemonization evidence + direct-diskriminator, not from a captured Rust log. A release logger (rec #3) would make this airtight.
- The exact Python daemonize/re-exec code path (which file + line writes the PID file and forks the inner) was not traced to source — only inferred from `boot_guard.py` behavior and process-tree evidence.

## 13. Artifacts
- Live probe: launched via `Start-Process`, close via `[user32]::PostMessage(WM_CLOSE)`, port via `Get-NetTCPConnection`.
- Backend log read: `D:\Scan2Text\backend\logs\backend-boot.log` (126 lines; shows repeated daemon boots + `Failed to kill stale PID` self-heal).
- No source files modified. No orphan processes left; port 47351 free at end.
