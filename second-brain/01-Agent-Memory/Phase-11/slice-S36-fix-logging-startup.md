# Slice S36 — Fix Logging Startup

**Date:** 2026-08-24
**Status:** COMPLETE

## Problem
`app.log` was missing at runtime despite `setup_logging()` and `ensure_runtime_dirs()` existing in `engine.py`. The production entry point is `cli.py` (called by the PyInstaller spec), which never called these functions — `engine.py` is dead code for the frozen build.

## Root Cause
`cli.py::main()` jumped straight to `get_host()` / `get_port()` → `boot_guard()` → `uvicorn.run()` without any logging or directory setup. The rotating file handler and runtime directories (logs/, output/, settings/, models/) were never created in the production path.

## Fix
**`src/scan2text/cli.py`:** Added two calls at the top of `main()`, before any host/port resolution:
```python
setup_logging()
get_paths().ensure_runtime_dirs()
```
Plus the corresponding imports from `scan2text.services.logging_service` and `scan2text.services.path_service`.

## TDD Evidence
- **RED:** `tests/test_cli_startup.py` — 2 failed (`AttributeError: ... does not have the attribute 'setup_logging'`)
- **GREEN:** After edit — `2 passed in 0.44s`
- **py_compile:** clean, no output

## Verification
- pytest `tests/test_cli_startup.py -q`: **2 passed**
- `py -3.12 -m py_compile src/scan2text/cli.py`: **exit 0, no output**
- `git status --porcelain` relevant changes: `M src/scan2text/cli.py` + `?? tests/test_cli_startup.py`

## Non-goals respected
- No exe rebuild (S37-GATE)
- No engine.py cleanup
- No api/main.py lifespan modification
