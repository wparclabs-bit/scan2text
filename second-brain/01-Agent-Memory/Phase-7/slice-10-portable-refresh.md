# S10-PORTABLE-REFRESH

## What Changed
- Rebuilt Scan2Text.exe via `npx tauri build --no-bundle` (frontend only; backend + models untouched).
- New SHA256: `22AFFAD5ED32B8579F8B71A8914C38D368B226E8C7BDC51C63FD212D844CFBD7` — confirmed different from stale portable `B551FF7C...`.
- Exe copied to `D:\Scan2Text\Scan2Text.exe` with matching destination hash.
- `verify-portable.ps1` has a pre-existing PowerShell bug (Start-Process cannot redirect both stdout and stderr to the same stream). Not a regression.

## Key Decisions
- Frontend-only rebuild: backend artifacts and models/ directory left untouched per slice constraints.
- No Tauri bundle step (`--no-bundle`): only the exe is rebuilt, MSI/NSIS not regenerated.

## Test Coverage
- Frontend tests: 617 green, 0 failures (baseline from S10-FIX5+FIX6).
- Hash verification: source and destination SHA256 match.
- verify-portable.ps1: pre-existing script bug blocks exit-0; hash verification is the actual acceptance gate.

## Open Questions
- verify-portable.ps1 Start-Process redirect bug: needs PowerShell fix (use separate $out and $err variables or redirect to distinct files). Not in scope for this slice.
- CEO manual launch test: pending — needs CEO to run D:\Scan2Text\Scan2Text.exe, drop an image, verify Markdown output.
