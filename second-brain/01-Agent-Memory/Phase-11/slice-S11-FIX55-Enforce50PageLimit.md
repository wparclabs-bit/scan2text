# S11-FIX55 — Enforce 50-Page Limit

**Date:** 2026-08-18
**Phase:** Phase 11 (Polling Endurance)
**Status:** COMPLETE

## What Changed

S11-DOC-PRD-50PageLimit-v1.1-Backlog had updated the PRD documentation to reflect a 50-page limit, but the actual backend code and frontend defaults still enforced 20 pages. This slice closes the gap by updating all hardcoded limits and defaults from 20 → 50.

### Backend
- `src/scan2text/services/pdf_service.py`: `MAX_PDF_PAGES_DEFAULT = 20` → `50`
- `src/scan2text/models/settings.py`: `AppSettings.max_pdf_pages` default `20` → `50`
- `src/scan2text/services/queue_service.py`: `process_batch` default `max_pdf_pages=20` → `50`

### Frontend
- `frontend/src/components/layout/SettingsDialog.tsx`: initial state `'20'` → `'50'`, fallback `?? 20` → `?? 50`

### Tests Updated
- `tests/unit/test_settings_validation.py`: default assertion 20 → 50
- `tests/unit/services/test_settings_service.py`: default assertion 20 → 50
- `tests/test_settings_effective_output.py`: assertion 20 → 50
- `tests/test_pdf_guard_settings.py`: at-limit test 20→50, over-limit test 25→51, live-settings init 20→50
- `tests/unit/adapters/test_vlm_ocr_routing.py`: `_max_pdf_pages` 20 → 50 (×2)
- `tests/test_pdf_chart_crops.py`: `_max_pdf_pages` 20 → 50
- `tests/test_vlm_ocr.py`: all `"max_pdf_pages": 20` → `50`
- `frontend/src/components/layout/SettingsDialog.test.tsx`: mock data 20 → 50
- `frontend/src/components/layout/panels/PreviewPanel.test.tsx`: mock data 20 → 50

## Key Decisions
- 50MB general file size limit: untouched
- 20MB PDF-specific file size limit: untouched
- 10-file batch cap: untouched
- TDD enforced: tests updated first (RED), then code (GREEN)

## Test Coverage
- Backend: 316 passed, 1 pre-existing failure (test_health_contract)
- Frontend: 637 passed, 0 failures
- Typecheck: zero errors
- Build: success

## Open Questions
None.
