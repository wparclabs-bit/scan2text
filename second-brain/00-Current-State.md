# Scan2Text Current State

<!-- MAINTENANCE PROTOCOL: Keep only the Baseline block + last 5 changelog entries here. When you add a new entry, move the oldest entry to second-brain/01-Agent-Memory/Archive/state-history.md. This protects the 45k token cap (AGENTS.md 3.2). -->

## Baseline
- Phase: Phase 11 (WSOD Fix) — S11-FIX67 UPX-OFF Rebuild
- Date: 2026-08-19
- Tauri shell hash: BFA7535715C23FF830F375BFC1CCA6F27A386CCC82BFB32B013E7D38A2B4DF50
- Backend hash: C85266BAF90C6073254C39F285A10A2E1A70175DDF8578C8C7A4E58051E30802 (folder-based onedir, upx=False, S11-FIX67)
- UPX: NOT installed on build machine — upx=True was effectively a no-op; upx=False is functionally identical
- pdfium.dll: present in portable dist (_internal/pypdfium2_raw/pdfium.dll, 7.2MB)
- _internal size: 89.98 MB (706 files) — unchanged from UPX build (94.36 MB reported was incorrect; both builds produce identical _internal)
- Backend tests: 321 passed, 1 pre-existing failure (test_health_contract)
- Frontend tests: 642 passed, 0 failures (full suite deferred to GATE slice)
- PRD: v1.12 source of truth in second-brain/04-Product/
- Next: Root-cause exit code 15 (separate slice needed)
- RESULT: S11-FIX67 COMPLETE (spec change + rebuild). Exit code 15 PERSISTS — UPX was not the cause. Status: RED (boot fails), READY FOR ROOT-CAUSE DIAGNOSIS SLICE.

## Recent Changelog
- **2026-08-19 (S11-FIX67-UPX-OFF-REBUILD):** RED — Disabled UPX (`upx=False`), rebuilt. EXIT CODE 15 PERSISTS. Discovery: UPX is NOT installed on build machine — `upx=True` was a no-op. Both builds produce identical _internal (89.98 MB, 706 files). Process stays alive ~7s then exits silently with code 15. No stdout/stderr. No event log faults. UPX is NOT the root cause. New SHA256: C85266BAF90C6073254C39F285A10A2E1A70175DDF8578C8C7A4E58051E30802. Spec change committed. Root-cause diagnosis needed in separate slice.
- **2026-08-19 (S11-DIAG-EXIT15-DLL-INVENTORY):** DIAG — Root cause isolated: **(b) build artifact broken**. Both dist and deployed executables (identical SHA256) exit code 15. Deployed _internal has all 19 DLLs including llama.dll, python312.dll, pdfium.dll, and 4 VC++ runtime DLLs. File counts match (706 each). No missing DLLs, no event log faults, no antivirus quarantine. Exit code 15 = PyInstaller bootloader failure to initialize Python interpreter. Prime suspect: UPX compression (`upx=True` in spec) + PyInstaller 6.22.0 bootloader incompatibility. Zero source edits.
- **2026-08-19 (S11-DIAG-EXIT-15):** DIAG — Exit code 15 originates from the PyInstaller bootloader, not from Python source code. Raw interpreter boots successfully (exit code 0). No stdout/stderr from .exe. Source code contains no exit(15) calls.
- **2026-08-19 (S11-FIX66-GATE-Backend-Rebuild):** COMPLETE — Full backend suite: 321 passed, 1 pre-existing failure (test_health_contract). PyInstaller rebuild with packaging/scan2text-backend.spec: exit code 0, dist\scan2text-backend\scan2text-backend.exe present, _internal\python312.dll + _internal\pypdfium2_raw\pdfium.dll present. New SHA256: 26F5ECFF904B53ED028C3932706AD3A473F573CCC987D44468F020DFF627EE5B. Zero source files modified. Re-deploy to D:\Scan2Text is a SEPARATE step.
- **2026-08-19 (S11-FIX66-BootGuard-Psutil-AccessDenied):** COMPLETE — Wrapped all psutil attribute access in boot_guard.py with try/except for AccessDenied/NoSuchProcess. Fixes crash on PID 0/4. +1 test. Committed b0786ff. Backend rebuild pending.
