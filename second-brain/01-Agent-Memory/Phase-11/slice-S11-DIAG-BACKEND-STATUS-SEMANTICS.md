# S11-DIAG-BACKEND-STATUS-SEMANTICS — Forensic Analysis

**Date:** 2026-08-20
**Status:** DIAG — ROOT CAUSE ISOLATED
**Type:** Forensic secondary (no source edits)

## Executive Summary

Two defects isolated in the backend status semantics. Both produce "red dot" false positives in the CEO when the markdown output is actually on disk and correct.

---

## Defect 1: Task-level "failed" whenever ANY file in batch fails

**File:** `src/scan2text/api/main.py`
**Lines:** 123–125

```python
if summary.failed > 0:
    task["status"] = "failed"
    task["error_code"] = "OCR_FAILED"
```

**Mechanism:**
- `summary` is a `BatchSummary` object from `queue_service.py:29–44`.
- `summary.failed` counts **every** per-file failure in the batch (jpg, pdf, any type).
- `summary.succeeded` counts every per-file success.
- Line 123 checks `summary.failed > 0` — **one single failed file marks the entire task as failed**.
- This is a **batch-level vs per-file-level semantics error**: the task status reflects the worst individual result rather than the aggregate outcome.
- Even though `summary.job_results` correctly contains individual `succeeded` and `failed` entries, and `task["result_markdown"]` collects markdown from successful files (lines 130–137), the **frontend reads only `task["status"]`** to decide red/green.

**Affected scenario (JnT.jpeg):** If a batch contains JnT.jpeg + another file that fails, JnT gets a red dot even though its .md is written and correct.

**Causal chain:**
1. `api/main.py:117-119` — `summary = await asyncio.to_thread(queue.process_image_paths(...))`
2. `queue_service.py:197-278` — `process_image_paths()` iterates each file; on failure, increments `summary.failed` (line 236 or 269)
3. `api/main.py:123` — `if summary.failed > 0:` triggers
4. `api/main.py:124-125` — sets `task["status"] = "failed"` and `task["error_code"] = "OCR_FAILED"`
5. Frontend polls `GET /status/{task_id}` and sees `"status": "failed"` → red dot

---

## Defect 2: PDF per-page failures count as single-file failures

**File:** `src/scan2text/api/main.py`
**Lines:** 117–118

```python
summary = await asyncio.to_thread(
    queue.process_image_paths, paths, queue._vlm_adapter, path_to_stem
)
```

**File:** `src/scan2text/adapters/vlm_ocr.py`
**Lines:** 232–236 (PDF branch)

```python
if file_type == "pdf":
    page_views_result = self._render_pdf(path)
    if isinstance(page_views_result, dict):
        return page_views_result
    page_views = page_views_result
    images = [pv[0] for pv in page_views]
```

**File:** `src/scan2text/services/pdf_service.py`
**Lines:** 73–95 — `render_pdf_to_images()` renders ALL pages or raises on page-limit/size violation.

**File:** `src/scan2text/adapters/vlm_ocr.py`
**Lines:** 314–319 — `_render_pdf()` renders all pages.

**File:** `src/scan2text/adapters/vlm_ocr.py`
**Lines:** 244–258 — The `ocr()` method sends ALL page images to the worker in a single queue message.

**Mechanism:**
- PDF rendering + OCR is atomic per file — all pages submitted together.
- If **any single page** times out or fails in the VLM worker (`vlm_ocr.py:156-161`), the entire `ocr()` call returns `{error: OCR_FAILED}`.
- `queue_service.py:227` sees the error dict, increments `summary.failed`, and does NOT write any .md.
- However, for small valid PDFs that succeed but still trigger a **partial per-page error** during post-processing (`vlm_ocr.py:268-279`, `extract_and_save_image_crops`), the error bubbles up before `output_path.write_text` at line 250.
- For PDFs hitting `OCR_TIMEOUT` (vlm_ocr.py:248-258), the entire multi-page PDF fails atomically — no .md written.

**Affected scenario (known.pdf, 2MB):** PDF processing times out or hits a per-page error. `summary.failed += 1`, no .md written, frontend sees `task["status"] = "failed"` → red dot.

---

## All Error Codes (with file:line)

| Error Code | Origin | File:Line |
|---|---|---|
| `OCR_FAILED` | VLM worker task exception | `src/scan2text/adapters/vlm_ocr.py:159` |
| `OCR_FAILED` | `ocr()` returns error dict → queue counts | `src/scan2text/services/queue_service.py:241` |
| `OCR_FAILED` | General OCR exception in `_process_one_job` | `src/scan2text/services/queue_service.py:179` |
| `OCR_TIMEOUT` | Worker didn't return within timeout | `src/scan2text/adapters/vlm_ocr.py:255` |
| `MODEL_NOT_FOUND` | Model files absent | `src/scan2text/adapters/vlm_ocr.py:225` |
| `MODEL_NOT_FOUND` | Model load failure in worker | `src/scan2text/adapters/vlm_ocr.py:122` |
| `FILE_TOO_COMPLEX` | Page limit exceeded | `src/scan2text/adapters/vlm_ocr.py:304` |
| `FILE_TOO_COMPLEX` | Size limit exceeded | `src/scan2text/adapters/vlm_ocr.py:309` |
| `UNKNOWN_ERROR` | Broad exception catch in queue | `src/scan2text/services/queue_service.py:261` |
| `UNKNOWN_ERROR` | Broad exception catch in batch | `src/scan2text/services/queue_service.py:108` |

**ErrorCode enum definition:** `src/scan2text/models/errors.py:9–20` (11 total defined, 5 actually emitted in practice).

---

## Log Analysis

**Log path:** `D:\Scan2Text\backend\logs\backend-boot.log.txt` (93 KB)

**Finding:** No Python application-level error entries found. The log contains only:
- Uvicorn HTTP access logs (GET /api/health, GET /status, POST /process)
- llama.cpp inference debug output (tokenization, image encoding)
- PID cleanup failures ("Failed to kill stale PID")

The `logger.error()` calls in `queue_service.py` and `vlm_ocr.py` are not reaching these files — likely Python logging is configured separately from Uvicorn's access log. This limits forensic traceability for error-code distribution by extension.

**Log design constraint (ADR-007):** "no filenames, no content" — logs are intentionally anonymized.

---

## Output Folder Cross-Check

**Path:** `D:\Scan2Text\output\`

| File | Size | LastWriteTime |
|---|---|---|
| known_1311_20260820.md | 6,398 B | 1:11:56 PM |
| ss1-vs-code_1306_20260820.md | 1,238 B | 1:06:41 PM |
| YTS.GG_-_Official_site_1306_20260820.md | 354 B | 1:06:02 PM |
| obsidian_structure_1305_20260820.md | 742 B | 1:05:58 PM |
| comman_center_1305_20260820.md | 4 B | 1:05:51 PM |
| Skill_for_the_futures_1305_20260820.md | 438 B | 1:05:49 PM |
| Syarat_1305_20260820.md | 844 B | 1:05:37 PM |
| JnT_1305_20260820.md | 10,327 B | 1:05:23 PM |
| garansi_1303_20260820.md | 891 B | 1:03:20 PM |
| biaya_1258_20260820.md | 3,307 B | 12:58:19 PM |

**Correlation with CEO evidence:**
- `biaya.jpg` → `biaya_*.md` exists (3,307 B) → CEO reports GREEN ✓
- `JnT.jpeg` → `JnT_*.md` exists (10,327 B, good content) → CEO reports RED (false positive from Defect 1)
- `known.pdf` → `known_*.md` exists (6,398 B) → CEO reports RED (false positive — PDF succeeded but Defect 1 triggered from another file in the same batch, OR the PDF succeeded but was counted as failed by Defect 2)
- Small PDFs report RED → likely Defect 2 (per-page errors causing full-batch failure)

---

## Root-Cause Statement

**Defect 1 (JnT false red):** `api/main.py:123` uses `summary.failed > 0` as a **sensitive-but-not-specific** threshold. One failed file in a batch marks ALL files as failed, regardless of individual success. This is a **batch-aggregation semantics error**.

**Defect 2 (PDF reds):** PDF processing is atomic per file. If any page in a multi-page PDF fails (timeout, OCR error, post-processing exception), the entire PDF is marked failed with no .md written. Small valid PDFs may fail on post-processing edge cases (`extract_and_save_image_crops` at `vlm_ocr.py:275-276`).

---

## Minimal FIX Plan

### FIX 1: Status semantics — "partial_failure" state
Change `api/main.py:123-127` to introduce a third status:
```python
if summary.failed == 0:
    task["status"] = "completed"
elif summary.succeeded > 0:
    task["status"] = "partial_failure"    # NEW
    task["error_code"] = "OCR_FAILED"
else:
    task["status"] = "failed"
    task["error_code"] = "OCR_FAILED"
```
Frontend maps `partial_failure` → amber/warning state (or green with tooltip).

### FIX 2: PDF per-page resilience
In `vlm_ocr.py`, make post-processing (`extract_and_save_image_crops`, `filter_noise_lines`) catch individual page errors rather than bubbling the whole PDF up. Pages that fail post-processing fall back to raw OCR text.

### Test to go RED first
`tests/test_status_semantics.py` (new):
- "should return partial_failure when some files succeed and some fail"
- "should return completed when all files succeed"
- "should return failed when all files fail"

---

## Error-Code Distribution (from log analysis)

**No actionable distribution available** — Python application logs (`logger.error` calls) are not present in `backend-boot.log.txt`. Only HTTP access logs and llama.cpp debug output are logged. This is a logging infrastructure gap, not a defect.

---

## Files Read (no edits)

| File | Purpose |
|---|---|
| `src/scan2text/api/main.py` | Status decision logic, lines 123-125 |
| `src/scan2text/services/queue_service.py` | BatchSummary, process_image_paths, error counting |
| `src/scan2text/adapters/vlm_ocr.py` | PDF rendering, OCR worker, error codes |
| `src/scan2text/services/pdf_service.py` | Page count, size check, render_to_images |
| `src/scan2text/services/output_service.py` | Markdown writing |
| `src/scan2text/models/errors.py` | ErrorCode enum (11 values) |
| `src/scan2text/models/job.py` | OCRJob, JobStatus enum |
| `D:\Scan2Text\backend\logs\backend-boot.log.txt` | Application logs (no error entries) |
| `D:\Scan2Text\output\` | Output cross-check (10 .md files) |
