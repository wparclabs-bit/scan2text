# S9.5 Tauri Sidecar Forensics (Read-Only)

## What Changed
- Read-only forensics slice: mapped Tauri directory structure, measured scope, inspected Rust source and config.
- No source code, config, or build files modified.
- Working tree state: 17 modified, 26 untracked (pre-existing from S9.x work).

## Scope Report

### Directory Structure
```
frontend/src-tauri/
├── .gitignore              (2 lines)
├── Cargo.lock              (generated)
├── Cargo.toml              (21 lines)
├── build.rs                (3 lines)
├── tauri.conf.json         (31 lines)
├── capabilities/
│   └── default.json        (218 bytes)
├── icons/                  (16 icon files, full set)
├── src/
│   ├── main.rs             (5 lines)
│   ├── lib.rs              (326 lines)
│   └── backend_process.rs  (243 lines)
├── tests/
│   ├── backend_manager_tests.rs   (52 lines)
│   └── backend_lifecycle.rs       (245 lines)
└── target/                 (build artifacts, gitignored)
```

### Line Counts
| File | Lines | Size |
|------|-------|------|
| src/main.rs | 5 | ~150 B |
| src/lib.rs | 326 | ~11 KB |
| src/backend_process.rs | 243 | ~8 KB |
| tests/backend_manager_tests.rs | 52 | ~2 KB |
| tests/backend_lifecycle.rs | 245 | ~8 KB |
| Cargo.toml | 21 | ~600 B |
| tauri.conf.json | 31 | ~700 B |
| build.rs | 3 | ~40 B |
| capabilities/default.json | ~10 | ~218 B |
| **Total source (excl. target)** | **~866** | **~30 KB** |

### Sidecar/externalBin Config: ABSENT
- `tauri.conf.json` has no `externalBin` field.
- No `bundle.resources` entries for the backend executable.
- Backend is expected to be spawned at runtime via `std::process::Command` from the already-implemented `resolve_backend_path()`.

### Rust Lifecycle Hooks: PARTIALLY IMPLEMENTED
**Present:**
- `AppState(Arc<Mutex<BackendManager>>)` — Tauri managed state ✅
- `RunEvent::ExitRequested | RunEvent::Exit` hook in `lib.rs` — calls `guard.stop()` ✅
- `BackendManager` struct with `start()`, `stop()`, `wait_for_health()`, `wait_for_port_closed()`, `force_kill_tree()`, `get_pid()` ✅
- `resolve_backend_path()` — finds `dist/scan2text-backend/scan2text-backend.exe` ✅
- Legacy `BackendState` + `cleanup_backend_state()` for test isolation ✅
- `wait_for_health()`, `is_port_open()`, `wait_for_port_closed()`, `start_backend_process()`, `stop_backend_process()` free functions ✅

**Missing:**
- `tauri.conf.json` externalBin/sidecar configuration (not needed for spawn-on-demand model)
- No `tauri.plugin` configuration for custom Tauri commands (frontend calls HTTP, not Tauri commands)
- No `beforeExit` / `system-tray` / `window-event` hooks beyond `RunEvent::Exit`

### Current Rust Dependencies
- `tauri = "2.11.3"` (core)
- `tauri-plugin-log = "2"` (logging)
- `serde`, `serde_json` (serialization)
- `log = "0.4"` (logging facade)
- `tauri-build = "2.6.3"` (build dependency)
- **No external crates for process management** — uses `std::process::Command` + Windows `taskkill`

### Test Coverage
- `backend_manager_tests.rs`: 3 tests (start+health, stop+port-closure, force-kill)
- `backend_lifecycle.rs`: tests for legacy `BackendState` cleanup path
- All Rust tests pass (10 passed per current state)

### Key Architectural Notes
- Backend is spawned on-demand at Tauri app startup (not a sidecar bundled with the app).
- Path resolution: `CARGO_MANIFEST_DIR` relative → fallback to `current_exe()` traversal → panic.
- Stop uses `taskkill /F /T /PID` on Windows (graceful + fallback to `child.kill()`).
- Health check: raw HTTP GET to `/api/health`, checks for "200" in response body.
- Port closure: best-effort polling with 5x1s verification windows (Windows TIME_WAIT tolerated).
- No Tauri-capabilities beyond `core:default` — frontend communicates via HTTP, not Tauri IPC.

## Recommendation for Next Slicing Strategy
**Split into 2 slices:**

1. **S9.6 — Config Wiring:** Add `externalBin` to `tauri.conf.json` if the backend exe needs to be bundled alongside the app. Add `bundle.resources` entry for `dist/scan2text-backend/`. This is a pure config slice — no Rust code changes. Test: `tauri.conf.json` schema validation + bundle check.

2. **S9.7 — Lifecycle Completion:** Wire the `RunEvent::Exit` hook to actually call `start()` before any frontend requests arrive. Add `tauri::invoke_handler!` if Tauri commands are needed. Verify the full startup → health-check → exit lifecycle with a Tauri-specific test. This is the Rust code slice.

**Alternative (single slice):** If S9.6 config changes are trivial (just adding `externalBin`), combine both into one slice. Risk: exceeds 45k cap if Rust changes are substantial.

**Recommended: 2 slices** — config is independent and low-risk; Rust lifecycle is the heavier lift.

## Test Coverage
- Read-only slice: no tests written or modified.
- Existing Rust tests: 10 passed (baseline).

## Open Questions
- Does the backend exe need to be bundled as a Tauri resource, or is it downloaded at runtime (per ADR-008)?
- Should Tauri commands be added for backend lifecycle, or is HTTP-only sufficient?
- Is the current `resolve_backend_path()` logic sufficient for production bundle layout?
