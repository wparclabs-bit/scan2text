# S11-FIX70-GATE-Rebuild-BootProof

**Date:** 2026-08-20
**Phase:** Phase 11 (WSOD Fix)
**Status:** COMPLETE

## Context
S11-FIX70 committed (e301f29): `boot_guard()` now skips own PID via `if proc.pid == os.getpid(): continue`. 6/6 boot_guard tests green. Previous artifacts (dist and D:\Scan2Text\backend) still contained the suicidal boot_guard and self-kill with exit 15 under the real exe name.

## Objective
Full backend suite + PyInstaller rebuild + prove the REAL-NAMED exe now boots and stays alive. ZERO source edits.

## Tasks Executed

### 1. Full Backend Suite
```
$env:PYTHONPATH="src"; py -3.12 -m pytest -q --tb=line tests/
```
**Result:** 322 passed, 1 failed (pre-existing allowed: `test_health_contract`)

### 2. PyInstaller Rebuild
```
py -3.12 -m PyInstaller packaging\scan2text-backend.spec --clean
```
**Result:** Exit code 0. Clean build. 765 files in output folder.

### 3. Boot Proof (Diagnostic Run)
- Killed lingering `scan2text-backend*` processes
- Confirmed port 47351 free
- Started `dist\scan2text-backend\scan2text-backend.exe` (real name)
- Waited 15 seconds
- **Process ALIVE:** PIDs 22624, 23984
- **Health endpoint:** `{"status":"ok","worker":"idle","ram":{"total_mb":48233,"used_mb":38273,"percent":79.4},"cpu":{"percent":0.0},"model":{"name":"OvisOCR2 0.9B","loaded":true,"files_present":true},"version":"0.1.0"}`
- Stopped processes

### 4. DLL Verification
| DLL | Path | Status | Size |
|-----|------|--------|------|
| python312.dll | `_internal\python312.dll` | PRESENT | - |
| llama.dll | `_internal\llama_cpp\lib\llama.dll` | PRESENT | 6.21 MB |
| pdfium.dll | `_internal\pypdfium2_raw\pdfium.dll` | PRESENT | 6.88 MB |
| VCRUNTIME140.dll | `_internal\VCRUNTIME140.dll` | PRESENT | - |
| VCRUNTIME140_1.dll | `_internal\VCRUNTIME140_1.dll` | PRESENT | - |
| MSVCP140.dll | `_internal\MSVCP140.dll` | PRESENT | - |
| VCOMP140.DLL | `_internal\VCOMP140.DLL` | PRESENT | - |

### 5. SHA256
```
scan2text-backend.exe: B94612C9F074D4EA734D7090FA7A63050E409C9405AC95E1AC4CF810409F2A53
```

## Verification
- [x] Suite counts as expected (322 passed, 1 allowed failure)
- [x] Build exit code 0
- [x] Real-named exe alive at 15s with valid health response
- [x] SHA256 recorded
- [x] Zero source modifications (this slice only updates docs + rebuilds)

## Result
Exit 15 ROOT CAUSE RESOLVED. The `boot_guard()` self-kill bug is fixed in source (e301f29) and proven fixed in the rebuilt artifact. The real-named exe (`scan2text-backend.exe`) boots, stays alive, and serves health checks on port 47351 with OvisOCR2 0.9B model loaded.

## Files Changed
- `second-brain/00-Current-State.md` — updated baseline + changelog
- `second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX70-GATE-Rebuild-BootProof.md` — this file
- `dist/scan2text-backend/` — rebuilt artifact (not committed)
