# diag-S32: DIAG-IMPORT-SWEEP (READ-ONLY, Zero Edits)

**Date:** 2026-08-23  
**Phase:** Phase-11  
**Status:** COMPLETE — READ-ONLY diagnosis; fix design ready, no source edits applied.  
**Slice:** S32-DIAG-IMPORT-SWEEP  

---

## Baseline (from 00-Current-State.md)

- S32a + S32b complete: `get_paths()`/`ensure_dirs` added; webview branch removed; `vlm.gguf` pinned.
- `test_import_engine_succeeds` is STILL RED: `routes/jobs.py:13` imports `save_markdown` from `output_service.py`, which does not exist there.
- diag-S31 confirmed engine import chain has zero test coverage — more import bombs may be hiding.

---

## Task 0: Forensics — engine.py Import Subgraph

`graphify explain engine.py` returned degree 11 with these direct connections:

| Target | Relation | Line |
|--------|----------|------|
| `FakeOCR` | imports | L13 |
| `OCREngine` | imports | L13 |
| `setup_logging()` | imports | L17 |
| `jobs.py` | imports_from | L16 |
| `health.py` | imports_from | L14 |
| `settings.py` | imports_from | L15 |
| `create_app()` | contains | L31 |
| `launch_app()` | contains | L65 |
| `cli()` | contains | L92 |
| `get_app_ocr_engine()` | contains | L25 |

**Transitive blast radius:** `engine.py` pulls in `routes/jobs.py` which pulls in `output_service.save_markdown` (MISSING). This is the single point of failure for the entire import chain.

---

## Task 1: save_markdown Producer + Consumer

### (a) output_service.py — Public Function Inventory

File: `src/scan2text/services/output_service.py` (97 lines)

| Name | Type | Signature | Purpose |
|------|------|-----------|---------|
| `has_no_text(text: str) -> bool` | module-level func | `(str) -> bool` | Alphabetic-letter check for empty-OCR guardrail |
| `OutputService.__init__(path_service)` | class ctor | `(Optional[PathService]) -> None` | DI constructor |
| `OutputService.render_markdown(result) -> str` | staticmethod | `(OCRResult) -> str` | Renders OCRResult → Markdown string |
| `OutputService._has_raw_text(result) -> bool` | staticmethod | `(OCRResult) -> bool` | Checks if raw OCR contains letters (strips HTML tags) |
| `OutputService.write(job, ocr_result, desired_stem=None) -> Path` | method | `(OCRJob, OCRResult, Optional[str]) -> Path` | Writes Markdown file to disk; returns output path |

**Finding:** There is **no standalone `save_markdown()` function**. The equivalent capability lives as `OutputService.write()`, which has a different signature (`self`, `job`, `ocr_result`, optional `desired_stem`) and takes an `OCRResult` object — not `(job, full_text, pages)`.

### (b) jobs.py — Import Statement + Call Sites

File: `src/scan2text/routes/jobs.py` (107 lines)

**Import statement (line 13):**
```python
from scan2text.services.output_service import save_markdown
```

**Call site (line 71):**
```python
output_path = save_markdown(job, full_text=full_text, pages=pages)
```

- `job`: an `OCRJob` instance
- `full_text`: a `str` placeholder (`"[placeholder]"`)
- `pages`: a `list` placeholder (`[]`)
- **Expected return:** a `Path` assigned to `job.output_path`

**Secondary bomb (line 60, not yet hit because import fails first):**
```python
async def process_jobs(ocr_engine: OCREngine = Depends(lambda: _get_ocr_engine())) -> ...
```
`Depends` is used but **never imported** from `fastapi`. This is a `NameError` that surfaces only after `save_markdown` is fixed.

---

## Task 2: Import-Chain Sweep (Full Table)

Probe script: `C:\Users\user\AppData\Local\Temp\scan2text_import_sweep.py` (created, run, deleted).  
Runner: `py -3.12`; `PYTHONPATH=src`; each module in isolated subprocess.

```
MODULE                                                     STATUS  FIRST_ERROR
----------------------------------------------------------------------------------------------------------------------------------------------------------------
scan2text.adapters.__init__                                OK
scan2text.adapters.ocr_engine                              OK
scan2text.adapters.vlm_ocr                                 OK
scan2text.api.__init__                                     OK
scan2text.api.main                                         OK
scan2text.api.websocket_manager                            OK
scan2text.boot_guard                                       OK
scan2text.cli                                              OK
scan2text.engine                                           FAIL    ImportError: cannot import name 'save_markdown' from 'scan2text.services.output_service'
scan2text.models.__init__                                  OK
scan2text.models.errors                                    OK
scan2text.models.job                                       OK
scan2text.models.ocr_result                                OK
scan2text.models.settings                                  OK
scan2text.routes.__init__                                  OK
scan2text.routes.download                                  OK
scan2text.routes.feedback                                  OK
scan2text.routes.health                                    OK
scan2text.routes.jobs                                      FAIL    ImportError: cannot import name 'save_markdown' from 'scan2text.services.output_service'
scan2text.routes.settings                                  OK
scan2text.services.__init__                                OK
scan2text.services.feedback_service                        OK
scan2text.services.file_service                            OK
scan2text.services.logging_service                         OK
scan2text.services.model_downloader_service                OK
scan2text.services.output_service                          OK
scan2text.services.path_service                            OK
scan2text.services.pdf_service                             OK
scan2text.services.postprocess_service                     OK
scan2text.services.queue_service                           OK
scan2text.services.settings_service                        OK
scan2text.services.update_service                          OK
scan2text.smoke                                            OK
scan2text.utils.__init__                                   OK
scan2text.utils.cpu_budget                                 OK
scan2text.utils.prod_runtime                               OK

Total: 36 modules; OK=34  FAIL=2
```

**Failed modules:** `scan2text.engine` and `scan2text.routes.jobs` — both fail for the **same root cause**: transitive import of `save_markdown` from `output_service.py`.

---

## Task 3: Classification

| Bomb | File:Line | Error | Classification | Rationale |
|------|-----------|-------|----------------|-----------|
| #1 | `routes/jobs.py:13` | `ImportError: cannot import name 'save_markdown'` | **IMPLEMENTATION-REQUIRED** | No equivalent standalone function exists. `OutputService.write()` has a different signature and requires an `OCRResult` object, not `(job, full_text, pages)`. A new module-level adapter is needed. |
| #2 | `routes/jobs.py:60` | `NameError: name 'Depends' is not defined` (latent) | **TRIVIAL-IMPORT-FIX** | Add `Depends` to the existing `from fastapi import APIRouter, HTTPException` on line 7. One-character change to the import list. |

---

## Task 4: Fix Design (Design Only — Zero Edits)

### Bomb #1: Missing `save_markdown` — IMPLEMENTATION-REQUIRED

**Root cause:** The S32b slice added a test that imports `save_markdown` from `output_service`, but the function was never implemented. The existing `OutputService.write()` is the right capability but has an incompatible signature and requires an `OCRResult`.

**Fix design (size: ~10 lines of new code in `output_service.py`):**

```python
# BEFORE (does not exist):
# from scan2text.services.output_service import save_markdown  ← ImportError

# AFTER — add to output_service.py after the OutputService class (after line 97):

def save_markdown(
    job: "OCRJob",
    full_text: str,
    pages: "list[OCRPage]",
) -> Path:
    """Save OCR markdown for a job. Convenience wrapper around OutputService.write()."""
    from scan2text.models.ocr_result import OCRResult
    result = OCRResult(
        job_id=job.id,
        source_file=job.file_path,
        pages=pages,
        full_text=full_text,
    )
    svc = OutputService()
    return svc.write(job, result)
```

**Scope estimate:** ~10 lines. Single new function, one new import (internal). No new dependencies. Self-contained.

**Impact after fix:** Both `scan2text.engine` and `scan2text.routes.jobs` import successfully.

### Bomb #2: Missing `Depends` import — TRIVIAL-IMPORT-FIX

**File:** `src/scan2text/routes/jobs.py`  
**Line 7 (before):**
```python
from fastapi import APIRouter, HTTPException
```

**Line 7 (after):**
```python
from fastapi import APIRouter, Depends, HTTPException
```

**Scope:** 1 word added to existing import. Zero new dependencies.

---

## Verification

- **Zero source files modified** — confirmed via `git status --short`: no files under `src/` are modified (only docs, scripts, second-brain files have changes).
- Probe script created at `C:\Users\user\AppData\Local\Temp\scan2text_import_sweep.py`, run successfully, then deleted.
- All 36 modules audited; 34 OK, 2 FAIL (both from same root cause).

---

## Report Completed vs Pending

| Task | Status |
|------|--------|
| Task 0: Forensics (engine.py import graph) | ✅ COMPLETE |
| Task 1: inspect save_markdown producer + consumer | ✅ COMPLETE |
| Task 2: Import-chain sweep (36 modules) | ✅ COMPLETE |
| Task 3: Classification | ✅ COMPLETE |
| Task 4: Fix design | ✅ COMPLETE |

---

## Pending for Next Slice

1. Apply fix for Bomb #2 (trivial): add `Depends` to `jobs.py:7`.
2. Apply fix for Bomb #1 (implementation): add `save_markdown()` to `output_service.py`.
3. Re-run `test_import_engine_succeeds` — should turn GREEN.
4. Re-run full backend test suite — confirm no regressions.
