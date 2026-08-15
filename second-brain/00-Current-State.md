# Scan2Text Current State

<!-- MAINTENANCE PROTOCOL: Keep only the Baseline block + last 5 changelog entries here. When you add a new entry, move the oldest entry to second-brain/01-Agent-Memory/Archive/state-history.md. This protects the 45k token cap (AGENTS.md 3.2). -->

## Baseline
- Phase: Phase 10 (E2E Packaged Verification) — MSI + NSIS installers built, portable assembly done, backend wired to HTTP (ADR-008), Rust boot log active (S10-R3)
- Date: 2026-08-16
- Tauri shell hash: ECA0B63C37DE3CAC3670FC6F2C726EFF84FB5C2EE40D0B1A050B563A5A9AF583 (S10-FIX9 rebuilt 2026-08-15)
- Baseline commit: ec9443d (Phase 6 closed)
- Backend tests: 244 passed, 1 pre-existing failure (test_health_contract — dummy models on disk)
- Backend exe hash: FCE98DB5AE3F035DF84A44659F1359F4FB75D51B3F394554A2FDB1A658A03252 (rebuild-swapped 2026-08-16 S10-FIX12a, 3-way match)
- Frontend tests: 85 passed (store), 619 green overall, 0 failures. S10-FIX11c vitest discovery scoping complete.
- Rust tests: 9 passed (4 backend_process unit + 1 backend_lifecycle + 4 backend_manager; 0 failures). S10-R3 build clean (2 dead_code warnings only).
- Boot log: <exe_dir>/logs/backend-boot.log — stdout+stderr piped via OpenOptions append mode (S10-R3)
- PRD: v1.10 source of truth in second-brain/04-Product/
- Next: CEO Final Exam (S10-FIX9 shell rebuilt)

## Recent Changelog (last 5)
- **2026-08-16 (S10-FIX12a-Backend-Rebuild-Swap):** Rebuilt backend exe via PyInstaller (exit 0). Fresh hash FCE98DB5… ≠ stale 61646D82…. Swapped into portable D:\Scan2Text + repo dist. Boot gate PASS: Uvicorn on 127.0.0.1:47351, zero ModuleNotFoundError, zero Model files not found. 3-way hash raw match confirmed. Status: COMPLETE.
- **2026-08-16 (S10-FIX11b-PollJob-Green):** Fixed pollJob catch swallowing non-timeout errors into 'failed'; startPolling retry never firing; guard blocking re-poll. pollJob now re-throws all errors; startPolling handles ALL errors with retry logic; pre-poll guard skips only 'completed'. 2 tests updated, 1 mock fixed. Frontend store: 85 passed, 0 failures. Status: COMPLETE.
- **2026-08-15 (S10-FIX10-Backend-Original-Filename):** Fixed output .md stem using original upload filename instead of UUID hex. `_save_uploaded_file` now returns `(Path, desired_stem)`; `process_files` threads `path_to_stem` dict through `_run_processing` → `queue.process_image_paths`; `resolve_output_path` receives sanitized original stem. 5 new tests added. Backend: 244 passed, 1 pre-existing failure. Status: COMPLETE.
- **2026-08-15 (S10-FIX9-Shell-Rebuild-Swap):** Rebuilt Tauri shell from current frontend source (npx tauri build --no-bundle). Fresh hash ECA0B63C… replaced stale 6918624F… at D:\Scan2Text\Scan2Text.exe. Portable hash match verified. Smoke: shell launched, backend PID(s) 19424/19940/29552, 127.0.0.1:47351 Listen confirmed. No source changes. Status: COMPLETE.
- **2026-08-15 (S10-FIX7-Frontend-Process-Field):** Fixed frontend POST /process 400 error: `api.ts` `uploadFile()` sent FormData with key `'file'` (singular) instead of `'files'` (plural) matching backend's `List[UploadFile]` form field. Changed `formData.append('file', file)` → `formData.append('files', file, file.name)`. 1 new test added (FormData key assertion), 1 existing test updated. Frontend: 617 passed, 0 failures. Status: COMPLETE.
- **2026-08-15 (S10-FIX8c-Swap-Gate-Docs):** Swapped new PyInstaller build from packaging dist into portable + repo dist via in-place boot gate. Boot gate PASS: Uvicorn running on 127.0.0.1:47351, zero ModuleNotFoundError, zero Model files not found. Three-way hash match: packaging dist = portable dist = repo dist = 61646D82…. Status: COMPLETE.
- **2026-08-15 (S10-FIX8-Deadlock-Freeze-And-Executor):** Fixed two overlapping blocks causing backend hang: (1) cli.py now calls `multiprocessing.freeze_support()` before `main()` in the `__main__` block to prevent PyInstaller deadlocks on Windows; (2) main.py now wraps sync `queue.process_image_paths()` in `asyncio.to_thread()` to offload heavy OCR off the event loop. 3 new tests added (2 cli + 1 api). Backend: 239 passed, 1 pre-existing failure. Boot gate passed (Uvicorn running, zero ModuleNotFoundError). Three-way hash match: packaging dist = portable dist = repo dist = 964406C3…. Status: COMPLETE.

For older history see second-brain/01-Agent-Memory/Archive/state-history.md
