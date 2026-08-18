# S11-FIX47 — Backend Rebuild + Probe Crops

## What Changed
- PyInstaller rebuild of `packaging/scan2text-backend.spec` (exit 0, same hash as FIX46 since no source changes).
- `recovery43c.ps1` executed: wiped portable backend, clean-copied onedir tree, swapped shell, booted gate, ran PDF probe.
- **Zero source edits.**

## Key Decisions
- Same rebuild pattern as FIX45: PyInstaller → recovery script → probe → registry update.
- No spec changes needed — FIX43/FIX45 already locked onedir + pdfium bundling.

## Verification
```json
{
  "success": true,
  "health_status": "ok",
  "model_loaded": true,
  "files_present": true,
  "probe_exit": 0,
  "probe_tail": "completed",
  "backend_hash": "46D6FBCD17EAC7C45B0E523E6E607547D4E11123B4537EC54AFFCE65F2DB762C",
  "shell_hash": "A6A9783E68A3DC389B4AAAC3528A0C634ACD5D5FF9386F3DED191C280BF732EB"
}
```
All criteria PASS.

## Test Coverage
- Backend: 289 passed, 1 pre-existing (unchanged from FIX46).
- Frontend: 633 green (unchanged).
- No new tests (no source changes).

## Open Questions
- None.

## Final Status
**READY FOR CEO PACKAGED RE-SMOKE**
