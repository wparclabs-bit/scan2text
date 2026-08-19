# Scan2Text Current State

<!-- MAINTENANCE PROTOCOL: Keep only the Baseline block + last 5 changelog entries here. When you add a new entry, move the oldest entry to second-brain/01-Agent-Memory/Archive/state-history.md. This protects the 45k token cap (AGENTS.md 3.2). -->

## Baseline
- Phase: Phase 11 (WSOD Fix) — S11-FIX68 PY-CONSOLE-TRUE Rebuild
- Date: 2026-08-20
- Tauri shell hash: BFA7535715C23FF830F375BFC1CCA6F27A386CCC82BFB32B013E7D38A2B4DF50
- Backend hash: 8B4F2DB245CD6CD6C175ECC10991BFC88AF3DF1ABADFD5DE8E40893D1C501DEF (folder-based onedir, console=True, S11-FIX68)
- UPX: NOT installed on build machine — upx=False
- pdfium.dll: present in portable dist (_internal/pypdfium2_raw/pdfium.dll, 7.2MB)
- _internal: 706 files, all DLLs present (python312.dll, llama.dll, pdfium.dll, 4 VC++ runtime DLLs)
- Backend tests: 321 passed, 1 pre-existing failure (test_health_contract)
- Frontend tests: 642 passed, 0 failures (full suite deferred to GATE slice)
- PRD: v1.12 source of truth in second-brain/04-Product/
- Next: S11-FIX70 COMPLETE — boot_guard() now skips `os.getpid()` at the top of its `process_iter()` loop, so the frozen backend exe no longer classifies/kills itself (exit 15). Fix is source-only (no rebuild yet); package rebuild + GATE gate is pending to confirm exit 15 is resolved end-to-end on the frozen exe.
- RESULT: S11-FIX70-BootGuard-SelfSkip COMPLETE. boot_guard() gains an `os.getpid()` skip at the top of its process_iter() loop; the current process can never be classified as stale or foreign. TDD RED→GREEN: test_boot_guard_never_kills_itself (RED, "kill called once") → green (6/6). Fix committed e301f29 (boot_guard.py + test_boot_guard.py). Status: GREEN (fix committed; rebuild pending in GATE).

## Recent Changelog
- **2026-08-20 (S11-FIX70-BootGuard-SelfSkip):** COMPLETE — boot_guard() self-termination fixed. The frozen backend exe's own process name (`scan2text-backend.exe`) matched `_BACKEND_EXE_NAMES` during `psutil.process_iter()`, so boot_guard appended its own PID to `ours_pids` and killed the live process ~3s after boot (exit 15). Added `if proc.pid == os.getpid(): continue` at the top of the process_iter() loop so the current process is never classified as stale or foreign. FIX62's stale-zombie-killing purpose is preserved — only self-matching is removed. TDD RED→GREEN: test_boot_guard_never_kills_itself (RED, kill called once) → green (6/6). Committed e301f29. Backend rebuild + GATE gate pending. Status: COMPLETE.
- **2026-08-20 (S11-DIAG-EXE-NAME-FORENSICS):** DIAG — ROOT CAUSE FOUND. Exit 15 caused by `boot_guard()` self-termination: `_BACKEND_EXE_NAMES` contains `"scan2text-backend.exe"`, `psutil.process_iter()` scans all processes including self, basename matches, process kills itself. Renaming exe to `scan2text-backend-renamed.exe` → survives 10+ seconds and runs Uvicorn on 47351. Fix: add `if proc.pid == os.getpid(): continue` in boot_guard.py's first process scan loop. Zero source edits. Status: RED (root cause identified, fix pending).
- **2026-08-20 (S11-FIX68-PY-CONSOLE-TRUE):** REBUILD — Spec already had console=True (no edit needed). Clean rebuild: exit code 0, new SHA256 8B4F2DB2... Exit code 15 PERSISTS — exe dies after ~6-7s with no stdout/stderr. Diagnostic twin (identical spec, different name) stays alive on port 47351. Console flag is NOT the root cause. All DLLs verified present. Status: RED.
- **2026-08-20 (S11-DIAG-CONSOLE-TRACE):** DIAG — Built console-enabled diagnostic twin (scan2text-backend-diag.exe). Executable started successfully, ran Uvicorn server on port 47351. No traceback or bootloader text observed in output. Process remained alive after 20 seconds (expected server behavior). Build exit code 1 due to non-empty output directory (resolved by cleaning). Root-cause diagnosis: exit code 15 not found in source; executable runs normally when console enabled.
- **2026-08-19 (S11-FIX67-UPX-OFF-REBUILD):** RED — Disabled UPX (`upx=False`), rebuilt. EXIT CODE 15 PERSISTS. Discovery: UPX is NOT installed on build machine — `upx=True` was a no-op. Both builds produce identical _internal (89.98 MB, 706 files). Process stays alive ~7s then exits silently with code 15. No stdout/stderr. No event log faults. UPX is NOT the root cause. New SHA256: C85266BAF90C6073254C39F285A10A2E1A70175DDF8578C8C7A4E58051E30802. Spec change committed. Root-cause diagnosis needed in separate slice.
