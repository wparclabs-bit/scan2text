# S38-BACKEND-FIXES

## Summary
Fixed four diagnosed backend issues in a single TDD slice: I1 (error-code preservation in api/main.py), I2 (portable-root split-brain in path_service.py), I3 (settings default persistence in settings_service.py), and I5 (dead exe_root reference in engine.py). 9 new tests added to `tests/test_s38_backend_fixes.py`. Full suite: 361 passed (352 + 9), 0 failures. Backend exe STALE pending S40 rebuild.

## Changes
- `src/scan2text/api/main.py:123-125` — preserve task error_code instead of hardcoding OCR_FAILED
- `src/scan2text/services/path_service.py` — reverse walk order (grandparent→parent→exe_dir), unify _resolve_models_dir to delegate to _resolve_portable_root, add exe_root property
- `src/scan2text/services/settings_service.py:42-44` — persist defaults to disk on first creation
- `src/scan2text/engine.py:52` — paths.exe_root now valid (alias for app_root)
- `tests/test_s38_backend_fixes.py` — 9 new behavior tests covering all four issues

## Commit
Pending.
