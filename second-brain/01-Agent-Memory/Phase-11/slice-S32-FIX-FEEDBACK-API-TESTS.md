# S32-FIX-FEEDBACK-API-TESTS

**Date:** 2026-08-23
**Status:** COMPLETE
**Commit:** `efe6644`

## Problem

S33a gate: 347/350. Three failures in `tests/test_api_feedback.py`:
- `test_get_pending_count`: assert 0 == 2
- `test_mark_sent_moves_file`: file not moved
- `test_post_feedback_creates_file`: hang/timeout (120s)

These were a **regression from S32-FIX-FEEDBACK-DIR** (77804d7), not pre-existing. The S29 gate was 339/339 green including these tests. The only feedback change since S29 was the `base_dir` → `feedback_dir` fix in `feedback_service.py:24-26`.

## Root Cause Analysis

### Assertion failures (tests 1 & 2)
The S32 fix changed `_ensure_feedback_dirs()` from:
```python
base = self._paths.base_dir
pending = base / "feedback" / "pending"
```
to:
```python
feedback_root = self._paths.feedback_dir
pending = feedback_root / "pending"
```

The tests mocked `PathService` with only `mock_paths.base_dir = tmp_path`. Since `feedback_dir` was never set on the mock, MagicMock auto-created it as a new MagicMock. Calls like `.glob("*.json")` and `.rename(dst)` operated on MagicMock objects, not real paths — so counts returned 0 and files were never moved.

### Hang (test 3)
Patching `scan2text.services.feedback_service.PathService` **after** `scan2text.api.main` had already been imported caused an import-deadlock. The deadlock occurred because:
1. `main.py` imports `feedback_routes` which imports `FeedbackService` from `feedback_service`
2. When `feedback_service.PathService` is patched mid-session, Python's import machinery encounters a conflict resolving the class reference during subsequent module operations
3. This manifested as a 120s timeout in TestClient creation/request handling

## Fix

**File changed:** `tests/test_api_feedback.py` (test-only, no source changes)

### Changes made:
1. **Moved PathService patch into the `app` fixture** — all three patches (QueueService, VlmOcrAdapter, PathService) now happen before importing `scan2text.api.main`, avoiding the import-deadlock
2. **Added `feedback_dir` to the mock** — `mock_paths.feedback_dir = tmp_path / "feedback"` ensures the service writes to the expected location
3. **Removed redundant per-test patches** — since the fixture now provides the mocked PathService, individual tests no longer need their own patch blocks

## Verification

- RED confirmed: `test_get_pending_count` (assert 0 == 2), `test_mark_sent_moves_file` (file not moved)
- GREEN: all 3 feedback API tests pass
- Targeted regression: all 11 feedback tests (3 API + 8 service) pass
- Full suite: **350 passed, 0 failures** in 7.5s
- Peak RAM: **1472 MB** (< 2 GB threshold)
- `py_compile`: zero errors
- `git diff` shows ONLY `tests/test_api_feedback.py` changed

## Key Learning

When patching a class that's been imported transitively by an already-loaded module, use the patch target that avoids triggering Python's import machinery mid-session. Putting all patches in the fixture (before the first import) prevents deadlocks. Alternatively, patch at a higher level (e.g., the route handler's dependency) rather than deep in the service module.
