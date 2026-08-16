# S10-FIX16 — No Console Window

## What Changed
- `frontend/src-tauri/src/main.rs`: added `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]` as the first line, so release builds launch with no console window.

## Key Decisions
- Only one line of source changed; no new dependencies, no feature work.
- `windows_subsystem = "windows"` is gated behind `not(debug_assertions)` — dev builds still get a console for stderr/stdout debugging.

## Test Coverage
- No frontend/backend tests affected. Shell rebuild only.

## Open Questions
- CEO must manually verify: launch Scan2Text.exe, confirm no black console window appears.

## Hashes
- Old shell hash: E8C3128C64E9E0BE028AB5E4A099709374EA4407140A165BE0776D5AF51927FE
- New shell hash: 5F676E6DC16E2390FFACE55FD49DAE15B20FE26E46BD1DDAD294C249648643DA
