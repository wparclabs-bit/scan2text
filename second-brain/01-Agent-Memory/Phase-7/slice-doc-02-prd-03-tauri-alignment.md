# DOC-02 — PRD-03 aligned with ADR-008 (Tauri supersedes pywebview)

**Date:** 2026-08-13  
**Phase:** 7  
**Type:** Doc-only  
**Status:** COMPLETE

## What Changed

- `second-brain/04-Product/03-non-functional-and-architecture.md` bumped from v1.11 → v1.12, Date → 2026-08-13.
- **Section 11 (Runtime Approach):** replaced pywebview sentence with Tauri v2 wording citing ADR-008. States that the Tauri v2 shell bundles the built React frontend and spawns the PyInstaller backend artifact as a child process; WebView2-backed native window presents the UI; backend binds 127.0.0.1:47351.
- **Section 12 (Tech Stack, Frontend line):** removed "pywebview"; added "Tauri v2 (desktop shell, ADR-008)"; clarified PyInstaller is for the backend artifact only (folder-based — ADR-008). All other stack items unchanged.
- **Section 13 (Runtime Folder Structure):** updated tree to reflect ADR-008 packaging — Tauri shell executable, scan2text-backend folder with backend exe, external models/ noted as downloaded at runtime (not bundled). Preserved output/, settings/, feedback/, logs/ entries.
- **Section 14 (Local Application Contract):** removed stale "(used by BottomBar; until built, UI shows RAM '—')" clause from GET /api/health line; kept rest of line intact.
- **Change Log:** added v1.12 entry documenting DOC-02 alignment.
- `second-brain/00-Current-State.md`: added DOC-02 completion line.

## Key Decisions

- ADR-008 already locked all technical decisions (Tauri v2 shell, PyInstaller folder-based artifact, port 47351, external models). This slice only propagates those decisions into PRD-03 so the product document stays the source of truth.
- No source code touched (frontend/, backend/, src-tauri/).
- No other PRDs edited (PRD-01, PRD-02, PRD-04 left unchanged).
- ADR-008 left untouched (ADRs are append-only).

## Open Questions

- Final production bundling method (how dist/scan2text-backend/ is packaged into the final Scan2Text.exe bundle) remains PENDING per ADR-008 — follow-up ADR needed.

## Verification

```powershell
Select-String -Path "second-brain/04-Product/03-non-functional-and-architecture.md" -Pattern "pywebview"
# (empty — zero occurrences)

Select-String -Path "second-brain/04-Product/03-non-functional-and-architecture.md" -Pattern "Tauri"
# 4 matches (sections 11, 12, 13)

Select-String -Path "second-brain/04-Product/03-non-functional-and-architecture.md" -Pattern "ADR-008"
# 6 matches (sections 11, 12, 13)

Select-String -Path "second-brain/04-Product/03-non-functional-and-architecture.md" -Pattern "until built"
# (empty — stale note removed)

Get-Content "second-brain/04-Product/03-non-functional-and-architecture.md" | Select-Object -First 5
# Version: 1.12
# Date: 2026-08-13
```
