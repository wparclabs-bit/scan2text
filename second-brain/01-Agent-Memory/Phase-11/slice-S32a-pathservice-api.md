# S32a-FIX-PATHSERVICE-API

**Date:** 2026-08-23
**Status:** COMPLETE
**Commit:** `af917dc`

## Context

S31-RECON-PROBE diagnosed 5 bugs. This slice addresses bug #2 (missing `get_paths()` accessor) and bug #3 (missing `ensure_dirs()` alias). Bug #1 (`parent.parent` on line 71) was re-diagnosed as a MISDIAGNOSIS — line 71 is correct for the locked portable layout where `backend/` sits inside the portable root, so `exe_dir.parent.parent` = portable root.

## Tasks

| # | Task | Status |
|---|------|--------|
| 0 | Forensics + frozen test baseline | ✅ 14/14 pass — line 71 confirmed correct |
| 1 | RED: add failing tests for `get_paths()` + `ensure_dirs` | ✅ 4 new tests fail (ImportError) |
| 2 | GREEN: minimal impl — `get_paths()` + `ensure_dirs` alias | ✅ 22/22 pass |
| 3 | Regression: re-run frozen tests | ✅ 14/14 pass |
| 4 | Syntax check (`py_compile`) | ✅ clean (pre-existing warning on line 241 only) |
| 5 | Commit | ✅ `af917dc` |

## Changes

### `src/scan2text/services/path_service.py` (+9 lines at EOF)
```python
def get_paths() -> PathService:
    """Return the module-level default PathService singleton."""
    return _default_instance


# Alias required by engine.py; delegates to ensure_runtime_dirs().
ensure_dirs = PathService.ensure_runtime_dirs
```

### `tests/unit/services/test_path_service.py` (+21 lines)
- `TestGetPathsAccessor.test_get_paths_returns_default_instance` — verifies import + isinstance
- `TestGetPathsAccessor.test_get_paths_returns_singleton` — verifies identity with `_default_instance`
- `TestEnsureDirsAlias.test_ensure_dirs_exists_and_callable` — verifies callable
- `TestEnsureDirsAlias.test_ensure_dirs_is_alias_of_ensure_runtime_dirs` — verifies `is` identity

## Test Count

`test_path_service.py`: **22 tests** (18 existing + 4 new)
`test_path_service_frozen.py`: **14 tests** (unchanged, regression green)

## What Was NOT Changed

- `path_service.py` line 71 (`parent.parent`) — confirmed correct, untouched
- `engine.py` — out of scope
- `feedback_service.py` — out of scope (bug #5, pending separate slice)
- PyInstaller rebuild — out of scope (NON-GOAL)
- Full backend test suite — deferred to GATE slice

## Remaining S31 Bugs (open)

1. `engine.py:57` `ovisocr2-q8.gguf`→`vlm.gguf` filename mismatch (bug #4)
2. `feedback_service.py:24` uses `base_dir` instead of `feedback_dir` property (bug #5)
3. Source/binary divergence (binary has code source doesn't — fixed by rebuild in future gate)

## Verification

- RED confirmed → GREEN confirmed
- All path_service tests green
- Line 71 `parent.parent` untouched
- git diff shows ONLY `get_paths()` + `ensure_dirs` alias added
