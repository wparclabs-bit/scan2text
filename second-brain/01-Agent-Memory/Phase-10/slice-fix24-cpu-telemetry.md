# S10-FIX24 — CPU Telemetry

## What Changed
- `src/scan2text/routes/health.py`: added `_cpu()` using `psutil.cpu_percent()`, included `"cpu": _cpu()` in `/api/health` response
- `frontend/src/components/layout/BottomStatusBar.tsx`: added `cpuPercent` state, reads `data.cpu?.percent` from health poll, renders CPU% between RAM and version with separator
- `frontend/src/locales/en.json` + `id.json`: added `bottomBar.cpuUsage` key
- `tests/test_health.py`: added `test_health_returns_cpu_percent` asserting numeric 0-100
- `frontend/src/components/layout/BottomStatusBar.test.tsx`: added CPU render test from mocked health

## Key Decisions
- Used `psutil.cpu_percent()` directly (no interval) — fast, no tight loop, satisfies NFR-03 zero-CPU idle
- psutil already locked in pyproject.toml; no new dependency install needed (CEO-approved per slice)
- CPU slot placed between RAM and version in BottomBar center zone, consistent with FR-02/§14

## Test Coverage
- Backend: `test_health_returns_cpu_percent` — asserts `cpu.percent` is numeric in [0, 100]
- Frontend: renders `CPU: 27%` from mocked health response

## Open Questions
- None

## Baselines
- Backend: 260 passed, 1 pre-existing failure (unchanged)
- Frontend: 628 passed, 0 failures
- Typecheck: clean
