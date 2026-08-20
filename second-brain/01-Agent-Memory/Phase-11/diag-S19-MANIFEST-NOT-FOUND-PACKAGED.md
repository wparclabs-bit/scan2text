# S19-DIAG: Manifest Not Found — Packaged Backend

**Date:** 2026-08-22  
**Slice:** S19-DIAG-MANIFEST-NOT-FOUND-PACKAGED  
**Status:** DIAGNOSIS COMPLETE

---

## Executive Summary

The deployed packaged backend resolves `app_root` to `D:\Scan2Text\backend\` (the directory containing `scan2text-backend.exe`) instead of `D:\Scan2Text\` (the portable root where `version.json` actually lives). This causes `ModelDownloaderService.start_download()` to fail with `"version.json not found"` at startup, which the frontend maps to "Model manifest not found. Restart download to fetch it."

---

## 1. Deploy Freshness

| Property | Dist (repo) | Deployed (portable) | Result |
|---|---|---|---|
| SHA256 | `CDCCDFAB758A8012E27CD7EB59CB08FD39285ADD649EE77883AEC88486460B26` | `CDCCDFAB758A8012E27CD7EB59CB08FD39285ADD649EE77883AEC88486460B26` | **MATCH** |
| LastWriteTime | 08/21/2026 00:58:47 | 08/21/2026 00:58:47 | **MATCH** |

**Conclusion:** Deployed binary is current. Not a stale deploy issue.

---

## 2. PathService `app_root` Computation

### Source: `src/scan2text/services/path_service.py`

```python
# Lines 64-70 — _resolve_app_root()
@staticmethod
def _resolve_app_root() -> Path:
    env_home = os.environ.get("SCAN2TEXT_HOME")
    if env_home:
        return Path(env_home).resolve()
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent   # ← LINE 69: THE BUG
    return Path.cwd()
```

### Dev mode (not frozen)
- `sys.frozen` = `False`
- `app_root` = `Path.cwd()` → repo root (e.g., `D:\WingAI\Projects\scan2text`)
- `version.json` at repo root → **found** ✓

### Packaged mode (frozen)
- `sys.frozen` = `True`
- `sys.executable` = `D:\Scan2Text\backend\scan2text-backend.exe`
- `app_root` = `Path(sys.executable).parent` = **`D:\Scan2Text\backend\`**
- `version.json` at `D:\Scan2Text\backend\version.json` → **NOT FOUND** ✗

### The correct resolution already exists

```python
# Lines 95-108 — _resolve_portable_root() (static method)
@staticmethod
def _resolve_portable_root() -> Path:
    """Resolve portable root for frozen executables.
    
    Walks up from exe_dir (exe_dir, exe_dir.parent, exe_dir.parent.parent)
    and returns the first ancestor containing a models/ directory.
    Falls back to exe_dir if no ancestor contains models/.
    """
    exe_dir = Path(sys.executable).parent
    for cand in (exe_dir, exe_dir.parent, exe_dir.parent.parent):
        if (cand / "models").is_dir():
            return cand
    return exe_dir
```

For the packaged layout:
- `exe_dir` = `D:\Scan2Text\backend\` → no `models/`
- `exe_dir.parent` = `D:\Scan2Text\` → **has `models/`** → returns `D:\Scan2Text\` ✓

This is the correct portable root. It's used by `settings_path`, `feedback_dir`, `output_dir`, and `logs_dir` properties — but **NOT by `app_root`**.

---

## 3. Downloader Manifest Check — Exact Code Path

### Source: `src/scan2text/routes/download.py`

```python
# Line 15 — singleton with app_root injected
_download_svc = ModelDownloaderService(app_root=PathService().app_root)
```

### Source: `src/scan2text/services/model_downloader_service.py`

```python
# Line 31 — constructor stores app_root
self._app_root = app_root or Path.cwd()

# Lines 123-128 — start_download() checks version.json
version_path = self._app_root / _VERSION_JSON    # ← LINE 123
if not version_path.exists():                      # ← LINE 124
    with self._lock:
        self._status = "failed"
        self._error_message = "version.json not found"   # ← LINE 127
    return
```

**`_VERSION_JSON`** = `"version.json"` (line 17)

So the exact path checked is: `self._app_root / "version.json"` = `D:\Scan2Text\backend\version.json` → **does not exist**.

### Frontend mapping

Source: `frontend/src/components/layout/ModelDownloaderModal.tsx`, line 100:
```tsx
if (state.error_message === 'version.json not found') return t('downloader.error.versionJsonMissing')
```

Which renders: **"Model manifest not found. Restart download to fetch it."**

---

## 4. Disk Truth — Test-Path Results

| Path | Exists |
|---|---|
| `D:\Scan2Text\version.json` | **True** |
| `D:\Scan2Text\backend\version.json` | **False** |
| `D:\Scan2Text\backend\_internal\version.json` | **False** |

`version.json` exists only at the portable root (`D:\Scan2Text\`), not inside `backend/` or `_internal/`.

---

## 5. Root Cause Classification

### **PACKAGED_APP_ROOT_MISRESOLUTION**

The `PathService._resolve_app_root()` method uses `Path(sys.executable).parent` for frozen executables, which resolves to the `backend/` subdirectory. However, `version.json` lives at the portable root (one level above `backend/`). The correct resolution logic already exists in `PathService._resolve_portable_root()`, which walks up the directory tree looking for a `models/` directory — but it is not used for `app_root`.

The S12-FIX injected `PathService().app_root` into `ModelDownloaderService`, but `app_root` itself was never fixed to resolve correctly in packaged mode. Unit tests mocked `app_root` so the real packaged path resolution was never exercised.

---

## 6. Recommended Remediation (NOT implemented)

**Option A — Fix `_resolve_app_root()` (preferred):**

Change line 69 of `path_service.py` from:
```python
return Path(sys.executable).parent
```
to:
```python
return self._resolve_portable_root()
```

This makes `app_root` resolve to the portable root in packaged mode, matching where `version.json`, `models/`, `output/`, etc. actually live.

**Option B — Fix `ModelDownloaderService` to use `_resolve_portable_root()`:**

Have `ModelDownloaderService` call `PathService._resolve_portable_root()` instead of using `app_root` for the `version.json` path. This is more surgical but creates a divergence between what `app_root` means and where `version.json` lives.

**Recommended: Option A** — it fixes the root cause in one place and aligns `app_root` with the portable root semantics used by all other PathService properties (`settings_path`, `feedback_dir`, `output_dir`, `logs_dir`).

---

## 7. Call Chain Summary

```
App.tsx → GET /api/health → files_present=false
    → POST /api/download/start
        → download.py line 15: ModelDownloaderService(app_root=PathService().app_root)
            → PathService._resolve_app_root() [line 64-70]
                → sys.frozen=True → Path(sys.executable).parent
                → D:\Scan2Text\backend\  ← WRONG
        → start_download() line 123: version_path = self._app_root / "version.json"
            → D:\Scan2Text\backend\version.json → NOT FOUND
        → error_message = "version.json not found"
    → Frontend ModelDownloaderModal line 100: maps to "Model manifest not found"
```
