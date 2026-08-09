# Slice 7.2e — Consolidate API: health + settings into running app

**Date:** 2026-08-09
**Phase:** Phase 7
**Baseline:** 431a205
**Tests:** 115 → 117 (+2)

## What Changed

- `src/scan2text/api/main.py`: imported `health_routes` and `settings_routes`; restricted CORS to localhost origins only (`http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:8765`, `http://127.0.0.1:8765`); included both routers via `app.include_router()`; initialized `app.state.worker_busy = False` in lifespan.
- `tests/test_api_surface.py`: new test file asserting `/api/health` returns status ok + worker idle/busy + ram + model; `/api/settings` returns max_pdf_pages, cpu_threads, language, theme.

## Key Decisions

- CORS locked to localhost per ADR-005 (local-first, offline). No wildcard origins.
- `worker_busy` initialized to `False` in lifespan; actual busy-flip deferred to slice 7.2f (do not edit `_run_processing`).
- Both routers already existed under `scan2text.routes.*` and were importable before wiring.

## Test Coverage

- `test_api_health_reachable`: GET /api/health → 200, body has status="ok", worker in ("idle","busy"), keys "ram" and "model" present.
- `test_api_settings_get_reachable`: GET /api/settings → 200, body has max_pdf_pages, cpu_threads, language, theme.
- All 117 tests pass (115 baseline + 2 new).

## Open Questions

- `worker_busy` is always `False` until 7.2f flips it during processing. Health endpoint will report "idle" until then — acceptable for this slice.
