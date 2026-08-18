# S11-DIAG2 — Smoke Failures Forensics

**Date:** 2026-08-18
**Baseline:** FIX37 packaged build (backend 130E9C3E…, shell 1E7E7589…)
**Goal:** Root causes for BUG-37/38/39. Written report. NO edits, NO fixes.

---

## BUG-37 — 15KB PDF job red

### Evidence
- `src/scan2text/services/pdf_service.py:3` imports `pypdfium2 as pdfium` at module level.
- `packaging/scan2text-backend.spec:29-39` calls `collect_all("llama_cpp")` and `collect_all("PIL")` but **never calls `collect_all("pypdfium2")`**.
- Build log (`packaging/build-15.log:28899-28947`) shows PyInstaller auto-discovered hooks `hook-pypdfium2.py` and `hook-pypdfium2_raw.py`, but auto-discovery does NOT add pypdfium2's binaries or nested hidden imports to the `Analysis` `binaries`/`hiddenimports` lists — only the explicitly collected packages do.
- Warn file (`build/scan2text-backend/warn-scan2text-backend.txt`) does not list pypdfium2 as missing (hooks were found), but also does not confirm its DLLs were packaged.
- The spec's `all_binaries` and `all_hiddenimports` only contain llama_cpp and PIL entries.

### Root Cause
**Bundling gap.** The PyInstaller spec does not explicitly collect `pypdfium2`. Auto-discovered hooks run but the spec's `binaries` and `hiddenimports` arrays are never populated with pypdfium2's native DLLs or its internal submodules. At runtime, `import pypdfium2` may succeed (hook aliasing) but the underlying C library lookup fails, producing a `ModuleNotFoundError` or `OSError` on PDF rendering.

### Proposed Fix
Add to `packaging/scan2text-backend.spec` after the PIL collection:
```python
tmp_ret_pdf = collect_all("pypdfium2")
all_binaries = [*llama_binaries, *pil_binaries, *tmp_ret_pdf[1]]
all_hiddenimports = [*llama_hiddenimports, *pil_hiddenimports, *tmp_ret_pdf[2]]
```
Then rebuild and re-smoke.

---

## BUG-38 — Casio images: hallucinated `<img>` tags + number lists (no-text guard defeated)

### Evidence
- `src/scan2text/adapters/vlm_ocr.py:34` — `_VLM_PROMPT` instructs the model: *"For charts or images, represent them using an HTML image tag: `<img src="images/bbox_{left}_{top}_{right}_{bottom}.jpg" />`"*
- `src/scan2text/services/output_service.py:18-23` — `has_no_text()` returns `True` only when **no alphabetic character** exists in the text:
  ```python
  def has_no_text(text: str) -> bool:
      stripped = text.strip()
      if not stripped:
          return True
      return not any(c.isalpha() for c in stripped)
  ```
- `src/scan2text/services/output_service.py:57-61` — `_has_raw_text()` checks `has_no_text()` against raw page texts **before** post-processing.
- `src/scan2text/services/postprocess_service.py:241-316` — `extract_and_save_image_crops()` rewrites `<img src="images/bbox_...">` to relative paths **after** the guard decision.
- CEO smoke: casio 0 .md on disk contains `<img src="./f978c29c..._files/images/bbox_...">` tags and number lists `1\n2\n3\n4\n5\n6\n7\n8`.
- The raw OCR output contains alphabetic strings: `"img"`, `"src"`, `"images"`, `"jpg"`, `"bbox"` — all from the model's HTML tag hallucination.

### Root Cause
**Guard checks raw output, not semantic content.** The VLM model hallucinates `<img>` tags with alphabetic tag/attribute names. `has_no_text()` sees these alphabetic characters and returns `False` (text exists), so the guard does not trigger. The output is semantically empty (no real readable text — only HTML noise + digit lists) but passes the alphabetic-character test.

The guard is not defeated by a bug in its logic; it is defeated by the **input domain** — model-hallucinated HTML contains alphabetic characters that the simple `isalpha()` check cannot distinguish from real text.

### Proposed Fix
Two options:
1. **Strip HTML tags before checking:** In `_has_raw_text()`, run `re.sub(r'<[^>]+>', '', text)` before calling `has_no_text()`, so HTML tag names are excluded from the alphabetic check.
2. **Raise the bar:** Require a minimum count of alphabetic characters (e.g., ≥3 consecutive letters forming a word-like token) rather than any single alpha character.

Option 1 is simpler and directly addresses the img-tag false positive.

---

## BUG-39 — Downloader modal: raw error + doubled progress string

### Evidence
- `src/scan2text/services/model_downloader_service.py:124-128` — when `version.json` is missing:
  ```python
  if not version_path.exists():
      self._status = "failed"
      self._error_message = "version.json not found"
  ```
- `frontend/src/components/layout/ModelDownloaderModal.tsx:77-84` — `getErrorMessage()`:
  ```tsx
  const getErrorMessage = (): string => {
      if (!state.error_message) return ''
      if (state.error_message === 'network_error') return t('downloader.error.network')
      if (...includes('size')||...includes('mismatch')) return t('downloader.error.sizeMismatch')
      if (...includes('disk')||...includes('full')) return t('downloader.error.diskFull')
      if (...includes('cancel')) return t('downloader.error.userCancelled')
      return t('downloader.errorGeneric', { message: state.error_message })  // fallback
  }
  ```
- `frontend/src/locales/en.json:116` — `"errorGeneric": "Error: {{message}}"`
- For `"version.json not found"`, none of the specific checks match → falls through to `errorGeneric` → produces `"Error: version.json not found"`.
- `frontend/src/components/layout/ModelDownloaderModal.tsx:92-98` — `formatBytes(0)`:
  ```tsx
  if (bytes === 0) return t('downloader.progressUnknown')  // "Waiting for download info…"
  ```
- `frontend/src/locales/en.json:103` — `"progress": "{{downloaded}} of {{total}}"`
- When `total_bytes === 0` (download hasn't started or version.json missing): both `downloaded` and `total` format to `"Waiting for download info…"`, producing:
  ```
  "Waiting for download info… of Waiting for download info…"
  ```

### Root Cause
**Two independent issues:**

1. **Raw error message:** `getErrorMessage()` has no specific handler for `"version.json not found"`. It falls through to the generic `errorGeneric` template which prefixes the raw backend error with `"Error: "`. The CEO perceives this as "raw" because it's a technical message, not a user-friendly one.

2. **Doubled progress string:** `formatBytes(0)` returns the unknown-string translation for BOTH `downloaded` and `total` parameters. The template `"{{downloaded}} of {{total}}"` then interpolates the same string twice. This occurs whenever `total_bytes === 0` (initial state, or when the download can't determine file sizes).

### Proposed Fixes
1. Add a specific check in `getErrorMessage()` before the generic fallback:
   ```tsx
   if (state.error_message === 'version.json not found') return t('downloader.error.versionJsonMissing')
   ```
   Add `"versionJsonMissing": "Model manifest not found. Restart download to fetch it."` to both `en.json` and `id.json`.

2. In the progress display JSX, guard against `total_bytes === 0`:
   ```tsx
   {state.total_bytes > 0
     ? t('downloader.progress', { downloaded: formatBytes(state.bytes_downloaded), total: formatBytes(state.total_bytes) })
     : t('downloader.progressUnknown')
   }
   ```

---

## Summary Table

| Bug | Root Cause | Category | Proposed Fix |
|-----|-----------|----------|-------------|
| BUG-37 (PDF red) | `pypdfium2` not in spec `collect_all()` — bundling gap | Packaging | Add `collect_all("pypdfium2")` to spec, rebuild |
| BUG-38 (img tags + numbers) | `has_no_text()` checks raw output; HTML tag names are alphabetic | Code logic | Strip `<[^>]+>` before alpha check in `_has_raw_text()` |
| BUG-39 (raw error + doubled progress) | No specific handler for `version.json not found`; `formatBytes(0)` used for both params | Frontend UX | Add specific i18n key + guard `total_bytes > 0` in JSX |

---

## Test Coverage
- No tests written (diagnostic slice — NO edits per slice prompt).
- Existing tests unaffected.

## Open Questions
- BUG-37: Does the auto-discovered hook actually package pypdfium2's DLLs successfully, or does it only create import aliases? The warn file is inconclusive. Runtime traceback needed for definitive confirmation.
- BUG-38: Should the no-text guard also consider the post-processed output, or is raw-check sufficient with the HTML-stripping fix?
- BUG-39: Is the "raw" error display also happening in a non-i18n context (e.g., toast instead of modal)? Confirmed: modal uses `getErrorMessage()` correctly; the issue is the generic fallback producing a technical message.
