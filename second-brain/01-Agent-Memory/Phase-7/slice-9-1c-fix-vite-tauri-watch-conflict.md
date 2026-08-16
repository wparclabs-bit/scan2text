# Slice 9.1c — Fix Vite/Tauri Watch Conflict

**Date:** 2026-08-12
**Slice:** S9.1c-fix-vite-tauri-watch-conflict
**Phase:** Phase 7

## What Changed

`frontend/vite.config.ts` server block now ignores the `src-tauri` directory tree via `watch.ignored: ['**/src-tauri/**']`. This prevents Vite's file watcher from attempting to watch Rust build artifacts under `src-tauri/target/`, which were locked by Cargo during compilation and caused `EBUSY: resource busy or locked` crashes before the native Tauri window could open.

## Key Decisions

- Used TDD (RED→GREEN) with a temporary PowerShell verification script at `tools/verify_vite_watch.ps1`.
- Injected `watch` block above existing `proxy` block in the server config — no proxy rules modified.
- No changes to Rust code, Tauri config, or backend.

## Test Coverage

- Temporary harness asserted `src-tauri` ignore rule presence (RED confirmed exit 1, GREEN confirmed exit 0).
- `npm run typecheck` passes.
- `npm run build` passes.
- Existing `/api` proxy configuration verified untouched.

## Open Questions

None.
