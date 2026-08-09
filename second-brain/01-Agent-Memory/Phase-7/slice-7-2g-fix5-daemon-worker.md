# Slice 7.2g-fix5 — Daemon Worker (Clean Shutdown)

## What Changed
- `src/scan2text/adapters/vlm_ocr.py`: set `self._worker_process.daemon = True` before `.start()` so the OCR worker process does not block host-process exit.
- `tests/test_vlm_ocr.py`: added `test_worker_is_daemon_so_parent_can_exit` asserting `mock_proc.daemon is True` and `start` called once.

## Key Decisions
- **daemon=True, not terminate()**: daemon flag lets Python's multiprocessing atexit handler skip joining non-daemon children; the OS reaps the worker when the smoke/API host exits. No explicit shutdown path needed for this slice.
- **No other behavior change**: priority setting, queue plumbing, and error handling are untouched.

## Test Coverage
- New: `test_worker_is_daemon_so_parent_can_exit` (unit, fully mocked).
- Existing 121 tests remain green; total 122 passed.

## Open Questions
- Post-shutdown cleanup (joining, PID tracking) deferred to a future slice if host-process graceful shutdown becomes a requirement beyond "does not hang."
