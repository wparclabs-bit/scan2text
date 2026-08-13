# Scan2Text Current State

<!-- MAINTENANCE PROTOCOL: Keep only the Baseline block + last 5 changelog entries here. When you add a new entry, move the oldest entry to second-brain/01-Agent-Memory/Archive/state-history.md. This protects the 45k token cap (AGENTS.md 3.2). -->

## Baseline
- Phase: Phase 7 (Real Backend) — FRONTEND API WIRING COMPLETE, RUST IGNITION COMPLETE
- Date: 2026-08-14
- Baseline commit: ec9443d (Phase 6 closed)
- Backend tests: 211 passed, 1 pre-existing failure (test_health_contract — dummy models on disk)
- Frontend tests: 610 green, 0 failures. All 13 call sites across 6 files wired through buildApiUrl(). S9.4b COMPLETE.
- Rust tests: 14 passed (10 existing + 4 from S9.7: boot_backend + 3 lifecycle)
- PRD: v1.10 source of truth in second-brain/04-Product/
- Next: Tauri packaging + distribution.

## Recent Changelog (last 5)
- **2026-08-14 (S9.7-FIX):** Config regression repair — restored `bundle.active` from `false` to `true` and `bundle.icon` from `[]` to the 5 icon paths from known-good commit `9da4e8d` (S9.6). Extended validation script with two new assertions guarding against this regression. Root cause: S9.7 scope-creep flipped these fields. Doc/config-only; no Rust source touched.
- **2026-08-14 (S9.7):** Rust ignition — implemented `BackendManager` struct with `start()`, `stop()`, `get_pid()`, `wait_for_health()`, `wait_for_port_closed()` methods; added `boot_backend()` function that starts backend + health check; wired into Tauri setup hook (fails fast on error). Reconstructed Cargo.toml/build.rs from forensics docs. 4 Rust tests pass. `tauri.conf.json` icon refs removed (broken from blown slice).
- **2026-08-14 (S9.6):** Tauri bundle.resources config — added `"resources": ["../../dist/scan2text-backend"]` to bundle section in tauri.conf.json. Backend artifact discovered at dist/scan2text-backend/ (45 MB PyInstaller folder). GATE passed. RED→GREEN validation script created. Doc/config-only; no Rust source touched.
- **2026-08-13 (S9.5):** Tauri sidecar forensics (read-only) — mapped src-tauri structure (866 source lines, ~30 KB), confirmed BackendManager + RunEvent::Exit hooks already implemented, externalBin config absent, no Rust code changes. Scope report generated; recommends 2-slice split (config wiring + lifecycle completion). Doc-only; no source touched.
- **2026-08-13 (DOC-11):** AGENTS.md diet — slimmed stale Phase-6 content, relocated + fixed MCP block to section 3.11, archived Phase-6 visual detail. Backup in 00-Inbox/backups/; archive in 01-Agent-Memory/Archive/. Doc-only slice; no source touched.

For older history see second-brain/01-Agent-Memory/Archive/state-history.md
