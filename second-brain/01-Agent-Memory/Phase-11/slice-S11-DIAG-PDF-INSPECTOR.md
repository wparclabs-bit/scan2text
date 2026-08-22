# S11-DIAG-PDF-INSPECTOR — Forensic Report

**Date:** 2026-08-20  
**Slice Type:** DIAG (zero source edits, forensics + report only)  
**Bug Reference:** Test-Final.md §4.4 (60-page PDF not rejected), §6.1 (50-page boundary untested)  
**Policy Reference:** FR-03/FR-06 (v1.12): 20MB max file size + 50 pages max; reject with FILE_TOO_COMPLEX

---

## FINDINGS

### 1. BACKEND FORENSICS — FILE_TOO_COMPLEX Sites

| File | Line | Role |
|------|------|------|
| `src/scan2text/adapters/vlm_ocr.py` | 41 | `FILE_TOO_COMPLEX = "FILE_TOO_COMPLEX"` (local constant) |
| `src/scan2text/models/errors.py` | 14 | `FILE_TOO_COMPLEX = "FILE_TOO_COMPLEX"` (ErrorCode enum) |
| `src/scan2text/adapters/vlm_ocr.py` | 324 | Returns `{error: FILE_TOO_COMPLEX}` when page limit exceeded |
| `src/scan2text/adapters/vlm_ocr.py` | 330 | Returns `{error: FILE_TOO_COMPLEX}` when file size exceeded |
| `src/scan2text/services/pdf_service.py` | 52-59 | `check_page_limit(pdf_path, max_pages)` — reads page count via pypdfium2, compares against max_pages |
| `src/scan2text/services/pdf_service.py` | 62-70 | `check_pdf_size(pdf_path)` — reads file size via stat(), compares against `MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024` |
| `src/scan2text/services/pdf_service.py` | 73-95 | `render_pdf_to_images()` — calls check_page_limit then check_pdf_size BEFORE rendering (lines 77-82) |

**Where page count is read:** `pdf_service.py:53` → `count_pdf_pages()` uses `pypdfium2.PdfDocument` (lightweight, no pixel render).

**Where file size is checked:** `pdf_service.py:64` → `pdf_path.stat().st_size`.

**Are checks performed BEFORE pypdfium2 renders pixels?** YES — in both code paths:
- `render_pdf_to_images()` (pdf_service.py:77-82): checks BEFORE the `with pdfium.PdfDocument(...)` render block at line 87.
- `VlmOcrAdapter._render_pdf()` (vlm_ocr.py:321-332): calls check_page_limit and check_pdf_size BEFORE the pixel-render loop at lines 334-339.

### 2. SETTINGS TRACE — Dead Config

| Source | Default Value |
|--------|--------------|
| `src/scan2text/models/settings.py:9` | `max_pdf_pages: int = Field(default=50, ge=1)` |
| `src/scan2text/services/pdf_service.py:7` | `MAX_PDF_PAGES_DEFAULT = 50` |
| `src/scan2text/services/queue_service.py:79` | `max_pdf_pages: int = 50` (parameter default) |
| **Deployed `D:\Scan2Text\settings\settings.json`** | **`"max_pdf_pages": 150`** ← PROBLEM |

**Does the pipeline actually READ max_pdf_pages?** YES — but it reads from **live settings**, not the hardcoded default:
- `VlmOcrAdapter._render_pdf()` at line 320: `live_settings = self._settings_service.load()` → line 321: `check_page_limit(path, live_settings.max_pdf_pages)`.
- This means the deployed value of **150** is used in production, NOT the code default of 50.

**The check IS alive but uses the wrong limit.** A 60-page PDF passes because 60 ≤ 150.

### 3. FRONTEND FORENSICS — Drop Validation

| File | Line | Constant/Behavior |
|------|------|-------------------|
| `frontend/src/lib/fileValidation.ts` | 1 | `MAX_FILE_SIZE = 20 * 1024 * 1024` (20MB) |
| `frontend/src/lib/fileValidation.ts` | 48-49 | Rejects files > MAX_FILE_SIZE with reason `'tooLarge'` |
| `frontend/src/lib/fileValidation.ts` | 3-8 | ALLOWED_MIME_TYPES includes `application/pdf` |
| `frontend/src/components/dropzone/FileDropZone.tsx` | 36 | Calls `validateFilesBatch(files)` before adding to queue |

**Frontend enforces 20MB size cap:** YES — hardcoded at `fileValidation.ts:1`.  
**Frontend checks PDF page count:** NO — correctly delegates to backend.  
**Frontend accepts PDF type:** YES — `.pdf` in ALLOWED_EXTENSIONS (line 10), `application/pdf` in ALLOWED_MIME_TYPES (line 7).

### 4. TEST TRACE — Gap Analysis

| Test File | What It Tests | Gap |
|-----------|--------------|-----|
| `tests/test_pdf_guard_settings.py` | `check_page_limit()` with synthetic PDFs, page limit parameter | Tests page limit ONLY; no size check test |
| `tests/unit/services/test_file_service.py` | Extension support, directory enumeration | No size validation test (uses empty files) |
| `tests/unit/services/test_queue_service.py` | Queue processing flow | Does not test page/size rejection |
| `tests/test_vlm_ocr.py` | VLM adapter worker spawn, queues, timeout | Mocks `_render_pdf`; never tests guard path |
| `frontend/src/lib/fileValidation.test.ts` | Type + size validation (20MB) | Tests 20MB boundary correctly |

**Critical gap:** NO test asserts that `check_pdf_size()` rejects a PDF > 20MB. The function exists but is untested.

**Test path vs production path mismatch:**
- `QueueService.process_batch()` uses `max_pdf_pages` parameter (default 50) → calls `ocr_engine.process_pdf()`.
- But production uses `api/main.py:118` → `queue.process_image_paths()` → `vlm_adapter.ocr()` → `_render_pdf()` which reads **live settings** (150).
- The `process_batch()` default of 50 is never used in production — it's the FakeOCR test path.

### 5. PIPELINE FLOW MAP

```
Frontend drop → validateFilesBatch() [20MB check, type check]
    ↓ (valid files only)
store.startUpload() → POST /process (multipart/form-data)
    ↓
api/main.py:163 process_files() → saves to uploads/
    ↓
api/main.py:118 queue.process_image_paths(paths, vlm_adapter)
    ↓
vlm_adapter.ocr(path) [vlm_ocr.py:221]
    ↓ (file_type == "pdf")
vlm_adapter._render_pdf(path) [vlm_ocr.py:304]
    ↓
live_settings = self._settings_service.load() → max_pdf_pages = 150
    ↓
check_page_limit(path, 150) → 60 ≤ 150 → PASS ← BUG: should be 50
    ↓
check_pdf_size(path) → size ≤ 20MB → depends on file
    ↓
pypdfium2 render pixels (lines 334-339)
```

---

## ROOT CAUSE CLASSIFICATION

**Primary: DEAD CONFIG** — Deployed `settings.json` has `"max_pdf_pages": 150`, overriding the FR-03/FR-06 policy limit of 50 pages. The checks exist and are alive (they read live settings), but they use the wrong threshold.

**Secondary: MISSING TEST** — No unit test asserts `check_pdf_size()` rejects oversized PDFs. No integration test exercises the FILE_TOO_COMPLEX error path with a real >20MB PDF.

**Tertiary: NO SETTINGS CLAMPING** — The `AppSettings.max_pdf_pages` field has `ge=1` (minimum 1) but no maximum cap. A user can set it to any value including 150, silently bypassing the policy limit of 50.

---

## MINIMAL FIX PROPOSAL

### Fix 1: Reset deployed settings.json (immediate)
**File:** `D:\Scan2Text\settings\settings.json`  
**Change:** `"max_pdf_pages": 150` → `"max_pdf_pages": 50`  
**Impact:** Restores FR-03/FR-06 compliance immediately.

### Fix 2: Clamp settings value to policy max (defensive)
**File:** `src/scan2text/models/settings.py` line 9  
**Change:** `max_pdf_pages: int = Field(default=50, ge=1)` → add `le=50` (or a configurable policy max constant)  
**Impact:** Prevents any future settings override from exceeding the policy limit.

### Fix 3: Add check_pdf_size unit test
**File:** New or extend `tests/test_pdf_guard_settings.py`  
**Test:** Create a synthetic PDF > 20MB, assert `check_pdf_size()` returns `(False, error_msg)`.  
**Impact:** Catches future regressions in the size check.

### Fix 4: Add integration test for FILE_TOO_COMPLEX path
**File:** New test or extend `tests/test_vlm_ocr.py`  
**Test:** Mock a >20MB file path, assert `_render_pdf()` returns `{error: "FILE_TOO_COMPLEX"}`.  
**Impact:** Verifies the full error path from adapter to quarantine.

---

## ZERO-EDITS CONFIRMATION

This slice performed ONLY read operations and Obsidian documentation updates. No source files in `src/scan2text/` or `frontend/src/` were modified.

---

## CITED LINES SUMMARY

| Component | File | Line(s) | Finding |
|-----------|------|---------|---------|
| FILE_TOO_COMPLEX constant | `vlm_ocr.py` | 41 | Local error code string |
| FILE_TOO_COMPLEX enum | `models/errors.py` | 14 | ErrorCode enum member |
| Page limit check | `pdf_service.py` | 52-59 | Reads pages via pypdfium2, compares to max_pages |
| Size check | `pdf_service.py` | 62-70 | stat().st_size vs 20MB constant |
| Pre-render guard (pdf_service) | `pdf_service.py` | 77-82 | Checks BEFORE render loop at line 87 |
| Pre-render guard (adapter) | `vlm_ocr.py` | 321-332 | Checks BEFORE pixel render at lines 334-339 |
| Live settings read | `vlm_ocr.py` | 320-321 | `self._settings_service.load()` → uses deployed value |
| Settings default | `models/settings.py` | 9 | `default=50, ge=1` (no upper bound) |
| Deployed settings | `D:\Scan2Text\settings\settings.json` | — | `"max_pdf_pages": 150` ← ROOT CAUSE |
| Frontend size constant | `fileValidation.ts` | 1 | `MAX_FILE_SIZE = 20 * 1024 * 1024` |
| Frontend size check | `fileValidation.ts` | 48-49 | Rejects > MAX_FILE_SIZE |
| Frontend drop handler | `FileDropZone.tsx` | 36 | Calls validateFilesBatch before queue |
| QueueService default | `queue_service.py` | 79 | `max_pdf_pages: int = 50` (unused in prod) |
| Production path | `api/main.py` | 118 | `process_image_paths()` → vlm_adapter.ocr() |
