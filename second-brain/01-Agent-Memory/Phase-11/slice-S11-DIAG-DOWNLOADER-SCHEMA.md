# S11-DIAG-DOWNLOADER-SCHEMA — Backend Download Architecture Forensics

**Date:** 2026-08-20  
**Phase:** 11 — Diagnosis  
**Status:** COMPLETE (read-only forensics)  
**Files Read:** `src/scan2text/routes/download.py`, `src/scan2text/services/model_downloader_service.py`, `tests/test_api_download.py`, `tests/unit/services/test_model_downloader_service.py`, `frontend/src/components/layout/ModelDownloaderModal.tsx`, `frontend/src/App.tsx`, `frontend/src/lib/apiBase.ts`, `src/scan2text/routes/health.py`, `src/scan2text/services/path_service.py`, `tools/prep_dummy_gdrive.py`, `version.json`  
**Files Modified:** None (read-only)

---

## 1. Download Routes (MCP/Graphify Discovery)

| Route | Method | Backend Handler | File | Line |
|---|---|---|---|---|
| `/api/download/start` | POST | `start_download()` | `src/scan2text/routes/download.py` | 17–24 |
| `/api/download/status` | GET | `get_download_status()` | `src/scan2text/routes/download.py` | 27–33 |
| `/api/download/progress` | GET | `get_download_progress()` | `src/scan2text/routes/download.py` | 36–42 |
| `/api/download/cancel` | POST | `cancel_download()` | `src/scan2text/routes/download.py` | 45–48 |

All routes delegate to a **module-level singleton**: `_download_svc = ModelDownloaderService()` (line 14 of `routes/download.py`).

The singleton is created with **no arguments**, meaning `app_root` defaults to `Path.cwd()`.

---

## 2. version.json Schema

### Exact Expected JSON Schema

```json
{
  "vlm_download_url": "https://...",    // Required — string, direct download URL
  "vlm_sha256": "c036cbb7553a...",      // Required — 64-char hex SHA256 digest
  "vlm_size_bytes": 5242880,            // Required — integer, file size in bytes
  "mmproj_download_url": "https://...", // Required — string, direct download URL
  "mmproj_sha256": "5647f05ec189...",   // Required — 64-char hex SHA256 digest
  "mmproj_size_bytes": 2097152          // Required — integer, file size in bytes
}
```

**Optional keys** (present in current `version.json` but NOT consumed by downloader):
- `app_version` — string
- `app_download_url` — string
- `release_notes` — array of strings

### Key Consumption Logic (model_downloader_service.py, lines 139–155)

For each model spec (`vlm`, `mmproj`), the downloader reads:
```python
url = version_data.get(f"{key_prefix}_download_url")       # e.g., "vlm_download_url"
expected_sha256 = version_data.get(f"{key_prefix}_sha256")  # e.g., "vlm_sha256"
declared_size = version_data.get(f"{key_prefix}_size_bytes", 0)  # e.g., "vlm_size_bytes"
```

If `url` is falsy (empty string, null, missing), the download fails immediately with:
```
"{prefix}_download_url not set in version.json"
```

### Schema Validation (get_progress disk-aware check, lines 86–96)

When status is NOT "downloading", `get_progress()` performs a disk-aware check:
```python
expected_sha = version_data.get(f"{key_prefix}_sha256")
expected_size = version_data.get(f"{key_prefix}_size_bytes", 0)
if not expected_sha or not expected_size:
    all_valid = False
    break
if not self._verify_file(models_dir / filename, expected_sha, expected_size):
    all_valid = False
    break
```

Both `sha256` AND `size_bytes > 0` are required for the disk check to pass.

---

## 3. version.json URL Configuration Location

### Where version.json is Expected

The downloader looks for `version.json` at:
```python
self._app_root / "version.json"
```

Where `self._app_root` is set by:
- Constructor arg `app_root` (optional Path)
- **Defaults to `Path.cwd()`** when no argument provided

### Critical Finding: Singleton Injection Gap

In `routes/download.py`, line 14:
```python
_download_svc = ModelDownloaderService()
```

This creates the service with `app_root=Path.cwd()`. It does NOT use `PathService.app_root` or any injected path. The `PathService` class (which correctly resolves portable root for frozen executables) is **never wired into the download service**.

In production (frozen PyInstaller), `Path.cwd()` will be inside `_internal/` (the Python library directory), NOT the portable root where `version.json` should live (e.g., `D:\Scan2Text\`).

### Current version.json Location (repo root)
```
D:\WingAI\Projects\scan2text\version.json
```

Contains Google Drive URLs with actual file IDs:
- VLM: `https://drive.google.com/uc?export=download&id=15oefDp7U_VMj2cdJ7xiOP9WlCwN2_lEl`
- MMProj: `https://drive.google.com/uc?export=download&id=1YOj0m9PzYKdPtACrZuQLtcZQZjxf3DMz`

### How version.json URL Could Be Configured

The URL is **hardcoded in the `version.json` file itself** — not in settings.json, environment variables, or code. The only configuration point is editing this JSON file. The `prep_dummy_gdrive.py` tool generates a fresh version.json with correct SHA256 hashes for dummy model files.

---

## 4. HTTP Client & Streaming Status

### Library Used

**`urllib.request`** (Python standard library, no third-party dependency).

Imported at lines 10–11 of `model_downloader_service.py`:
```python
import urllib.request
from urllib.request import urlopen
```

### Streaming: YES, 1MB chunks

The download uses streaming with a fixed 1 MB chunk size:
```python
_CHUNK_SIZE = 1 * 1024 * 1024  # 1 MB (line 18)

with open(part_path, "wb") as f:
    while True:
        chunk = resp.read(_CHUNK_SIZE)
        if not chunk:
            break
        f.write(chunk)
```

This is adequate for large files (774MB vlm.gguf). Each read pulls 1 MB at a time.

### Progress Tracking

Progress is tracked via `part_path.stat().st_size` after each write (line 209), updated in the shared state under lock. This means progress reflects bytes actually written to disk, not bytes received from the network.

### Content-Length Handling

```python
content_length = resp.getheader("Content-Length")
total = int(content_length) if content_length else declared_size or 0
```

If the response lacks a `Content-Length` header, it falls back to `declared_size` from version.json. If that's also missing/zero, total becomes 0 (progress bar shows 0%).

---

## 5. Google Drive >100MB HTML Trap Handling

### Answer: **NO** — No handling whatsoever.

### Evidence

1. **No redirect following logic**: `urllib.request.urlopen()` follows HTTP redirects automatically for 3xx responses, but Google Drive's virus warning for files >100MB returns an HTML page (status 200), NOT a 3xx redirect. The HTML is treated as the download content.

2. **No content-type validation**: After downloading, the code does NOT check if the response is actually a binary file vs. HTML. It writes whatever `resp.read()` returns to disk.

3. **SHA256 verification will catch it but silently fail**: The downloaded HTML content will have a different SHA256 than expected, triggering:
   ```python
   logger.error("SHA256 mismatch for %s: expected %s, got %s", ...)
   part_path.unlink(missing_ok=True)
   self._status = "failed"
   self._error_message = f"Hash mismatch for {filename}"
   ```

4. **No confirm token extraction**: Google Drive's >100MB files require parsing the HTML response for a `confirm` token parameter and re-requesting with it as a cookie. This logic is completely absent.

5. **No cookie jar setup**: Even if the HTML were parsed, there's no `http.cookiejar` usage to handle the download session cookie.

### What Actually Happens at Runtime

1. Frontend calls `POST /api/download/start`
2. Backend reads `version.json` from `Path.cwd()/version.json` — **this file doesn't exist in the production portable root** → status immediately becomes `"failed"` with error `"version.json not found"`
3. If version.json DID exist with GDrive URLs, the download would:
   - Fetch HTML virus-warning page instead of actual model binary
   - Write ~2-5KB of HTML to `vlm.gguf.part`
   - SHA256 check fails → status becomes `"failed"` with `"Hash mismatch for vlm.gguf"`
4. Frontend shows `downloader.error.versionJsonMissing` (the raw i18n key) because the error message matches `'version.json not found'`

### Why Progress Stuck at 0%

The `total_bytes` is set from `content_length` header OR `declared_size`. If `Content-Length` is missing from the GDrive response AND `vlm_size_bytes` in version.json is wrong (or if version.json isn't found at all), total becomes 0. With `bytes_downloaded = 0` and `total_bytes = 0`, the percentage calculation:
```javascript
const percentage = state.total_bytes > 0
    ? Math.round((state.bytes_downloaded / state.total_bytes) * 100)
    : 0
```
Correctly returns 0%.

---

## 6. Root Cause Summary

| Issue | Severity | Location |
|---|---|---|
| **version.json not found** — `ModelDownloaderService` uses `Path.cwd()` instead of `PathService.app_root` | CRITICAL | `routes/download.py:14` |
| **No GDrive >100MB bypass** — `urllib.request` cannot handle virus-warning HTML responses | CRITICAL | `model_downloader_service.py:191–250` |
| **version.json in wrong location** — repo root vs. portable root | MEDIUM | Deployment process |

---

## 7. Next Slice Recommendation

**S12-FIX-DOWNLOADER-SCHEMA** (or equivalent):

1. **Wire PathService into ModelDownloaderService**: Pass `PathService().app_root` when instantiating the download singleton in `routes/download.py`. This fixes the version.json lookup path.

2. **Implement GDrive >100MB bypass**: Replace `urllib.request.urlopen()` with a download function that:
   - Checks response content-type or HTML detection
   - If HTML detected, parses for `confirm` token from query string
   - Re-requests with cookie jar containing the session token
   - Falls back to `httpx` or `requests` if third-party deps are approved

3. **Add version.json to portable deployment**: Ensure `version.json` is copied to the portable root during PyInstaller build (add to `datas` in `.spec` file).

4. **Consider local mock server for testing**: The `prep_dummy_gdrive.py` tool already generates dummy models with correct hashes. A simple local HTTP server serving these files would bypass GDrive entirely for testing.
