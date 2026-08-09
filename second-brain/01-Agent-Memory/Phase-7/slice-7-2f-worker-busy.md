# Slice 7.2f — Worker Busy Lifecycle

## What Changed
- `src/scan2text/api/main.py`: `_run_processing` now sets `app.state.worker_busy = True` at entry, and resets to `False` on both success (after completed broadcast) and failure (after failed broadcast).
- `tests/test_api_surface.py`: added `test_run_processing_toggles_worker_busy` asserting the busy flag is `True` during processing and `False` after completion.

## Key Decisions
- Flip `worker_busy` inside the coroutine itself, not at the caller (`process_files`), so the flag accurately reflects actual processing time including any exception paths.
- Reset on both success and failure branches to guarantee the flag never stays stuck.

## Test Coverage
- New test: `test_run_processing_toggles_worker_busy` (118 total, all green).
- Existing health endpoint test already asserts `worker` field is `"idle"` or `"busy"`.

## Open Questions
- None.
