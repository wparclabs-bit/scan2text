# S11-FIX67-UPX-OFF-REBUILD

**Date:** 2026-08-19
**Status:** RED (exit code 15 persists)
**Slice:** S11-FIX67-UPX-OFF-REBUILD

## Task
Disable UPX compression in `packaging/scan2text-backend.spec`, rebuild, and prove the exe boots.

## Spec Change
```diff
-    upx=True,
+    upx=False,
     upx_exclude=[],
```
Only line 77 changed. No other spec modifications.

## Build
- Command: `py -3.12 -m PyInstaller packaging\scan2text-backend.spec --clean`
- Exit code: 0 (build success)
- PyInstaller version: 6.22.0
- UPX: **NOT installed** on build machine (`where.exe upx` not found)
- Discovery: `upx=True` was effectively a no-op; `upx=False` produces functionally identical artifact

## Boot Test Results
- **Port 47351:** Never binds (connection refused)
- **Process lifetime:** ~7 seconds, then silent exit
- **Exit code:** 15
- **stdout/stderr:** Empty (zero bytes)
- **Windows Event Log:** No Application error entries
- **Tested from:** `dist\scan2text-backend\` and `D:\Scan2Text\`
- **Result:** RED — exe does not boot

## DLL Inventory (verified present)
- `_internal\python312.dll` (6.9 MB)
- `_internal\llama_cpp\lib\llama.dll` (6.5 MB)
- `_internal\pypdfium2_raw\pdfium.dll` (7.2 MB)
- `_internal\VCRUNTIME140.dll`, `VCRUNTIME140_1.dll`, `MSVCP140.dll`, `VCOMP140.DLL`
- All 706 files present

## Size Comparison
| Metric | UPX build (FIX66) | No-UPX build (FIX67) |
|--------|-------------------|----------------------|
| exe SHA256 | 26F5ECFF...627EE5B | C85266BA...51E30802 |
| exe size | 45,590,138 bytes | 45,590,248 bytes (+110) |
| _internal size | 94,355,465 bytes (reported) | 94,355,465 bytes (89.98 MB actual) |
| _internal file count | 763 | 763 |

Note: The +110 byte difference is PKG metadata, not UPX decompression. Both builds produce identical runtime content because UPX was never active.

## Conclusion
UPX is **not** the root cause of exit code 15. The exit code persists with `upx=False` identically to `upx=True`. The process boots Python (stays alive ~7s) but exits silently before binding port 47351. Root-cause diagnosis requires a separate slice — likely a runtime import error or path resolution issue that is silently swallowed.

## Files Changed
- `packaging/scan2text-backend.spec` (1 line)

## Next
Separate root-cause diagnosis slice needed. Potential leads:
- PyInstaller PKG extraction path resolution
- Hidden import missing at runtime (not caught at build time)
- `sys.frozen` path resolution in `prod_runtime.py`
- Silent exception in `boot_guard.py` or `cli.py` startup
