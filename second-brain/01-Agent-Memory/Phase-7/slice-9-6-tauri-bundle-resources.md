# S9.6 — Tauri bundle.resources config (Packing the backend)

## What Changed
- Added `bundle.resources` entry to `frontend/src-tauri/tauri.conf.json`
- Resource path: `../../dist/scan2text-backend` (relative to tauri.conf.json)
- Created validation script `frontend/scripts/validate-tauri-config.js` (RED→GREEN cycle)
- No Rust code changes; no dependency installs; no PyInstaller run; no full Tauri build

## Key Decisions
- **Bundling method**: Tauri `bundle.resources` array (CEO-approved this session)
- **Path resolution**: Tauri v2 resolves resource paths relative to `tauri.conf.json`; path is `../../dist/scan2text-backend`
- **Schema**: `bundle.resources` is a string array per Tauri v2 spec — not an object map (no custom target renaming needed)
- **Backend artifact**: Discovered at `D:\WingAI\Projects\scan2text\dist\scan2text-backend\scan2text-backend.exe` (45 MB PyInstaller folder artifact)
- **GATE**: PASSED — artifact exists, no BLOCKED

## Test Coverage
- Validation script `frontend/scripts/validate-tauri-config.js` asserts:
  1. `tauri.conf.json` parses as valid JSON
  2. `bundle.resources` key exists and is a non-empty array
  3. Target folder `../../dist/scan2text-backend` exists on disk
  4. Array contains the exact expected path string
- RED confirmed (3 failures before edit), GREEN confirmed (all pass after edit)

## Open Questions
- S9.7: Rust ignition — `resolve_backend_path()` must read the bundled resource path at runtime (not hardcode `dist/...`)
- S9.7: Tauri setup hook must spawn the backend from the bundled location
- Packaging slice (future): Full `tauri build` to verify the backend ships inside the NSIS/MSI bundle
