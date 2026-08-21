# slice-S32-FIX-IMPORT-CHAIN (COMPLETE)

**Date:** 2026-08-23  
**Phase:** Phase-11  
**Slice:** S32-FIX-IMPORT-CHAIN  
**Status:** COMPLETE

---

## Baseline

- S32-DIAG-IMPORT-SWEEP complete (READ-ONLY). Two import bombs confirmed:
  1. `routes/jobs.py:13` — `save_markdown` missing from `output_service.py`
  2. `routes/jobs.py:60` — `Depends` not imported from fastapi (latent)

---

## Task 0: Forensics (READ-ONLY)

Confirmed diag findings:
- `jobs.py:7` imports `from fastapi import APIRouter, HTTPException` — missing `Depends`
- `jobs.py:13` imports `save_markdown` from `output_service` — does not exist
- `jobs.py:71` calls `save_markdown(job, full_text=full_text, pages=pages)`
- `OutputService.write()` signature: `(job, ocr_result, desired_stem=None) -> Path` — incompatible

---

## Task 1: RED (TDD)

- Confirmed `test_import_engine_succeeds` is RED with `ImportError: cannot import name 'save_markdown'`
- Added `TestSaveMarkdown::test_save_markdown_writes_md` — also RED for same ImportError
- 2 failed, 2 passed

---

## Task 2: GREEN (Implementation)

### Fix #1: Add `Depends` to jobs.py:7
```python
# BEFORE:
from fastapi import APIRouter, HTTPException
# AFTER:
from fastapi import APIRouter, Depends, HTTPException
```

### Fix #2: Add `save_markdown()` to output_service.py (~14 lines)
```python
def save_markdown(
    job: "OCRJob",
    full_text: str,
    pages: "list[OCRPage]",
) -> Path:
    """Save OCR markdown for a job. Convenience wrapper around OutputService.write()."""
    result = OCRResult(
        job_id=job.id,
        source_file=job.file_path,
        pages=pages,
        full_text=full_text,
    )
    svc = OutputService()
    return svc.write(job, result)
```

### Test Results: 4 passed in 0.45s
- `test_import_engine_succeeds` ✅ GREEN
- `test_save_markdown_writes_md` ✅ GREEN
- `test_model_filename_is_vlm_gguf` ✅ GREEN (unchanged)
- `test_webview_absent_from_source` ✅ GREEN (unchanged)

---

## Task 3: Targeted Regression

All 207 unit tests pass. No regressions.

---

## Task 4: Syntax Check

```
py -3.12 -m py_compile src/scan2text/routes/jobs.py src/scan2text/services/output_service.py
```
✅ Zero errors (no output)

---

## Verification

- `test_import_engine_succeeds` GREEN ✅
- `test_save_markdown_writes_md` GREEN ✅
- 207 unit tests pass ✅
- py_compile clean ✅
- `git diff --stat` shows ONLY:
  - `src/scan2text/routes/jobs.py` (+1 line)
  - `src/scan2text/services/output_service.py` (+16 lines)
  - `tests/unit/test_engine_webview_removal.py` (+25 lines)

---

## Files Changed

| File | Change |
|------|--------|
| `src/scan2text/routes/jobs.py` | Added `Depends` to fastapi import (1 line) |
| `src/scan2text/services/output_service.py` | Added `save_markdown()` function (~14 lines) |
| `tests/unit/test_engine_webview_removal.py` | Added `TestSaveMarkdown` class (+25 lines) |

---

## Report Completed vs Pending

| Task | Status |
|------|--------|
| Task 0: Forensics | ✅ COMPLETE |
| Task 1: RED | ✅ COMPLETE |
| Task 2: GREEN | ✅ COMPLETE |
| Task 3: Regression | ✅ COMPLETE |
| Task 4: Syntax Check | ✅ COMPLETE |
| Commit | PENDING |
| Obsidian Update | IN PROGRESS |
