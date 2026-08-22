# S29 — GATE-BACKEND-REBUILD-DEPLOY

**Date:** 2026-08-21
**Status:** COMPLETE
**Slice Type:** GATE / DEPLOY (zero source edits)

## Baseline
- S28-BACKEND-ZIP-EXTRACTION complete in source
- Backend downloader extracts zips
- Repo version.json has CEO-verified hashes (vlm: 9facc171..., mmproj: d63a90a1...)
- Deployed portable build at D:\Scan2Text\ was STALE

## Goal
Run full test gates, rebuild the PyInstaller backend, deploy it, and deploy the fresh version.json. ZERO source edits.

## Non-Goals
- No new code, bug fixes, or source modifications
- No Tauri shell rebuild (no Rust/frontend changes)

## Gates Run

| Gate | Result |
|---|---|
| `npm run typecheck` | ✅ Clean (zero errors) |
| `npm run test` | ✅ 666 passed, 0 failed (38 test files) |
| `$env:PYTHONPATH="src"; py -3.12 -m pytest -q --tb=line` | ✅ 339 passed, 0 failures |
| `cargo check --message-format=short` | ✅ Compiled in 1.95s |

## Build & Deploy

| Artifact | Source Path | Deployed Path | Size |
|---|---|---|---|
| Backend exe | `dist\scan2text-backend\scan2text-backend.exe` | `D:\Scan2Text\backend\scan2text-backend.exe` | 45,591,824 bytes (43.51MB) |
| version.json | `D:\WingAI\Projects\scan2text\version.json` | `D:\Scan2Text\version.json` | 431 bytes |

## Verification

- `D:\Scan2Text\backend\scan2text-backend.exe` — deployed with fresh timestamp from PyInstaller build
- `D:\Scan2Text\version.json` — hashes confirmed:
  - vlm_sha256: `9facc171eb7b5cd58ef48c3c1e0814b9da911100ab9088757d1f1269d1e09925`
  - mmproj_sha256: `d63a90a1f1594ce9ecc83f2e1894f9bd7b38605bb00daf59b2fdf7b1b42b0530`
- Tauri shell (`Scan2Text.exe`) remains STALE — not rebuilt this slice

## Commands Executed
```powershell
npm run typecheck                                           # clean
npm run test                                                # 666 passed
$env:PYTHONPATH="src"; py -3.12 -m pytest -q --tb=line      # 339 passed
cargo check --message-format=short                          # compiled OK
py -3.12 -m PyInstaller packaging/scan2text-backend.spec --clean --noconfirm  # BUILD OK
Copy-Item "dist\scan2text-backend\*" "D:\Scan2Text\backend\" -Recurse -Force
Copy-Item "version.json" "D:\Scan2Text\version.json" -Force
```

## Obsidian Updates
- `second-brain/00-Current-State.md` — updated baseline to S29, new gate results
- `second-brain/01-Agent-Memory/Phase-11/slice-S29-GATE-BACKEND-REBUILD-DEPLOY.md` — this file
