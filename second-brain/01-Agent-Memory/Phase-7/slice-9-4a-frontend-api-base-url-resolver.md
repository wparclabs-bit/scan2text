# Slice S9.4a — Frontend Production API Base URL Resolver

**Date:** 2026-08-13
**Phase:** Phase 7
**Status:** COMPLETE

## What Changed

- Created `frontend/src/lib/apiBase.ts` exporting `getApiBaseUrl()` and `buildApiUrl(path)`.
- Created `frontend/src/lib/apiBase.test.ts` with 6 unit tests.
- No existing call sites modified — wiring is deferred to S9.4b.

## Key Decisions

- `getApiBaseUrl()` reads `import.meta.env.PROD` **inside the function body** (not as a module-level constant) so tests can stub it with `vi.stubEnv('PROD', true/false)`.
- `buildApiUrl(path)` normalizes paths missing a leading slash by prepending `/`.
- Production backend locked to `127.0.0.1:47351` (backend binds 127.0.0.1 only per ADR-007).
- Dev mode keeps the Vite proxy (empty base string → relative /api/* paths work as before).
- No new npm/pip/cargo dependencies installed.

## Test Coverage

6 new tests in `frontend/src/lib/apiBase.test.ts`:
1. `getApiBaseUrl()` returns `''` when PROD is false (dev)
2. `getApiBaseUrl()` returns `'http://127.0.0.1:47351'` when PROD is true
3. `buildApiUrl('/api/health')` returns `/api/health` in dev
4. `buildApiUrl('/api/health')` returns `http://127.0.0.1:47351/api/health` in prod
5. `buildApiUrl('api/health')` (no leading slash) returns `/api/health` in dev
6. `buildApiUrl('api/health')` (no leading slash) returns `http://127.0.0.1:47351/api/health` in prod

All tests use `vi.stubEnv('PROD', ...)` and `vi.unstubAllEnvs()` in `afterEach`.

Frontend baseline: 590 → 596 passed (+6). Zero regressions.

## Open Questions

- S9.4b: which existing fetch call sites to wire through `buildApiUrl`?
- S9.4b: should the resolver also handle the Tauri sidecar case (different host/port)?
