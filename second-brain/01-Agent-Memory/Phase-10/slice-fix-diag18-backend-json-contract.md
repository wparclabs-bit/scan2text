# Slice: slice-fix-diag18-backend-json-contract

## What Changed

### Backend (Python/FastAPI)
- **File:** `src/scan2text/api/main.py`
  - Updated `POST /process` endpoint to explicitly return `JSONResponse(content={"task_id": task_id}, status_code=202)` instead of relying on FastAPI's automatic dict-to-JSON conversion.
  - Changed return type annotation from `Dict[str, str]` to `JSONResponse` for clarity and contract enforcement.

- **File:** `tests/test_api.py`
  - Added new contract test `test_post_process_returns_valid_json_with_task_id` that asserts:
    - Response status code is 202
    - Content-Type header includes `application/json`
    - Response body is valid JSON with exactly one field: `task_id` (non-empty string)
    - No extra unexpected fields in the minimal response

### Frontend (TypeScript/React)
- **File:** `frontend/src/lib/api.ts`
  - Updated `uploadFile()` function to wrap `response.json()` in a try/catch block.
  - On JSON parse failure (SyntaxError), throws a clean `Error('Server communication error')` instead of letting the raw SyntaxError bubble up.
  - This prevents the frontend from crashing with an unhandled SyntaxError when the backend returns HTTP 202 but an empty/malformed JSON body.

- **File:** `frontend/src/lib/api.test.ts`
  - Added two new tests for `uploadFile`:
    - `should throw a clean error when response is 202 but body is not valid JSON`
    - `should throw a clean error when response is 202 but body is empty`
  - Both tests mock `fetch` to return a 202 response where `json()` rejects with `SyntaxError`, and assert the thrown error message is "Server communication error".

## Key Decisions

1. **Explicit JSONResponse in backend**: Using `JSONResponse` directly makes the contract explicit and ensures proper Content-Type headers. This is a defensive measure against edge cases where FastAPI's automatic conversion might not behave as expected (e.g., middleware interference, exception handling quirks).

2. **Clean error message for frontend**: The frontend now catches any JSON parse error and throws a user-friendly "Server communication error" message. This error can be caught by the UI layer and displayed via Sonner toast, preventing the "red dot" crash described in the baseline.

3. **TDD approach**: Tests were written first (RED), then implementation fixed (GREEN), then refactored. The backend contract test and frontend error-handling tests both failed initially and pass after the fixes.

4. **No scope creep**: Only the specific JSON contract issue was addressed. Queue logic, OCR processing, UI layout, and Rust shell remain unchanged.

## Test Coverage

### Backend
- All 16 tests in `tests/test_api.py` pass, including the new contract test.
- Command: `$env:PYTHONPATH="src"; py -3.12 -m pytest tests/test_api.py -q`

### Frontend
- All 621 tests pass (2 new tests added for JSON parse error handling).
- Command: `npm run test` (from frontend directory)

### Typecheck & Build
- Frontend typecheck: `npm run typecheck` — zero errors
- Frontend build: `npm run build` — success

## Open Questions

None. The fix is complete and verified. The backend now strictly adheres to the POST /process → task_id JSON contract, and the frontend gracefully handles any deviation from that contract.