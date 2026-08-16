# Slice S10-FIX14 — Output Root Option A

## What Changed
- `src/scan2text/services/path_service.py`: Added `_resolve_output_dir()` static method. Frozen `output_dir` now walks up from exe_dir (exe_dir, exe_dir.parent, exe_dir.parent.parent) to the first ancestor containing a `models/` directory, then appends `/output`. Non-frozen behavior unchanged (`base_dir / "output"`).
- `tests/unit/services/test_path_service_frozen.py`: Added `test_frozen_output_dir_resolves_to_portable_root` — asserts frozen `output_dir` resolves to portable root (grandparent of exe when models/ lives there), not inside `dist/`.

## Key Decisions
- **Option A** (CEO locked 2026-08-16): Output at portable root (`<portable_root>/output`), settings/logs stay nested under exe_dir. Rationale: portable users expect outputs where they launched from; settings/logs are implementation detail.
- `_resolve_output_dir()` is a static method (no `self` dependency) that mirrors the same ancestor-walk logic already used by `_resolve_models_dir()`. Fallback: `exe_dir / "output"` if no ancestor contains `models/`.
- `ensure_runtime_dirs()` already calls `mkdir(parents=True, exist_ok=True)` on `output_dir`, so the new resolved path is auto-created.

## Test Coverage
- New test: `test_frozen_output_dir_resolves_to_portable_root` (RED→GREEN cycle)
- Full suite: 245 passed, 1 pre-existing failure (`test_health_model_files_found`)
- Zero regressions

## Build Verification
- Fresh hash: `2B557E12F9EA77A745000EFD5EAB9F1C956600D0561B572BD3074B9030915515`
- ≠ stale `FCE98DB5…`
- Three-way match: packaging dist = portable dist = repo dist — PASS
- Boot gate: Uvicorn running on 127.0.0.1:47351, zero ModuleNotFoundError, zero "Model files not found", health `files_present=true`

## Open Questions
- None.
