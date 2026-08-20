# S20-FIX-PATHSERVICE-APP-ROOT-PACKAGED

**Date:** 2026-08-22
**Phase:** Phase 11 — Backend Path Resolution Fix
**Status:** COMPLETE
**Commit:** `37109b0`

## Context

S19-DIAG diagnosed **PACKAGED_APP_ROOT_MISRESOLUTION**: `PathService._resolve_app_root()` returns `D:\Scan2Text\backend\` for frozen executables, but `version.json` lives at the portable root `D:\Scan2Text\`. The `ModelDownloaderService` checks `app_root / "version.json"` → fails.

The correct resolution logic (`_resolve_portable_root()`) already existed in PathService but was not wired into `_resolve_app_root()`.

## RED — Failing Test

Added `test_frozen_app_root_resolves_to_portable_root` to `tests/unit/services/test_path_service_frozen.py`:
- Creates tmp_path with `models/` at root and `backend/app.exe` nested inside
- Mocks `sys.frozen=True`, `sys.executable` pointing to the nested exe
- Asserts `svc.app_root == tmp_path` (portable root), NOT `tmp_path/backend`

**Result:** FAILED as expected. `app_root` returned `backend/` instead of portable root.

## GREEN — Fix Applied

Changed `src/scan2text/services/path_service.py` line 69:
```python
# Before (bug):
return Path(sys.executable).parent

# After (fix):
return PathService._resolve_portable_root()
```

`_resolve_portable_root()` walks up from exe_dir looking for the first ancestor containing a `models/` directory — exactly what's needed for the portable layout where `backend/scan2text-backend.exe` sits one level below the portable root.

Also updated `test_resolve_model_path_frozen_uses_models_dir` to assert the new correct behavior (`app_root == tmp_path/dist` instead of `exe_dir`).

## Test Results

- **Frozen tests:** 13/13 passed
- **Other path_service tests:** 31/31 passed
- **Total:** 44/44 path_service tests pass

## Files Modified

1. `src/scan2text/services/path_service.py` — 1 line change (line 69)
2. `tests/unit/services/test_path_service_frozen.py` — +28 lines (new test) + 3 lines updated (existing test assertion)

## Impact

- `ModelDownloaderService.start_download()` will now find `version.json` at the portable root in packaged mode
- All other PathService properties (`settings_path`, `feedback_dir`, `output_dir`, `logs_dir`) already use `_resolve_portable_root()` — this fix brings `app_root` in line with them
- No frontend, Rust, or deployment changes

## Verification

- New test confirms `app_root` returns portable root in frozen mode when `models/` exists at an ancestor
- All existing PathService tests still pass (no regression)
- `git diff` shows only `path_service.py` and `test_path_service_frozen.py` changed
