# S10-FIX8 — Deadlock Freeze & Executor

**Date:** 2026-08-15
**Slice:** S10-FIX8-Deadlock-Freeze-And-Executor
**Phase:** Phase 10

## What Changed

### cli.py (The Magic Badge)
- Added `import multiprocessing` at module top
- Added `multiprocessing.freeze_support()` immediately before `main()` in the `if __name__ == "__main__":` block
- Fixes PyInstaller deadlock on Windows when multiprocessing.Queue is used without freeze_support

### main.py (The Line Cook)
- Wrapped synchronous `queue.process_image_paths(paths, queue._vlm_adapter)` in `await asyncio.to_thread(...)`
- Offloads heavy OCR work to a background thread, freeing the async event loop
- Fixes backend hang caused by blocking the event loop during model inference

### Tests
- New file: `tests/test_cli.py` — 2 tests for freeze_support bootstrap
- New test in `tests/test_api.py`: `TestRunProcessingOffloadsToThread::test_run_processing_uses_asyncio_to_thread`
- Backend test count: 237 → 239 passed

## Key Decisions
- Used `asyncio.to_thread()` (Python 3.9+) rather than `loop.run_in_executor(None, ...)` for cleaner syntax
- Used structural/source-code test for cli.py freeze_support (exec-based test caused uvicorn import side effects in test process)
- Boot gate verified: Uvicorn running on 127.0.0.1:47351, zero ModuleNotFoundError, zero Model files not found

## Test Coverage
- `TestCliFreezeSupport::test_freeze_support_import_exists` — asserts `import multiprocessing` present
- `TestCliFreezeSupport::test_freeze_support_called_in_main_block` — structural AST parse verifies ordering
- `TestRunProcessingOffloadsToThread::test_run_processing_uses_asyncio_to_thread` — asserts to_thread wrapping

## Open Questions
- None

## Verification
- RED confirmed before impl (3 failures)
- GREEN after impl (239 passed, 1 pre-existing failure)
- npm run typecheck: clean
- npm run build: success
- Boot gate: PASS (Uvicorn running, no ModuleNotFoundError)
- 3-way hash match: 964406C3951B763EBA6E1D37ACAF98E30D15D4742757E6478D13BAF0075713D4
