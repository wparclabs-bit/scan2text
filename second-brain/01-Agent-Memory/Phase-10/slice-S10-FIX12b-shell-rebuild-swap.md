# S10-FIX12b — Shell Rebuild & Swap

## What Changed
- Rebuilt Tauri shell from current frontend source (FIX11 commits 249e162 + 8d17d4b).
- Fresh hash `E8C3128C…` replaces stale `ECA0B63C…` at `D:\Scan2Text\Scan2Text.exe`.
- Portable hash match verified (3-way: build dir = portable = expected).

## Key Decisions
- Removed stale `app_lib.dll` + `.dll.lib` before rebuild — linker LNK1104 was blocking.
- No source changes; pure shell rebuild from current frontend.

## Test Coverage
- Smoke test: shell launched, backend PID(s) alive on 127.0.0.1:47351.
- Hash match: `E8C3128C64E9E0BE028AB5E4A099709374EA4407140A165BE0776D5AF51927FE` confirmed at portable path.

## Open Questions
- None.

## Status
COMPLETE
