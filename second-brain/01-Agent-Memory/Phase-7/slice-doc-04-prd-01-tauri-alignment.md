# Slice DOC-04 — PRD-01 aligned with ADR-008 (Tauri desktop-shell line, version drift fix)

**Date:** 2026-08-13
**Phase:** Phase 7 (Real Backend)
**Type:** Doc-only
**Status:** COMPLETE

## What Changed

- `second-brain/04-Product/01-product-and-scope.md`:
  - Header: `Version: 1.9` → `Version: 1.11`; `Date: 2026-08-10` → `Date: 2026-08-13`.
  - Change Log: added `1.11 | 2026-08-13 | DOC-04: aligned §12 with ADR-008; added Tauri v2 desktop shell & packaging line; fixed version drift (header was 1.9)`.
  - Section 12 "Technical Decisions (Locked)": added bullet:
    > Desktop shell & packaging: Tauri v2 wraps the built React frontend; backend = PyInstaller folder artifact (scan2text-backend.exe) spawned as child process, lifecycle owned by Tauri; production backend 127.0.0.1:47351 (ADR-008).
- `second-brain/00-Current-State.md`: prepended DOC-04 entry.

## Key Decisions

- Version bump to 1.11 (not 1.12) because the existing changelog already contains a 1.10 entry; header must match the highest changelog entry (CEO source-of-truth integrity rule).
- ADR-008 citation explicit in the new §12 line; pywebview NOT mentioned (PRD-01 never had it).
- Parallel alignment to DOC-02 (PRD-03 aligned with ADR-008).

## Test Coverage

- N/A (doc-only slice).
- Verification via Select-String: Tauri present (match), ADR-008 present (match), pywebview absent (empty), header reads `Version: 1.11`.

## Open Questions

- None.
