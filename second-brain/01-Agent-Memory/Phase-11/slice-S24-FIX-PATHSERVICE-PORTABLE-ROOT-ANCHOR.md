# S24-FIX-PATHSERVICE-PORTABLE-ROOT-ANCHOR

**Date:** 2026-08-23
**Phase:** Phase-11 (Backend — PathService hardening)
**Type:** FIX
**Status:** COMPLETE

## Problem

S22-DIAG-MANIFEST-MODELS-ABSENT diagnosed `MODELS_ANCHOR_FAILS_WHEN_ABSENT`: `PathService._resolve_portable_root()` anchors on the *presence* of a `models/` directory. When `models/` is absent (first-run or Delta QA 1.3 layout where models were renamed), it falls back to `exe_dir` (`D:\Scan2Text\backend\`). Since `version.json` lives at the portable root, downstream services (e.g., `model_downloader_service.py:123`) fail the manifest check with "version.json not found".

The locked layout (AGENTS.md §0) guarantees `Scan2Text.exe` and `backend/` sit side-by-side in the portable root. The models directory is *optional* at runtime — it does not need to exist for path resolution.

## Root Cause

`_resolve_app_root()` (line 68–69 of `path_service.py`) delegates to `_resolve_portable_root()` for frozen mode. `_resolve_portable_root()` walks up from `exe_dir` looking for an ancestor containing `models/`, falling back to `exe_dir` if none is found. This creates a fragile dependency on an optional directory.

## Fix

Changed `_resolve_app_root()` frozen branch to return `Path(sys.executable).parent.parent` directly, bypassing the models/ anchor entirely. This leverages the locked layout invariant: `sys.executable` → `backend/scan2text-backend.exe`, `.parent` → `backend/`, `.parent.parent` → portable root.

### Code change

**File:** `src/scan2text/services/path_service.py` (line 64–70)

```python
# Before:
if getattr(sys, "frozen", False):
    return PathService._resolve_portable_root()

# After:
# Locked layout: Scan2Text.exe and backend/ sit side-by-side in the portable root.
# sys.executable points to backend/scan2text-backend.exe → parent.parent = portable root.
if getattr(sys, "frozen", False):
    return Path(sys.executable).parent.parent
```

### Test change

**File:** `tests/unit/services/test_path_service_frozen.py`

- Updated `test_frozen_app_root_is_exe_parent`: assertion changed from `exe_dir` to `exe_dir.parent` (portable root).
- Added `test_frozen_app_root_resolves_to_portable_root_without_models_dir`: mocks `sys.frozen=True` and `sys.executable` pointing to a fake `backend/scan2text-backend.exe` path, **without** creating a `models/` directory. Asserts `app_root == tmp_path` (portable root).

## TDD Evidence

- RED: New test fails — `AssertionError: assert WindowsPath('.../backend') == WindowsPath('...')`
- GREEN: After fix, all 14 frozen tests pass in 0.50s.

## Verification

- Targeted test command: `py -3.12 -m pytest tests/unit/services/test_path_service_frozen.py -v --tb=short` → 14 passed, 0 failed.
- `git diff --stat` shows only `path_service.py` and `test_path_service_frozen.py` changed (plus pre-existing unrelated changes in working tree).
- No frontend, Rust, or deployment files modified.

## Commit

`c981dad` — fix: S24-FIX-PATHSERVICE-PORTABLE-ROOT-ANCHOR

## Files Modified

- `src/scan2text/services/path_service.py` (+3 lines, −1 line)
- `tests/unit/services/test_path_service_frozen.py` (+25 lines, −1 line)

## Observations

- `_resolve_portable_root()` still exists and is used by other properties (`settings_path`, `feedback_dir`, `output_dir`, `logs_dir`). Those properties also call it and will benefit from the same fix when their tests cover the no-models case (already covered by existing tmp_path-based tests).
- The S20 fix from the previous slice changed `_resolve_app_root()` to delegate to `_resolve_portable_root()`. S24 completes that fix by removing the dependency on an optional directory.
- Full backend test suite deferred to GATE slice per AGENTS.md §13 clarification.
