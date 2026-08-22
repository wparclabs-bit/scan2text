# S32-FIX-FEEDBACK-DIR

**Date:** 2026-08-23
**Phase:** 11 (Phase-7 backend hardening)
**Status:** COMPLETE

## Goal
Fix FeedbackService to use `self._paths.feedback_dir` so offline feedback writes to the portable-root `feedback/`, not `backend/feedback/`. Strict TDD.

## Baseline
S32-FIX-IMPORT-CHAIN complete (commit dd092f7). S31 diag confirmed 5 bugs; this slice addresses bug #5: `feedback_service.py:24-26` uses `base_dir` (= backend/ in frozen mode) instead of `feedback_dir` property.

## Forensics
- `PathService.feedback_dir` (line 91-94): in frozen mode returns `_resolve_portable_root() / "feedback"` = portable root's `feedback/`. Correct per AGENTS.md §0 locked layout.
- `feedback_service.py:24-26` (before fix): used `self._paths.base_dir` → in frozen mode, `base_dir` = `exe_dir` = `backend/`, so feedback landed in `backend/feedback/pending` and `backend/feedback/sent`.
- Constructor seam: `PathService(base_dir=..., app_root=...)` allows injecting controlled paths for testing.

## TDD Cycle
### RED
Added `tests/unit/services/test_feedback_service_feedback_dir.py` with 3 tests:
- `test_ensure_feedback_dirs_returns_paths_under_feedback_dir` — verifies `_ensure_feedback_dirs` returns paths under `feedback_dir`
- `test_save_pending_feedback_uses_feedback_dir_not_base_dir` — verifies write goes to portable root `feedback/`, not `backend/feedback/`
- `test_move_pending_to_sent_uses_feedback_dir` — verifies move operates within `feedback_dir`

Tests simulate frozen mode by setting `sys.frozen = True` and creating a `models/` anchor directory so `_resolve_portable_root()` resolves correctly. All 3 RED.

### GREEN
Changed `feedback_service.py:24-26`:
```python
# Before (bug):
base = self._paths.base_dir
pending = base / "feedback" / "pending"
sent = base / "feedback" / "sent"

# After (fix):
feedback_root = self._paths.feedback_dir
pending = feedback_root / "pending"
sent = feedback_root / "sent"
```
All 3 new tests GREEN. All 11 feedback tests pass (8 existing + 3 new). py_compile clean.

## Verification
- RED confirmed → GREEN confirmed
- `git diff` shows ONLY `feedback_service.py:24-26` changed
- All 11 feedback tests pass
- Syntax check: zero errors

## Files Changed
- `src/scan2text/services/feedback_service.py` — 3 lines (base_dir → feedback_dir)
- `tests/unit/services/test_feedback_service_feedback_dir.py` — new file, 3 tests

## Commit
`77804d7` — S32-FIX-FEEDBACK-DIR: use feedback_dir instead of base_dir in FeedbackService

## NON-GOALS (not touched)
- `path_service.py` — not edited; `feedback_dir` property verified correct
- `engine.py`, `jobs.py`, `output_service.py` — not touched
- No PyInstaller rebuild
- No full test suite run (deferred to S33 GATE)
- No disk migration of existing `backend/feedback/` files (S33 deploy step)

## Remaining S31 Bugs
Bug #1 (`path_service.py:71` `parent.parent`→`parent`) remains unfixed — deferred to next slice.
