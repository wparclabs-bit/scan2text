# Scan2Text Current State

<!-- MAINTENANCE PROTOCOL: Keep only the Baseline block + last 5 changelog entries here. When you add a new entry, move the oldest entry to second-brain/01-Agent-Memory/Archive/state-history.md. This protects the 45k token cap (AGENTS.md 3.2). -->

## Baseline
- Phase: Phase 7 (Real Backend) — FRONTEND API WIRING COMPLETE, RUST IGNITION COMPLETE, Tauri build UNBLOCKED — production build succeeded
- Date: 2026-08-14
- Baseline commit: ec9443d (Phase 6 closed)
- Backend tests: 211 passed, 1 pre-existing failure (test_health_contract — dummy models on disk)
- Frontend tests: 610 green, 0 failures. All 13 call sites across 6 files wired through buildApiUrl(). S9.4b COMPLETE.
- Rust tests: 14 passed (10 existing + 4 from S9.7: boot_backend + 3 lifecycle)
- PRD: v1.10 source of truth in second-brain/04-Product/
- Next: S10 — wire Tauri frontend to backend via IPC commands, test end-to-end OCR pipeline.

## Recent Changelog (last 5)
- **2026-08-14 (S9.8-FIX):** Bundle identifier repaired + production build succeeded. Updated `identifier` in tauri.conf.json from `com.tauri.dev` to `com.wingai.scan2text`. Created `src/main.rs` entry point (Cargo auto-discovers as binary target; no `[bin]` section needed — Tauri CLI rejects standard `[bin]` TOML table syntax). Validation script extended to 7 checks (2 new identifier assertions). Build produced 2 bundles: MSI (~46 MB) + NSIS (~45 MB). Backend embedded in installers via `bundle.resources`.
- **2026-08-14 (S9.8):** First production build attempt — `npx tauri build` failed at config validation. Error: `bundle.identifier` is `com.tauri.dev` (default placeholder) — Tauri rejects it as non-unique. All 5 prerequisite checks passed (Tauri CLI 2.11.4, Rust 1.97.1, config validation 7/7, backend artifact, frontend dist). Build did not reach compilation. Fix: update `bundle.identifier` to a unique value (e.g. `com.wingai.scan2text`).
- **2026-08-14 (S9.7-FIX):** Config regression repair — restored `bundle.active` from `false` to `true` and `bundle.icon` from `[]` to the 5 icon paths from known-good commit `9da4e8d` (S9.6). Extended validation script with two new assertions guarding against this regression. Root cause: S9.7 scope-creep flipped these fields. Doc/config-only; no Rust source touched.
- **2026-08-14 (S9.7):** Rust ignition — implemented `BackendManager` struct with `start()`, `stop()`, `get_pid()`, `wait_for_health()`, `wait_for_port_closed()` methods; added `boot_backend()` function that starts backend + health check; wired into Tauri setup hook (fails fast on error). Reconstructed Cargo.toml/build.rs from forensics docs. 4 Rust tests pass. `tauri.conf.json` icon refs removed (broken from blown slice).
- **2026-08-14 (S9.6):** Tauri bundle.resources config — added `"resources": ["../../dist/scan2text-backend"]` to bundle section in tauri.conf.json. Backend artifact discovered at dist/scan2text-backend/ (45 MB PyInstaller folder). GATE passed. RED→GREEN validation script created. Doc/config-only; no Rust source touched.

For older history see second-brain/01-Agent-Memory/Archive/state-history.md
