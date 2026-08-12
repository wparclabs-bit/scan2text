# Slice: Kill-The-Cache-Bug

**Date:** 2026-08-12  
**Phase:** Phase 7  
**Baseline:** ec9443d (Phase 6 closed)  
**Tests:** backend 191→195 (+4), frontend 589 (no change)

## What Changed

### Backend (`src/scan2text/routes/download.py`)
- Added `Response` import from FastAPI.
- `GET /api/download/status`: added strict no-cache headers to Response object.
- `GET /api/download/progress`: added strict no-cache headers to Response object.
- Headers set: `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`, `Pragma: no-cache`, `Expires: 0`.

### Frontend
- `App.tsx:43`: cache-buster `?t=${Date.now()}` appended to `/api/download/status` fetch URL.
- `ModelDownloaderModal.tsx:31`: cache-buster `?t=${Date.now()}` appended to `/api/download/progress` fetch URL.

### Tests (`tests/test_api_download.py`)
- Added header assertions to all 4 GET endpoint tests (status x2, progress x2):
  - `response.headers["Cache-Control"] == "no-store, no-cache, must-revalidate, max-age=0"`
  - `response.headers["Pragma"] == "no-cache"`
  - `response.headers["Expires"] == "0"`

## Key Decisions
- Used both backend headers + frontend cache-buster for defense-in-depth. Backend headers prevent proxy/browser caching; frontend timestamp prevents any intermediate cache from reusing a prior response even if headers are stripped.
- Did NOT modify the downloader service logic or UI layout (NON-GOALs respected).

## Test Coverage
- Backend: 8 download API tests green (including 4 new header assertions).
- Frontend: 589 tests green, no regressions.

## Open Questions
- None.
