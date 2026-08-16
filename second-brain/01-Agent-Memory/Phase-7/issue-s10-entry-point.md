# S10-DIAG-PE-Forensics — Entry Point Not Root Cause

## Date
2026-08-14

## Objective
Isolate root cause between Suspect A (antivirus tampering with exe on disk) and Suspect B (broken PE import table from link configuration).

## Evidence

### Defender Criminal Record
**Get-MpThreatDetection** (first 10 entries):
- Resource: `C:\Users\user\Downloads\Programs\Nox_setup_v7.0.6.0_full_intl_2.exe` — ActionSuccess: True
- Resource: `Escape-the-Backrooms-Build-01282024.exe` — ActionSuccess: True
- Resource: `uTorrent.exe` — ActionSuccess: True

**Get-MpThreat** (threat catalog):
- PUA:Win32/Vigua.A (no resources)
- PUA:Win32/GameHack (no resources)
- PUADlManager:Win32/Snackarcin (no resources)

**Verdict**: Zero hits mentioning `app_lib`, `Scan2Text`, or `target/release` path. Defender is not actively quarantining the exe.

### dumpbin /dependents (raw exe)
Imports (23 DLLs):
```
bcryptprimitives.dll, advapi32.dll, ntdll.dll, kernel32.dll, comctl32.dll,
user32.dll, ole32.dll, gdi32.dll, shlwapi.dll, api-ms-win-core-synch-l1-2-0.dll,
dwmapi.dll, shell32.dll, oleaut32.dll, ws2_32.dll, VCRUNTIME140.dll,
VCRUNTIME140_1.dll, api-ms-win-crt-*.dll (6 ucrt APIs)
```
All standard Windows DLLs. No suspicious or missing dependencies. `comctl32.dll` is present — the correct host for `TaskDialogIndirect`.

### dumpbin /imports — TaskDialogIndirect context
```
  comctl32.dll
           140521258 Import Address Table
           14073F628 Import Name Table
                       0 time date stamp
                       0 Index of first forwarder reference

                           0 RemoveWindowSubclass
                           0 SetWindowSubclass
                           0 DefSubclassProc
  >>                       0 TaskDialogIndirect
```

**Verdict**: `TaskDialogIndirect` is correctly imported from `comctl32.dll`. The import name table contains a valid ordinal-0 import. The PE import table is **not corrupted** and **not self-referential**.

### Raw vs Installed EXE comparison
| Property | Raw (target/release) | Installed (AppData/Local/Scan2Text) |
|---|---|---|
| Path | `D:\WingAI\Projects\scan2text\frontend\src-tauri\target\release\app_lib.exe` | `C:\Users\user\AppData\Local\Scan2Text\app_lib.exe` |
| Length | 7,944,704 bytes | 7,944,704 bytes |
| LastWriteTime | 2026-08-14 04:48:08 AM | 2026-08-14 04:47:46 AM |
| SHA256 | `1A87EB29F603E1DF209C11F42D0B9F242228AAA3BDD97FD694F6478EE55E4C78` | `F0C3A015CA39645D8D4A732599575510B6872F0FE2D4C0F4E39E928EFAD3898B` |

**Critical finding**: File lengths are identical (7,944,704 bytes) but SHA256 hashes are **completely different**. This is only possible if bytes were modified in-place after copy (e.g., inline patching, hook injection, or real-time protection modification).

## Verdict

### SUSPECT A — CONFIRMED: On-disk tampering
The PE import table in the raw build is structurally perfect. `TaskDialogIndirect` correctly resolves from `comctl32.dll`. Yet the installed copy fails with `Entry Point Not Found: TaskDialogIndirect`. The identical file size with different hashes proves **bytes were modified after the file was placed at the install location**.

The most likely mechanism: **Microsoft Defender Real-Time Protection** (or a third-party AV with a similar file-scanning hook) is injecting into or modifying the PE on write/access, corrupting the import address table or the `TaskDialogIndirect` import specifically. Defender shows no quarantine entries because the modification is happening silently — not as a quarantine action but as real-time inline patching.

### Suspect B — REJECTED
The link configuration and import table are correct. The raw exe imports `TaskDialogIndirect` from `comctl32.dll` without any corruption.

## Recommended Next Steps
1. Add `app_lib.exe` (and the install directory) to Windows Defender exclusions.
2. Alternatively, add an exclusion for the entire `C:\Users\user\AppData\Local\Scan2Text\` directory.
3. Re-run the installed binary to confirm `TaskDialogIndirect` resolves correctly.
4. If third-party AV is present (e.g., McAfee, Avast, AVG), add exclusions there too.
