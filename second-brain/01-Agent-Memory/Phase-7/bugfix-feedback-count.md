# Bugfix: feedback_service counting bug (test_returns_correct_count)

**Date:** 2026-08-11
**Slice:** BUG-FIX — test_feedback_service.py::test_returns_correct_count
**Status:** FIXED — backend 174/174 green

## What Was Broken

`test_feedback_service.py::TestGetPendingCount::test_returns_correct_count` failed with `assert 2 == 3`. The test saves 3 feedback entries and expects `get_pending_count()` to return 3, but it returned 2.

## Root Cause

`save_pending_feedback()` in `src/scan2text/services/feedback_service.py:40` generated filenames from `datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")`. When two calls executed within the same microsecond (which happens reliably in unit tests), they produced identical timestamps — e.g. `20260811T080500328973Z.json` — causing the second write to overwrite the first. Only 2 unique files landed on disk instead of 3.

The bug was in the **service logic**, not the test. The test correctly expected 3 files for 3 saves.

## The Fix

Added collision handling to `save_pending_feedback()` at `src/scan2text/services/feedback_service.py:48-53`:

```python
target = pending / filename
if target.exists():
    base = filename[:-5]
    suffix = 2
    while True:
        candidate = pending / f"{base}_{suffix}.json"
        if not candidate.exists():
            target = candidate
            break
        suffix += 1
```

Also changed `return filename` → `return target.name` so the caller receives the actual (possibly suffixed) filename. This matches the project's existing naming convention (`_2`, `_3` suffixes for collisions, as used in `resolve_output_path`).

## Test Coverage

- All 8 feedback service tests pass.
- Full backend suite: 174 passed, 0 failed.
- No frontend changes required.
- No other tests affected.
