# Slice 7.2b — Settings Engine Knobs + Models Resolve from App Root

**Date:** 2026-08-09
**Phase:** Phase 7
**Baseline:** ec9443d
**Commit:** dc99d98 (stray images removed; 7.2b changes uncommitted at time of writing)

## What Changed

### src/scan2text/models/settings.py
- Extended `AppSettings` with engine-section fields (ADR-005 JSON-only knobs, no UI in MVP):
  - `language: str = "auto"`
  - `theme: str = "dark"`
  - `model_path: str = ""`
  - `mmproj_path: str = ""`
  - `n_ctx: int = Field(default=4096, ge=256)`
  - `n_threads: int = Field(default=0, ge=0)`
  - `ocr_timeout_seconds: int = Field(default=180, ge=10)`
  - `worker_priority: str = "below_normal"`

### src/scan2text/services/path_service.py
- `__init__` gains optional `app_root` parameter.
- New `_resolve_app_root()` static method (SCAN2TEXT_HOME → sys.executable.parent → cwd).
- New `app_root` property.
- `models_dir` now resolves from `app_root` (was `base_dir`).
- `assets_dir` now resolves from `app_root` (was `base_dir`).
- New `resolve_model_path(relative)` — absolute paths passed through; relative resolved against `app_root`.
- `ensure_runtime_dirs()` drops `assets_dir` from the creation loop (assets live under app_root, not auto-created at runtime).

### tests/unit/test_settings_validation.py
- Added `TestEngineSettingsDefaults` (2 tests): engine defaults + backward-compat with old dict.
- Added `TestPathServiceModelResolution` (8 tests): models_dir/app_root/assets_dir resolution, resolve_model_path relative+absolute.

### tests/unit/services/test_path_service.py
- Updated `test_ensure_runtime_dirs_creates_expected` to expect 4 dirs (not 5); asserts assets is NOT auto-created.

## Key Decisions
- `app_root` defaults to `base_dir` when only `base_dir` is injected — preserves backward compat for existing callers.
- `assets_dir` removed from `ensure_runtime_dirs` per spec (edit F) — assets are ship-time, not runtime-created.
- Engine knobs use `Field` validators (ge=) for n_ctx, n_threads, ocr_timeout_seconds.

## Test Coverage
- Backend: 112 passed (102 baseline + 10 new). Zero failures.
- Frontend: 565 green (unchanged; backend-only slice).

## Open Questions
- None.
