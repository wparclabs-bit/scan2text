# S11-FIX57 — Align Backend Paths

**Date:** 2026-08-19
**Slice:** S11-FIX57-Align-Backend-Paths
**Status:** COMPLETE — READY FOR REBUILD

## Problem
Packaged app had White Screen of Death (WSOD). Forensics confirmed Rust code looked for `dist/scan2text-backend/` but the actual portable folder is `backend/`. This caused `panic!()` and silent abort in the Windows GUI binary.

## What Was Done
All three files were already correctly aligned from the previous fix cycle (junction `backend/` → `dist/scan2text-backend` in place, paths updated to `.join("backend").join("scan2text-backend.exe")`, tauri.conf.json resources set to `"../../backend"`).

**Verification performed:**
- `Select-String -Path "frontend\src-tauri\src\*.rs" -Pattern "dist/scan2text-backend"` → **zero matches**
- `Select-String -Path "frontend\src-tauri\tauri.conf.json" -Pattern "dist/scan2text-backend"` → **zero matches**
- `cargo check --message-format=short` → **zero errors, Finished in 0.60s**

## Files Verified (no changes needed)
- `frontend/src-tauri/tauri.conf.json` — resources already `"../../backend"`
- `frontend/src-tauri/src/lib.rs` — already uses `.join("backend").join("scan2text-backend.exe")`
- `frontend/src-tauri/src/backend_process.rs` — already uses `.join("backend").join("scan2text-backend.exe")`

## Next
CEO manual rebuild + probe. Status: READY FOR REBUILD.
