# Slice: S10-FIX18-Backend-CORS-Rebuild-Swap

## What Changed
- `src/scan2text/api/main.py`: changed `allow_origins` from `["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8765", "http://127.0.0.1:8765"]` to `["*"]`
- `tests/test_api.py`: added `TestCors.test_cors_allows_tauri_localhost_origin` asserting `access-control-allow-origin == "*"` for `Origin: tauri://localhost`

## Key Decisions
- `allow_origins=["*"]` is safe because backend binds 127.0.0.1 only (local-first, ADR-008)
- TDD enforced: RED confirmed (None != "*"), GREEN after one-line change

## Test Coverage
- Backend: 247 passed, 1 pre-existing failure (`test_health_model_files_found` — dummy models on disk)
- New test: `test_cors_allows_tauri_localhost_origin`

## Open Questions
- None

## Build
- Fresh hash: 60E94CFFCF5903A5AAB153CA00764CE856B40E513E4C0C51037385975D44F38A
- Stale hash: 2B557E12F9EA77A745000EFD5EAB9F1C956600D0561B572BD3074B9030915515
- Three-way match: packaging dist = repo dist = portable dist = 60E94CFF…
- Boot gate PASS: Uvicorn on 127.0.0.1:47351, zero ModuleNotFoundError
