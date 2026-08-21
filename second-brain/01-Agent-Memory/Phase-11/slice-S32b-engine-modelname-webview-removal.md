# S32b: Engine Model Filename + WebView Removal

**Date:** 2026-08-23
**Status:** COMPLETE (2/3 tests GREEN; import test blocked by pre-existing bug)
**Commit:** `332cec8`

## Context

S31 diag identified 5 bugs. S32a fixed bugs (2) and (3) (get_paths accessor + ensure_dirs alias). S32b targets bugs (1) from engine.py perspective: remove dead webview code and fix the model filename pin.

## Forensics (Task 0)

- **Production entry point:** `cli.py` → `main()` → `uvicorn.run(app, host=host, port=port)` on 127.0.0.1:47351. Tauri spawns `scan2text-backend.exe` which runs `cli.py`. No webview, no headless flag.
- **engine.py is standalone:** not imported by the production path. Its `launch_app()` with `headless=False` default was dead code for production.
- **Verdict:** Proceed. No SLICE_BLOCKED.

## Changes (engine.py)

| Line | Before | After |
|------|--------|-------|
| 9 | `import webview` | *(deleted)* |
| 57 | `"ovisocr2-q8.gguf"` | `"vlm.gguf"` |
| 64-85 | `launch_app(port, headless=False)` with if/else branch | `launch_app(port)` → single `uvicorn.run()` call |
| 88-93 | `cli()` with `--headless` flag | `cli()` without `--headless` |

## Tests (tests/unit/test_engine_webview_removal.py)

| Test | Status | Notes |
|------|--------|-------|
| `test_import_engine_succeeds` | RED | Blocked by pre-existing `save_markdown` missing from `output_service.py` (unrelated to S32b) |
| `test_model_filename_is_vlm_gguf` | GREEN | Asserts `"vlm.gguf" in source` and `"ovisocr2-q8.gguf" not in source` |
| `test_webview_absent_from_source` | GREEN | Asserts `"webview" not in source` (absence test per AGENTS.md §13) |

## Verification

- Targeted tests: 2 passed, 1 failed (pre-existing blocker)
- `py -3.12 -m py_compile src/scan2text/engine.py`: exit 0, zero errors
- `git diff` confirms: webview import removed, headless branch removed, filename changed, new test file added

## Pre-existing Blocker (out of scope)

`src/scan2text/routes/jobs.py:13` imports `save_markdown` from `output_service.py`, but that function does not exist in the current source. This causes `import scan2text.engine` to fail with `ImportError`. This is a separate bug not addressed by S32b.

## Files Changed

- `src/scan2text/engine.py` — removed webview, simplified launch_app, fixed filename
- `tests/unit/test_engine_webview_removal.py` — 3 new targeted tests (created)
- `second-brain/00-Current-State.md` — baseline + changelog updated
