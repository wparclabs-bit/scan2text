# Scan2Text Current State

<!-- MAINTENANCE PROTOCOL: Keep only the Baseline block + last 5 changelog entries here. When you add a new entry, move the oldest entry to second-brain/01-Agent-Memory/Archive/state-history.md. This protects the 45k token cap (AGENTS.md 3.2). -->

## Baseline
- Phase: Phase 10 (E2E Packaged Verification) — MSI + NSIS installers built, portable assembly done, backend wired to HTTP (ADR-008), Rust boot log active (S10-R3)
- Date: 2026-08-15
- Tauri shell (pre-R3) hash: 6918624F121DBC1886CAA5E9287D2E1B570F1FFD8C9C0CCA7487603710BC12AE (verified 2026-08-15, no R3 changes)
- Baseline commit: ec9443d (Phase 6 closed)
- Backend tests: 239 passed, 1 pre-existing failure (test_health_contract — dummy models on disk)
- Backend exe hash: 964406C3951B763EBA6E1D37ACAF98E30D15D4742757E6478D13BAF0075713D4 (boot-gated 2026-08-15 S10-FIX8, in-place swap with rollback)
- Frontend tests: 617 green, 0 failures. S10-FIX3 tooltip + centering fixes complete. S10-FIX4 tooltip visibility fix complete (forceMount removed, delayDuration={200} CEO-locked). S10-FIX5+FIX6 corrective history complete. S9.4b COMPLETE.
- Rust tests: 9 passed (4 backend_process unit + 1 backend_lifecycle + 4 backend_manager; 0 failures). S10-R3 build clean (2 dead_code warnings only).
- Boot log: <exe_dir>/logs/backend-boot.log — stdout+stderr piped via OpenOptions append mode (S10-R3)
- PRD: v1.10 source of truth in second-brain/04-Product/
- Next: CEO Final Exam

## Recent Changelog (last 5)
- **2026-08-15 (S10-FIX8-Deadlock-Freeze-And-Executor):** Fixed two overlapping blocks causing backend hang: (1) cli.py now calls `multiprocessing.freeze_support()` before `main()` in the `__main__` block to prevent PyInstaller deadlocks on Windows; (2) main.py now wraps sync `queue.process_image_paths()` in `asyncio.to_thread()` to offload heavy OCR off the event loop. 3 new tests added (2 cli + 1 api). Backend: 239 passed, 1 pre-existing failure. Boot gate passed (Uvicorn running, zero ModuleNotFoundError). Three-way hash match: packaging dist = portable dist = repo dist = 964406C3…. Status: COMPLETE.
- **2026-08-15 (S10-DIAG13b-BootGate-Swap-v2):** Boot-gate in-place swap with rollback. Candidate build 14 (DB360FB0…) booted from D:\Scan2Text, stderr confirmed "Uvicorn running on http://127.0.0.1:47351", zero ModuleNotFoundError / zero Model files not found. Three-way hash match: packaging dist = portable dist = repo dist = DB360FB0…. Rollback path available but not exercised. Synced to repo dist. Status: COMPLETE.
- **2026-08-15 (S10-DIAG11-Path-Math-Ghost-Name-Fix):** Fixed _resolve_models_dir() off-by-one parent math (exe_dir.parent → exe_dir.parent.parent) so models at project root are found in frozen portable builds. Eradicated GLM-OCR 0.9B ghost string from health.py (replaced with OvisOCR2 0.9B per ADR-006). Updated test_health_contract assertion. Backend: 236 passed, 1 pre-existing failure. Exe rebuilt + swapped, hash D6C2032E… . Status: COMPLETE.
- **2026-08-15 (S10-OPTION-A-Commit-And-Exam-Prep):** Baseline verification pass. Backend tests: 235 passed, 1 pre-existing failure (test_health_contract). Rust tests: 9 passed (4 unit + 1 lifecycle + 4 manager), build clean (2 dead_code warnings). Portable backend SHA256 verified 39C044AF… — MATCHES expected. Tauri shell SHA256 6918624F… — no R3 changes yet. tauri_plugin_log USED (lib.rs:318). Updated Obsidian baseline + changelog. 3 commits: S10-DIAG9 (PathService fix), S10-R3 (Rust boot-log), S10-OPTION-A (baseline correction + diagnostic/QA artifacts). Remaining dirty: 21 modified + 53 untracked. Status: READY FOR CEO MANUAL VERIFICATION.
- **2026-08-15 (S10-R3-Rust-Boot-Log):** Modified `backend_process.rs` — replaced `Stdio::null()` with `spawn_config()` that pipes stdout+stderr to `<exe_dir>/logs/backend-boot.log` via `OpenOptions::new().create(true).append(true)`. Added `derive_log_path()`, `ensure_log_dir()`, `spawn_config()` helpers. 4 new tests (derive, ensure_dir, pipes_to_log, captures_stdout). Rust tests: 14→18 (verified 9 from --workspace). Status: COMPLETE.
- **2026-08-15 (S10-R2c-Rebuild-Backend-Exe):** Rebuilt scan2text-backend.exe via PyInstaller 6.22.0 from current source (includes `resolve_model_path()` fix from S10-DIAG9). New hash 39C044AF… replaced stale FD9089F5… at D:\Scan2Text\dist\scan2text-backend\scan2text-backend.exe. Hash match verified. No source changes. Status: COMPLETE.

For older history see second-brain/01-Agent-Memory/Archive/state-history.md
