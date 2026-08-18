# Slice: S10-FIX29-Tauri-Config-Schema-Fix

**Date:** 2026-08-17
**Phase:** Phase 10
**Status:** READY FOR CEO MANUAL VERIFICATION

## What Changed
Removed invalid `fileDropEnabled` property from `app.windows[0]` in `frontend/src-tauri/tauri.conf.json`. Tauri v2 schema strictly forbids this v1-only field, causing the build to fail with: `error on app > windows > 0: Additional properties are not allowed ('fileDropEnabled' was unexpected)`.

## Key Decisions
- **No source changes needed.** The React Dropzone library already handles drag-and-drop via standard HTML5 APIs — `fileDropEnabled` was a vestigial Tauri v1 config that had no functional effect in v2 beyond breaking the build.
- **Build command:** `npx tauri build --no-bundle` from `frontend/` directory — exits 0, no schema validation errors.

## Test Coverage
- Frontend: 630 passed, 0 failures (unchanged).
- Typecheck: clean.
- Build: success (exit 0, no console errors).

## New Shell Hash
- **8428E15C** (replaces 00B1DA35)

## Open Questions
None. Drag-and-drop behavior is unchanged — frontend Dropzone handles it natively.
