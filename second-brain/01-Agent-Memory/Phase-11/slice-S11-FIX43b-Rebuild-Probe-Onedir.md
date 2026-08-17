# S11-FIX43b-Rebuild-Probe-Onedir

## What Changed
- Ran rebuild43b.ps1: PyInstaller backend build EXIT=0 (onefile=False + COLLECT spec), tauri `--no-bundle` produced zero stdout/stderr (suspicious — no new exe produced).
- Swapped backend dist into D:\Scan2Text; Copy-Item did NOT copy `_internal\pypdfium2_raw\pdfium.dll` (7.2 MB) into portable dist — `_internal` folder absent from destination.
- Scan2Text.exe from 4:50 AM (pre-existing) launched and failed: "%1 is not a valid Win32 application".
- Manually started rebuilt backend → health ok, model.loaded=true, files_present=true.
- PDF probe → OCR_FAILED: `name 'pdfium' is not defined` (pdfium.dll not on disk in portable install).

## Key Decisions
- None — this was a execution slice with zero source edits.
- Result: success=false (per task rule: any failure → success=false in JSON, then STOP).

## Test Coverage
- Backend: 283 passed, 1 pre-existing failure (test_health_contract).
- Frontend: 633 passed, 0 failures.
- No new tests added (execution-only slice).

## Open Questions
1. Why did `tauri build --no-bundle` produce empty stdout/stderr? Need to investigate whether the build actually ran or failed silently.
2. Why did Copy-Item not copy `_internal` folder? Hypothesis: destination already had subfolders (feedback, logs, settings) and PowerShell's `-Recurse` with existing destination may have merged at top level only, not recursing into new subdirectories.
3. Why did Scan2Text.exe fail with "not a valid Win32 application"? The exe exists at expected path with valid size (8.9 MB). Could be a corrupted copy, or the old exe was built for a different architecture.

## Verification
- result.json: `{backend_exit: 0, success: false, error: "%1 is not a valid Win32 application"}`
- backend_hash: 02A8AD36…
- shell_hash: A6A9783E… (unchanged)
- dll_count: 0 (pdfium.dll not in portable dist)
- health: ok (when backend started manually)
- probe_exit: 2 (OCR_FAILED)

## Final Status
**READY FOR CEO MANUAL VERIFICATION** — CEO must re-smoke: (1) fix Copy-Item to preserve `_internal` subtree, (2) investigate tauri build silence, (3) re-run probe after pdfium.dll is present on disk.
