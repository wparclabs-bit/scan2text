# S10-DIAG3-Config-Divergence-Fix

## What Changed
- **`frontend\src-tauri\build.rs`**: Replaced manual `println!` rerun directives with `tauri_build::build()` call.
- **`frontend\src-tauri\Cargo.toml`**: Added `staticlib` to `[lib] crate-type` (was `["cdylib","rlib"]`, now `["staticlib","cdylib","rlib"]`).

## Key Decisions
- **Root cause**: Missing `tauri_build::build()` call means the ComCtl32 v6 manifest assembly is never embedded into the binary. Without it, Windows loads Common Controls v5 which lacks the `TaskDialogIndirect` function exported from `ComCtl32.dll` version 6+. This is why `app_lib.exe` died at launch with the entry-point error.
- `tauri_build::build()` reads `tauri.conf.json` at compile time and embeds it into the binary, AND generates the version resource file that declares ComCtl32 v6 as a dependent assembly.
- `staticlib` addition matches probe canonical form; not believed to affect the launch issue but aligned for consistency.
- Package name `app_lib` and lib name preserved (CEO locked).
- Checked `src/lib.rs` imports — no special `tauri` features used, so empty `features = []` is safe.

## Test Coverage
- Build: `npx tauri build` succeeds, produces MSI + NSIS bundles.
- New SHA256: `B0DF43AF56FD805BB604D62F4D6C8DA7704EF3570CED8B4CFEAA8B0413BDC23D` (differs from A4037A3E and old 1A87EB29).
- No unit tests for build.rs (it's a build script, not a library).

## Open Questions
- CEO must launch the rebuilt `app_lib.exe` (via MSI/NSIS installer) to confirm TaskDialogIndirect error is resolved.
- If CEO confirms fix: proceed to S10 E2E verification (drop image → verify Markdown output).
