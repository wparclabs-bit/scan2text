# Scan2Text Build & Packaging Pipeline

> Last verified: 2026-09-02 — evidence: REMEDY-P1 forensics

## Chain

```
scripts/build-backend.ps1
  → PyInstaller via packaging/scan2text-backend.spec
  → produces repo-root backend/ (scan2text-backend.exe + _internal/)
```

## Scripts

### `scripts/build-backend.ps1`
- Invokes PyInstaller using `packaging/scan2text-backend.spec`
- Output: `backend/` folder at repo root containing `scan2text-backend.exe` and `_internal/`

### `scripts/package-portable.ps1`
- `-SkipBuild` (line 17) skips frontend/Tauri build only
- `$BackendPath` = repo-root `backend/` (line 81)
- `Copy-Item backend*` → `.staging-portable\backend` (line 112)
- **Contains NO PyInstaller invocation** (verdict M3: NO-BACKEND-STEP)

## Artifacts

| ZIP | Type | Contents |
|---|---|---|
| `Scan2Text-v1.1-Portable.zip` | Thin | Frontend + backend (no models) |
| `Scan2Text-v1.1-Portable-Full.zip` | Full | Frontend + backend + models |

## Mandatory Rebuild Order

`scripts/package-portable.ps1` now internally invokes `scripts/build-backend.ps1` before staging, so the scripts are **internally ordered** — a caller cannot accidentally package a stale backend.

| Invocation | Backend built? | Frontend/Tauri built? |
|---|---|---|
| `package-portable.ps1` (no flags) | ✅ Yes (default) | ✅ Yes (default) |
| `package-portable.ps1 -SkipBuild` | ✅ Yes (default) | ❌ Skipped |
| `package-portable.ps1 -SkipBackend` | ❌ Skipped | ✅ Yes (default) |
| `package-portable.ps1 -SkipBuild -SkipBackend` | ❌ Skipped | ❌ Skipped |

## Resolved

**PIPELINE-WIRING-OPTION-A** (CEO 2026-09-03): `build-backend.ps1` is now integrated into `package-portable.ps1` by default. A `-SkipBackend` opt-out switch allows skipping the backend build when only frontend changes were made. The integration enforces ordering by construction — a caller cannot accidentally package a stale backend.

## Known Pitfalls

- **PyInstaller `excludes` does not block explicit binaries.** The `excludes` list only prevents module discovery (imports). Binaries returned by `collect_all()` are passed explicitly to `Analysis` and bypass the excludes filter.
- **`collect_all` can return unwanted binary dependencies.** Transitive binary dependencies from excluded packages (e.g. pyarrow, pandas) may appear in the `binaries` tuple returned by `collect_all()`.
- **`all_binaries` must be filtered before `Analysis`.** Always filter `all_binaries` for banned packages before passing to `Analysis(binaries=filtered_binaries)`. Passing raw `all_binaries` re-introduces bloat.
- **Verification requires artifact presence checks, not only spec inspection.** The spec may look correct but the bundle may still contain unwanted binaries. Always run `Get-ChildItem backend\_internal -Recurse -Filter "*<package>*"` to confirm absence.

## MANDATORY PRE-READ

Any build/packaging slice **MUST** list this doc as MANDATORY PRE-READ before proceeding. Never assume pipeline behavior from memory — run the discovery block:

```powershell
Get-ChildItem scripts\, packaging\, backend\ -Recurse
Select-String -Path scripts\*.ps1 -Pattern "build-backend|package-portable|PyInstaller|backend"
```
