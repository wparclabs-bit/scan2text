# S9.8-FIX — Bundle Identifier Repair + Build Retry

## What Changed
- **tauri.conf.json**: Updated `"identifier"` from `"com.tauri.dev"` to `"com.wingai.scan2text"` (CEO-approved bundle ID).
- **validate-tauri-config.js**: Added 2 new assertions (checks 6 & 7) to guard against placeholder identifier regression.
- **src-tauri/src/main.rs**: Created minimal entry point (`fn main() { app_lib::run(); }`) — required for Tauri v2 binary target (Cargo auto-discovers from `src/main.rs`).
- **Cargo.toml**: No `[bin]` section needed — Cargo auto-discovers `src/main.rs` as binary target; package name `app_lib` serves as both library and binary crate name.

## Key Decisions
- Bundle identifier locked to `com.wingai.scan2text` (CEO decision).
- No `[bin]` section in Cargo.toml — Tauri CLI rejects standard `[bin]` TOML table syntax (expects sequence). Cargo auto-discovery of `src/main.rs` works correctly.
- `main.rs` is new source file (unavoidable — Tauri v2 requires a binary entry point). Not a modification of existing source.
- Validation script now covers 7 checks (was 5): added identifier placeholder guard + approved value assertion.

## Test Coverage
- Validation script: 7/7 checks pass (was 5/5).
- Build: Succeeded, produced 2 bundles (MSI + NSIS).

## Open Questions
- None. Build unblocked.
