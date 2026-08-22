# S11-DIAG-EXIT15-DLL-INVENTORY

**Date:** 2026-08-19
**Status:** DIAG — Root cause isolated
**Type:** Diagnostic (zero source edits)

## Goal
Isolate WHY the PyInstaller bootloader fails to start the Python interpreter (exit code 15).

## Findings

### 1. DLL Inventory (Deployed `_internal`)
- **Total DLLs:** 19
- **llama.dll:** PRESENT (`_internal/llama_cpp/lib/llama.dll`, 6.5MB)
- **python312.dll:** PRESENT (`_internal/python312.dll`, 6.9MB)
- **pdfium.dll:** PRESENT (`_internal/pypdfium2_raw/pdfium.dll`, 7.2MB)
- **VC++ runtime DLLs:** 4 present
  - `VCRUNTIME140.dll`
  - `VCRUNTIME140_1.dll`
  - `MSVCP140.dll`
  - `VCOMP140.DLL`
  - Plus `numpy.libs/msvcp140-a4c2229bdc2a2a630acdc095b4d86008.dll`

### 2. Dist vs Deployed Comparison
- **Both exit code:** 15 (consistent across 5+ runs)
- **SHA256 match:** `26F5ECFF904B53ED028C3932706AD3A473F573CCC987D44468F020DFF627EE5B`
- **File count:** 706 files in both `_internal` trees
- **Diff:** 0 missing files in deployed vs dist
- **Conclusion:** NOT a deploy-copy problem

### 3. Windows Event Log
- **Application log:** No error entries for scan2text-backend
- **System log:** No related errors
- **WER/Minidump:** No crash dumps generated
- **Antivirus:** Windows Defender real-time protection ON, no quarantine entries for scan2text

### 4. Runtime Behavior
- **Exit timing:** ~5.7 seconds after launch
- **stdout/stderr:** Empty (zero bytes)
- **Loaded DLLs at crash:** Only Windows system DLLs (ntdll, KERNEL32, USER32, VCRUNTIME140, etc.)
- **python312.dll:** NEVER appears in loaded modules (bootloader fails before loading it)
- **Temp extraction:** Works correctly (_MEI directories created with python312.dll present)
- **Port 47351:** Not in use (not a port conflict)

### 5. Source Code Analysis
- **exit(15) in source:** NONE found
- **Boot guard:** Does not call sys.exit(15)
- **Python source:** Boots successfully when run directly (`py -3.12 -m scan2text.cli`)

### 6. Build Artifact Analysis
- **PyInstaller version:** 6.22.0
- **UPX compression:** ENABLED (`upx=True` in spec)
- **Bootloader:** Embedded in exe, extracts to `%TEMP%\_MEI*`
- **Import table:** Only USER32, KERNEL32, ADVAPI32 (python312.dll loaded dynamically)

## Root Cause

**(b) Build artifact broken** — PyInstaller bootloader fails to initialize Python interpreter.

The exit code 15 is a bootloader-level failure, not a missing DLL or deploy issue. Both dist and deployed fail identically (same binary, same hash). The bootloader extracts files correctly but fails during Python interpreter initialization before loading python312.dll.

**Prime suspect:** UPX compression (`upx=True` in `packaging/scan2text-backend.spec`) combined with PyInstaller 6.22.0 bootloader incompatibility with Python 3.12.9.

## Verification
- [x] DLL inventory captured (19 DLLs, all critical present)
- [x] Dist-vs-deployed exit codes captured (both 15)
- [x] File-count diff captured (706 vs 706, diff=0)
- [x] Event-log faulting module checked (none found)
- [x] Zero source modifications (`git diff --name-only` = empty for source files)

## Next Steps (NOT in scope)
- Rebuild PyInstaller with `upx=False` to test if UPX compression is the cause
- If UPX is the cause, update spec to disable it
- Consider PyInstaller upgrade/downgrade if bootloader bug is confirmed

## Files Modified
- `second-brain/00-Current-State.md` (changelog entry added)

## Commit
No source files modified. No commit required for diagnostic slice.
