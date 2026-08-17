# S11-FIX41a — SingleScriptRebuild

**Date:** 2026-08-18
**Phase:** Phase 11 (SettingsDialog API Integration)
**Status:** COMPLETE

## What Changed
- `packaging/scan2text-backend.spec`: Added `collect_all("pypdfium2_raw")` block — the actual `pdfium.dll` lives in `pypdfium2_raw`, not `pypdfium2`. Merged `raw_binaries`/`raw_hiddenimports` into `all_binaries`/`all_hiddenimports`.
- Rebuilt backend (PyInstaller exit 0) and Tauri shell (--no-bundle exit 0).
- Swapped both exes into D:\Scan2Text portable + repo dist.
- Boot gate PASS: `status: "ok"`, `model.loaded: true`, `model.files_present: true`.

## Key Decisions
- `collect_all("pypdfium2")` returns empty binaries (verified via PyInstaller hook output). The DLL is in `pypdfium2_raw\pdfium.dll`.
- PyInstaller bundles DLLs inside the exe (18 DLLs confirmed in TOC including `pypdfium2_raw\pdfium.dll`) — no separate DLL files needed in dist folder.
- Script fix: `npx` resolves to `npx.ps1` (PowerShell script) not `npx.cmd` — used local `tauri.cmd` path instead.
- Spec `shutil.move` skips when dst exe already exists — forced copy to overwrite stale backend in subfolder.

## Hash Registry
| Artifact | Old Hash | New Hash |
|----------|----------|----------|
| scan2text-backend.exe | 130E9C3E… | 02A8AD361C18316CF1FC7B91F5903EBF5C9B4D8A979739813787C798ED9B6FE2 |
| Scan2Text.exe | 1E7E7589… | A6A9783E68A3DC389B4AAAC3528A0C634ACD5D5FF9386F3DED191C280BF732EB |

## Test Coverage
- `test_packaging_spec.py`: 3 passed (spec-text assertions still valid)
- Backend: 281 passed, 1 pre-existing failure (`test_health_contract`)
- Frontend: 633 passed, 0 failures
- Typecheck: clean
- Build: success

## Open Questions
- None

## Next
- S11-FIX41b-PDF-LiveProof: end-to-end PDF processing via known-good PDF
