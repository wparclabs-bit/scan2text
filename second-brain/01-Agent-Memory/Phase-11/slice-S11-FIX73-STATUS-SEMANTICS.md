# S11-FIX73 — Backend Status Semantics

**Date:** 2026-08-20
**Phase:** 11
**Defect:** S11-DIAG-BACKEND-STATUS-SEMANTICS — Defect 1

## Problem
`src/scan2text/api/main.py:123` used `if summary.failed > 0` to mark the entire batch task as `"failed"`, even when `succeeded > 0` (successful files already wrote `.md` to disk). CEO evidence: JnT.jpeg and known.pdf showed red status despite good `.md` files on disk.

## Root Cause
Decision logic at `main.py:123-127` treated any failure as total task failure:
```python
# BEFORE (bug)
if summary.failed > 0:
    task["status"] = "failed"
    task["error_code"] = "OCR_FAILED"
else:
    task["status"] = "completed"
```

## Fix (CEO Option A)
Succeeded > 0 → status `"completed"` (even if failed > 0). Failed only when `succeeded == 0`. Partial failure recorded via new `PARTIAL_FAILURE` error_code for observability.

### Changes
- **`src/scan2text/api/main.py:123-130`** — New decision logic:
  ```python
  if summary.succeeded == 0 and summary.failed > 0:
      task["status"] = "failed"
      task["error_code"] = "OCR_FAILED"
  elif summary.succeeded > 0 and summary.failed > 0:
      task["status"] = "completed"
      task["error_code"] = "PARTIAL_FAILURE"
  else:
      task["status"] = "completed"
  ```
- **`src/scan2text/models/errors.py`** — Added `PARTIAL_FAILURE = "PARTIAL_FAILURE"` to `ErrorCode` enum (backend-only, logged, never surfaced as UI status).
- **`tests/test_status_semantics.py`** — 4 new TDD tests (2 were RED before fix, 2 were already GREEN).

## Tests
- **RED:** 2/4 tests failed (status_completed assertion, error_code assertion).
- **GREEN:** All 4 new tests pass. All 46 targeted api + queue_service tests pass (zero regressions).
- Full suite deferred to GATE slice.

## Non-Goals
- No frontend changes. No new FR-04 status values. No per-page PDF fix (FIX74 next). No logging fix. No rebuild. No full pytest suite.

## Status
**COMPLETE** — RED→GREEN verified, targeted tests green, Obsidian updated, committed.
