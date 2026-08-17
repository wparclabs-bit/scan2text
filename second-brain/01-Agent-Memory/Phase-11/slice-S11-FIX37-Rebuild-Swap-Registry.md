# S11-FIX37 — Rebuild & Swap Registry

**Date:** 2026-08-18
**Phase:** Phase 11 (SettingsDialog API Integration)
**Status:** COMPLETE

## What Changed
- Rebuilt backend exe via PyInstaller (`py -3.12 -m PyInstaller packaging/scan2text-backend.spec --clean --noconfirm`) — exit 0
- Rebuilt Tauri shell via `npx tauri build --no-bundle` — exit 0
- Swapped both exes into three locations: repo root dist, repo packaging dist, portable D:\Scan2Text
- No source edits; zero test changes

## Key Decisions
- Used established FIX32 build command verbatim (no invented flags)
- Backend spec already had correct `pathex` — ran PyInstaller directly instead of build script (avoids spec mutation side effect)
- Root dist exe (45577896 B) was the canonical PyInstaller output; packaging dist folder exe was stale from prior build — overwrote with `Copy-Item -Force`

## Hash Registry
| Artifact | Stale Hash | New Hash | Three-way Match |
|----------|-----------|----------|-----------------|
| scan2text-backend.exe | A9C7BF5F… | 130E9C3E247FA0AD56687BC8A2B07C36DE80CF0B674459F0D414C5DFFC729B7E | ✅ Repo root / Packaging / Portable |
| Scan2Text.exe | 61B4939F… | 1E7E7589272A7A75F9F51B8F68BC9CBC83788FFB752A40B2F7083578E3A5E613 | ✅ Build / Portable |

## Boot Gate
- Health: `status: "ok"`, `model.loaded: true`, `model.files_present: true`
- Backend logs: zero `ModuleNotFoundError`, zero `Model files not found` in current boot session (errors at log lines 3/10/14/2853 are from prior stale builds)
- OCR jobs processed successfully during boot (4 batch jobs submitted, all polling 200 OK)
- Processes stopped cleanly for CEO clean launch

## Test Coverage
- Frontend: 629 passed, 0 failures
- Backend: 275 passed, 1 pre-existing failure (test_health_contract)
- Rust: 2 passed, 0 warnings

## Open Questions
- None

## Next
- CEO packaged re-smoke (manual UI verification)
