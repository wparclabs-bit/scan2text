# Slice DOC-01 — ADR-008: Tauri v2 desktop shell + packaging

**Date:** 2026-08-13
**Type:** Doc-only (no source touched)
**Status:** COMPLETE

## What Changed
- Created `second-brain/03-Architecture/ADRs/ADR-008-tauri-desktop-shell-packaging.md`
- No frontend/ or backend/ source modified
- PRD-03 not updated (deferred to later slice)

## Key Decisions (captured in ADR-008)
1. Desktop shell = Tauri v2 (Rust), not pywebview, not Electron
2. Backend = PyInstaller folder-based artifact at `dist/scan2text-backend/scan2text-backend.exe`
3. Backend lifecycle owned by Tauri with explicit exit hook (FIX-S9.3 proven)
4. Production backend binds 127.0.0.1:47351
5. Dev uses Vite proxy; production uses apiBase resolver to `http://127.0.0.1:47351/api`
6. Models remain EXTERNAL (downloaded at runtime, not bundled)

## Open Questions
- Final Tauri production bundling method (how `dist/scan2text-backend/` is packaged into the final Scan2Text.exe) is NOT locked — to be captured in a follow-up ADR.

## Test Coverage
N/A — doc-only slice.

## References
- ADR-007 format reference
- PRD-03 sections 11 & 12 (still stale — pending later update)
- FIX-S9.3: `fix-s9-3-tauri-x-close-backend-shutdown.md`
- S9.2a: `slice-9-2a-standalone-backend-artifact.md`
- S9.1b: `slice-9-1b-tauri-dev-plumbing.md`
