# S11-DOC-Rename-Backend-Folder

**Date:** 2026-08-18
**Status:** COMPLETE
**Type:** Doc-only (AGENTS.md 3.8)

## What Changed

- Renamed portable root backend folder reference from `scan2text-backend/` to `backend/` across architecture docs.
- No source code touched (Rust, Python, TypeScript all untouched).

## Key Decisions

- CEO decision 2026-08-18 approved renaming the folder for a cleaner portable root structure.
- ADR-008 Decision 2 updated: `dist/scan2text-backend/scan2text-backend.exe` → `dist/backend/scan2text-backend.exe`.
- ADR-008 Open/Pending section updated: `dist/scan2text-backend/` → `dist/backend/`.
- PRD-03 (03-non-functional-and-architecture.md) version bumped 1.14 → 1.15.
- §11 (Technical Architecture) updated: `dist/scan2text-backend/scan2text-backend.exe` → `dist/backend/scan2text-backend.exe`.
- §13 (Runtime Folder Structure) updated: `scan2text-backend/` → `backend/`.
- `00-Current-State.md` changelog entry added.

## Test Coverage

Doc-only slice; no tests affected.

## Open Questions

None.
