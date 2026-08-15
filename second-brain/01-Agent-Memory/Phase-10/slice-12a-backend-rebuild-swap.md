# S10-FIX12a — Backend Rebuild Swap

## What Changed
- Rebuilt backend exe via `scripts\build-backend.ps1` (PyInstaller, exit 0)
- Fresh hash: `FCE98DB5AE3F035DF84A44659F1359F4FB75D51B3F394554A2FDB1A658A03252`
- Swapped into `D:\Scan2Text\dist\scan2text-backend\scan2text-backend.exe` (portable)
- Swapped into `dist\scan2text-backend\scan2text-backend.exe` (repo dist)
- Boot gate PASS: Uvicorn on 127.0.0.1:47351, startup complete, zero ModuleNotFoundError, zero "Model files not found"

## Key Decisions
- 3-way hash raw match confirmed: packaging dist = portable dist = repo dist = FCE98DB5…
- Old baseline hash 61646D82… replaced (stale from S10-FIX8c)
- Sanity check: `sanitize_filename` + `desired_stem` present in main.py (lines 80, 91, 93, 95, 170, 172)

## Test Coverage
- Backend tests: unchanged from S10-FIX10 baseline (244 passed, 1 pre-existing failure)
- No source code changes in this slice — pure rebuild + swap

## Open Questions
- None. Slice complete.
