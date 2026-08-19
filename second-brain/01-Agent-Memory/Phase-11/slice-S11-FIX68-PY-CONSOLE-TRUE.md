# S11-FIX68-PY-CONSOLE-TRUE Summary

## Overview
Rebuild backend artifact with console=True to test whether severed stdio streams cause the silent exit code 15.

## Discovery
The spec (`packaging/scan2text-backend.spec`) **already had `console=True`** — the premise "change console=False to console=True" was based on stale information. Git history confirms console=True was present since the initial commit and through S11-FIX67 (which only changed `upx=True` → `upx=False`).

## Steps
1. **Spec verification**: Confirmed `console=True` already present. No edit needed.
2. **Clean rebuild**: `py -3.12 -m PyInstaller packaging\scan2text-backend.spec --clean`. Build exit code: **0**.
3. **Boot test**: Started `dist\scan2text-backend\scan2text-backend.exe`. Process alive at 1s, 3s. Exits at ~6-7s with **exit code 15**. No stdout/stderr. No Windows event log faults.
4. **DLL verification**: python312.dll ✓, llama.dll ✓ (`_internal/llama_cpp/lib/llama.dll`), pdfium.dll ✓ (`_internal/pypdfium2_raw/pdfium.dll`), 4 VC++ runtime DLLs ✓. Total 19 DLLs in _internal.
5. **SHA256**: `8B4F2DB245CD6CD6C175ECC10991BFC88AF3DF1ABADFD5DE8E40893D1C501DEF`

## Key Finding
- **Exit code 15 PERSISTS** despite console=True.
- The console-disabled/console-enabled distinction is NOT the root cause.
- Diagnostic twin (`scan2text-backend-diag.exe`, identical spec except name) stays alive on port 47351 indefinitely.
- Both builds produce identical `_internal` contents (verified via Compare-Object).
- Root cause of exit code 15 remains undiagnosed.

## Files Modified
- `packaging/scan2text-backend.spec` — no change (already had console=True)
- `dist/scan2text-backend/` — rebuilt artifact

## Results
- Build exit code: 0
- Boot test: FAILED (exit code 15 after ~6-7s)
- DLLs: all present
- New SHA256: 8B4F2DB245CD6CD6C175ECC10991BFC88AF3DF1ABADFD5DE8E40893D1C501DEF
- Status: **RED** — exit code 15 persists; console flag is not the root cause

## Next Steps
Continue root-cause diagnosis. Suspects:
- PyInstaller 6.22.0 bootloader bug with onedir + console=True
- Race condition in Uvicorn startup under bootloader
- Resource cleanup/teardown issue after initial bind
- Separate slice needed for deeper bootloader-level investigation
