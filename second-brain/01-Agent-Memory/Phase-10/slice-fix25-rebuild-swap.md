# S10-FIX25 — Rebuild + Swap Both Artifacts

## What Changed
- Backend: rebuilt via `scripts\build-backend.ps1` (PyInstaller, exit 0)
- Shell: rebuilt via `npx tauri build --no-bundle` (exit 0)
- Swapped backend exe into `packaging\dist\scan2text-backend\` and `D:\Scan2Text\dist\scan2text-backend\`
- Swapped shell exe into `D:\Scan2Text\Scan2Text.exe`
- No source code changes — pure rebuild + swap

## Key Decisions
- Three-way hash match: packaging dist = portable dist = fresh build = `542AF7FFF...` (backend)
- Shell fresh hash `00B1DA35...` ≠ stale `507A0775...`
- Backend fresh hash `542AF7FF...` ≠ stale `9E4A1D8F...`
- Forensics confirmed: `promoteNextPending` present in store, CPU render present in BottomBar

## Test Coverage
- N/A (no code changes — doc + rebuild only)

## Open Questions
- None

## Baselines
- Backend exe hash: 542AF7FFFB78A95EF91C22EEBDC07E82E33B9352D0BF01C2A837F3D8732E406C
- Shell exe hash: 00B1DA35DD8FEF030819856511F183A83EF4BADC82D041E813C1890AE858015E
- Frontend tests: 628 passed, 0 failures (unchanged)
- Backend tests: 260 passed, 1 pre-existing failure (unchanged)
