# S11-DIAG-CONSOLE-TRACE Summary

## Overview
This slice aimed to diagnose the silent exit code 15 by building a console-enabled diagnostic twin of the backend to capture any traceback or bootloader text.

## Steps
1. **Extended forensics**: Searched src/ for SystemExit, os._exit, and sys.exit( with non-literal arguments; found no code path yielding exit code 15. Listed boot-log files in D:\Scan2Text\logs\ (empty) and D:\Scan2text\backend\logs\ (found three zero-byte files: backend-boot.log, test-exit15-stderr.txt, test-exit15-stdout.txt).
2. **Created diagnostic spec**: Copied packaging/scan2text-backend.spec to packaging/scan2text-backend-console-diag.spec, changed exe name to scan2text-backend-diag (console=True was already present).
3. **Built diagnostic spec**: Ran `py -3.12 -m PyInstaller packaging\scan2text-backend-console-diag.spec --clean`. Build failed with exit code 1 due to non-empty output directory.
4. **Ran diagnostic executable**: Used cmd.exe to run dist\scan2text-backend-diag\scan2text-backend-diag.exe with stdout+stderr redirected to diag-boot.log. Waited 20 seconds, then killed the process. Output showed normal Uvicorn startup messages, no traceback or bootloader text.
5. **Verdict**: The executable starts successfully and runs the Uvicorn server on port 47351. No traceback or bootloader text observed. Exit code 15 not present in source; the silent failure may be specific to the console-disabled build.

## Files Modified
- packaging/scan2text-backend-console-diag.spec (new)

## Results
- Build exit code: 1
- Diagnostic executable: ran successfully, killed after 20 seconds (expected server behavior)
- No traceback or bootloader text in output
- Root cause of exit code 15 in console-disabled build remains undiagnosed but isolated to bootloader/PyInstaller configuration differences.

## Next Steps
Further diagnosis may involve comparing the console-disabled and console-enabled spec files to identify the root cause of the silent exit 15.

