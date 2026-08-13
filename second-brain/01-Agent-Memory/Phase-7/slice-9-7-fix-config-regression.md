# S9.7-FIX — Config Regression Repair

## What Changed
- Restored `bundle.active` from `false` to `true` in `frontend/src-tauri/tauri.conf.json`
- Restored `bundle.icon` array from `[]` to the 5 icon paths from known-good commit `9da4e8d` (S9.6)
- Extended `frontend/scripts/validate-tauri-config.js` with two new assertions: `bundle.active === true` and `bundle.icon` non-empty array
- `bundle.resources` left untouched (was already correct)

## Key Decisions
- Restored icon paths verbatim from commit `9da4e8d` — no hand-crafted paths
- Root cause: S9.7 scope-creep (Rust ignition + Cargo.toml/build.rs reconstruction) flipped `bundle.active` to `false` and emptied `bundle.icon` to `[]`
- TDD applied: RED on new assertions, GREEN after config restoration
- Validation script now guards against this specific regression in future slices

## Test Coverage
- Validation script: 7 assertions total (JSON parse, bundle.active, bundle.icon non-empty, bundle.resources present, bundle.resources non-empty, backend folder exists, expected path in resources)
- All 7 pass after config repair
- RED confirmed 2 failures on bundle.active and bundle.icon before repair

## Open Questions
- Did any Rust source depend on the broken config? (Confirmed: no Rust source touched in this fix; S9.7 scope-creep was the cause)
- Should the validation script be integrated into the CI or build pre-hook? (Postponed — manual run sufficient for now)
