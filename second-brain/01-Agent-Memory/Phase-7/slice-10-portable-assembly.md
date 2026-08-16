# S10-PORTABLE-ASSEMBLY

## What Changed
- Added `[[bin]] name = "Scan2Text"` to `frontend/src-tauri/Cargo.toml` — binary now compiles as `Scan2Text.exe` (was `app_lib.exe`)
- Rebuilt with `npx tauri build` — produced `Scan2Text.exe` (SHA256: `B551FF7CC841574323F58D6A4C1BBD801418925019585CC07C3F1B8857F0AA22`)
- Assembled portable folder at `D:\Scan2Text/` replicating install layout:
  - `Scan2Text.exe` (main binary)
  - `dist/scan2text-backend/scan2text-backend.exe` (Python backend, bundled via `bundle.resources`)
  - `models/` (empty, for CEO model drop)
- Replaced `scripts/verify-packaged-backend.ps1` (NSIS/MSI-era) with `scripts/verify-portable.ps1`
- Deleted obsolete `verify-packaged-backend.ps1`

## Key Decisions
- Binary name set via `[[bin]]` section in Cargo.toml, NOT via `mainBinaryName` in tauri.conf.json (Tauri v2 schema does not accept that field)
- Portable layout mirrors install dir: exe at root, backend at `dist/scan2text-backend/`, empty `models/` dir
- `verify-portable.ps1` uses `-PortablePath` parameter (default `D:\Scan2Text`), same exit codes as old script (0=pass, 1=not found, 2=port timeout, 3=health fail)
- DIAG3 fix (build.rs + Cargo.toml) was already in HEAD; captured for record

## Test Coverage
- No new tests written (config + assembly only)
- Existing Rust tests: 14 passed (unchanged)
- Existing frontend tests: 610 green (unchanged)
- Existing backend tests: 211 passed (unchanged)

## Open Questions
- CEO manual E2E verification of portable assembly: run `verify-portable.ps1` → drop image → verify Markdown output
- Should `[[bin]]` approach be documented in ADR? (ADR-008 backend lifecycle, ADR-008 model-bundling parked)
