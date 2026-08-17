# S11-FIX34a — Settings EffectiveOutputDir

**Date:** 2026-08-17
**Phase:** Phase 11
**Slice:** S11-FIX34a
**Status:** GREEN

## What Changed

BUG-34: `GET /api/settings` returned the raw stored `output_dir` from `settings.json`, which could be empty string or whitespace. The frontend's "Open Folder" action (L2) depended on a valid path.

**Fix:** `GET /api/settings` now resolves the effective `output_dir` on read:
- If `settings.output_dir.strip()` is non-empty → return stored value unchanged.
- If blank after strip → replace with `str(PathService.output_dir)`.

**Files changed:**
- `src/scan2text/routes/settings.py` — added `PathService` import; GET route resolves fallback before returning.
- `tests/test_settings_effective_output.py` — new test file, 4 tests.

**Files untouched:**
- `SettingsService.load()` — stays raw, no mutation.
- `PUT /api/settings` — unchanged.
- Frontend — no changes (out of scope).
- Rust — no changes.

## Key Decisions

- **Resolve-on-read only** (CEO-approved Option A): GET never rewrites `settings.json`. The fallback is computed at response time.
- **PathService = single source of truth** for the fallback path. Mirrors what `PathService.output_dir` already computes (walk-up to models/ then `/output` in frozen mode; `base_dir / "output"` in dev).
- **`model_copy(update=...)`** used to produce a new `AppSettings` without mutating the loaded instance.

## Test Coverage

New file: `tests/test_settings_effective_output.py` (4 tests)
- `test_empty_stored_output_dir_returns_pathservice_fallback` — stored `""` → resolved path.
- `test_whitespace_stored_output_dir_returns_pathservice_fallback` — stored `"   \t  "` → resolved path.
- `test_nonempty_stored_output_dir_returns_as_is` — stored `"C:\custom"` → returned unchanged.
- `test_load_stays_raw_not_mutated` — `SettingsService.load()` still returns raw `""`.

Backend: 266 passed, 1 pre-existing failure (`test_health_contract`).
Frontend: 632 passed, 0 failures.

## Open Questions

None.
