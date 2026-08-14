# Scan2Text Current State

<!-- MAINTENANCE PROTOCOL: Keep only the Baseline block + last 5 changelog entries here. When you add a new entry, move the oldest entry to second-brain/01-Agent-Memory/Archive/state-history.md. This protects the 45k token cap (AGENTS.md 3.2). -->

## Baseline
- Phase: Phase 10 (E2E Packaged Verification) — MSI + NSIS installers built, backend wired to HTTP (ADR-008), verification script + QA guide authored
- Date: 2026-08-14
- Baseline commit: ec9443d (Phase 6 closed)
- Backend tests: 211 passed, 1 pre-existing failure (test_health_contract — dummy models on disk)
- Frontend tests: 610 green, 0 failures. All 13 call sites across 6 files wired through buildApiUrl(). S9.4b COMPLETE.
- Rust tests: 14 passed (10 existing + 4 from S9.7: boot_backend + 3 lifecycle)
- PRD: v1.10 source of truth in second-brain/04-Product/
- Next: S10 — CEO manual E2E verification: install → run verify script → drop image → verify Markdown output.
- **BLOCKED: S10-DIAG3-Config-Divergence-Fix — Root cause found: build.rs missing `tauri_build::build()` call (no ComCtl32 v6 manifest embedding → TaskDialogIndirect entry-point error). Aligned build.rs + Cargo.toml crate-type to probe canonical form. New hash B0DF43AF… (≠ A4037A3E). Waiting for CEO launch test.**

## Recent Changelog (last 5)
- **2026-08-14 (S10-DIAG3-Config-Divergence-Fix):** Root cause identified. Diffed our build.rs + Cargo.toml against working probe (s2t-probe). Divergence: (1) build.rs called only `println!` rerun directives, missing `tauri_build::build()` — this function embeds the ComCtl32 v6 manifest that enables modern Windows controls (TaskDialogIndirect). Without it, binary links against Common Controls v5 → entry-point error at launch. (2) crate-type missing `staticlib` (probe has `["staticlib","cdylib","rlib"]`). Fixed both. Rebuilt: new SHA256 `B0DF43AF56FD805BB604D62F4D6C8DA7704EF3570CED8B4CFEAA8B0413BDC23D` (≠ A4037A3E). BLOCKED: CEO launch test.
- **2026-08-14 (S10-FIX2-Clean-Rebuild):** Forced relink by renaming poisoned `app_lib123.exe` → `app_lib123.exe.poisoned`. Clean `npx tauri build` under active Defender exclusions produced 2 bundles (MSI + NSIS). New SHA256 `A4037A3E99D097B16332911DF6CE029860AD7A26EAEAE09D10EE78F364608235` — confirmed different from poisoned hash `1A87EB29...`. BLOCKED: CEO launch test pending.
- **2026-08-14 (S10-E2E-Packaged-Verification):** Authored `scripts/verify-packaged-backend.ps1` — searches NSIS/MSI install paths, launches Scan2Text.exe, waits for port 47351 (Test-NetConnection), hits /api/health (Invoke-RestMethod). Created `second-brain/02-qa/s10-e2e-packaged-verification.md` — 7-step CEO QA guide (install, health-check script, UI launch, drop image, verify Markdown, i18n toggle, theme toggle). Status: READY FOR CEO MANUAL VERIFICATION.
- **2026-08-14 (S9.8-FIX):** Bundle identifier repaired + production build succeeded. Updated `identifier` in tauri.conf.json from `com.tauri.dev` to `com.wingai.scan2text`. Created `src/main.rs` entry point (Cargo auto-discovers as binary target; no `[bin]` section needed — Tauri CLI rejects standard `[bin]` TOML table syntax). Validation script extended to 7 checks (2 new identifier assertions). Build produced 2 bundles: MSI (~46 MB) + NSIS (~45 MB). Backend embedded in installers via `bundle.resources`.
- **2026-08-14 (S9.8):** First production build attempt — `npx tauri build` failed at config validation. Error: `bundle.identifier` is `com.tauri.dev` (default placeholder) — Tauri rejects it as non-unique. All 5 prerequisite checks passed (Tauri CLI 2.11.4, Rust 1.97.1, config validation 7/7, backend artifact, frontend dist). Build did not reach compilation. Fix: update `bundle.identifier` to a unique value (e.g. `com.wingai.scan2text`).
- **2026-08-14 (S9.7-FIX):** Config regression repair — restored `bundle.active` from `false` to `true` and `bundle.icon` from `[]` to the 5 icon paths from known-good commit `9da4e8d` (S9.6). Extended validation script with two new assertions guarding against this regression. Root cause: S9.7 scope-creep flipped these fields. Doc/config-only; no Rust source touched.
- **2026-08-14 (S9.7):** Rust ignition — implemented `BackendManager` struct with `start()`, `stop()`, `get_pid()`, `wait_for_health()`, `wait_for_port_closed()` methods; added `boot_backend()` function that starts backend + health check; wired into Tauri setup hook (fails fast on error). Reconstructed Cargo.toml/build.rs from forensics docs. 4 Rust tests pass. `tauri.conf.json` icon refs removed (broken from blown slice).

For older history see second-brain/01-Agent-Memory/Archive/state-history.md
