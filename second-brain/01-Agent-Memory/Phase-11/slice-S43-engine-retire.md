# S43 — Engine Retirement (Atomic)

**Date:** 2026-08-23
**Status:** COMPLETE
**Type:** RETIRE — backend-only, NO rebuild

## Objective
Atomic retirement of legacy `engine.py` + `ui/static` + dependent tests + dead `exe_root` alias.

## Guards (Preflight)

### G1: Engine consumers
Select-String across `src\**\*.py`, `tests\**\*.py`, `scripts\*`, `packaging\*` for `scan2text\.engine|from scan2text import engine|import engine`:
- **Consumers found:** ONLY `test_engine_webview_removal.py` (3 imports) and `test_s38_backend_fixes.py` line 24 (`from scan2text.engine import create_app`)
- **Verdict: PASS** — no other consumers.

### G2: vlm.gguf filename pin
Select-String for `vlm\.gguf` in tests:
- **Pin location:** ONLY in `test_engine_webview_removal.py` (lines 5, 19, 27)
- **Action:** Ported assertion into `TestExpectedModelFilename` class in `tests/unit/services/test_path_service_models_resolution.py`. Test GREEN before proceeding.
- **Verdict: PASS** — pin preserved in live test.

### G3: exe_root consumers
Select-String for `exe_root` across source and tests:
- **Consumers found:** ONLY `engine.py` line 52 (`paths.exe_root`)
- **No conftest mocks, no other references.**
- **Verdict: PASS** — safe to remove property from path_service.py.

## Changes Made

### Deleted files
| File | Lines | Reason |
|------|-------|--------|
| `src/scan2text/engine.py` | 77 | Legacy engine (import-only by tests) |
| `src/scan2text/ui/static/app.js` | 95 | Dead static asset (mounted only by engine.py) |
| `src/scan2text/ui/static/index.html` | 74 | Dead static asset |
| `src/scan2text/ui/static/styles.css` | 45 | Dead static asset |
| `tests/unit/test_engine_webview_removal.py` | 68 | Test for dead engine module |

### Edited files
| File | Change | Lines |
|------|--------|-------|
| `tests/test_s38_backend_fixes.py` | Removed `TestI5EngineDeadRef` class + `FakeOCR` helper; removed `from scan2text.engine import create_app` import | -32 |
| `src/scan2text/services/path_service.py` | Removed dead `exe_root` property (lines 84-87) | -5 |
| `tests/unit/services/test_path_service_models_resolution.py` | Added `TestExpectedModelFilename` class with vlm.gguf pin assertion | +14 |

### Git diff stat
```
src/scan2text/engine.py                            | 77 ------------------
src/scan2text/services/path_service.py             |  5 --
src/scan2text/ui/static/app.js                     | 95 ----------------------
src/scan2text/ui/static/index.html                 | 74 -----------------
src/scan2text/ui/static/styles.css                 | 45 ----------
tests/test_s38_backend_fixes.py                    | 32 --------
tests/unit/services/test_path_service_models_resolution.py | 14 ++++
tests/unit/test_engine_webview_removal.py          | 68 ----------------
8 files changed, 14 insertions(+), 396 deletions(-)
```

## Test Arithmetic
- **Baseline:** 361 tests
- **Removed:** 5 (4 from test_engine_webview_removal.py + 1 from TestI5EngineDeadRef)
- **Added:** 1 (TestExpectedModelFilename)
- **Net change:** -4
- **New baseline:** 357 passed

## Verification Gates
- ✅ `py -3.12 -m pytest -q --tb=line` → 357 passed, 0 failed
- ✅ `py -3.12 -m py_compile path_service.py` → compiles (pre-existing SyntaxWarning only)
- ✅ Final grep for `scan2text\.engine|from scan2text import engine` → CLEAN (zero matches)
- ✅ Final grep for `exe_root` → CLEAN (zero matches)
- ✅ `packaging/scan2text-backend.spec` still references `cli.py` as entry point
- ✅ `Get-ChildItem src\scan2text\ui` → empty (directory removed)

## Impact Assessment
- **Production entry unchanged:** `packaging/scan2text-backend.spec` → `../src/scan2text/cli.py` (console=True)
- **Deployed artifacts UNCHANGED:** backend 45,593,779 bytes @ 2026-08-22 06:22:06; shell @ 06:25:13
- **Next rebuild:** v1.1 gate (PyInstaller + Tauri)
- **Frontend:** untouched, 682 tests green
- **Zero webview imports** anywhere in codebase

## Files Updated
- `second-brain/00-Current-State.md` — S43 entry added; S38 archived to state-history.md
- `second-brain/01-Agent-Memory/Phase-11/slice-S43-engine-retire.md` — this file
