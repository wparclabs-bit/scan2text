# DIAG S22 — MANIFEST / MODELS ABSENT

- **Slice:** S22-DIAG-MANIFEST-MODELS-ABSENT
- **Date:** 2026-08-22
- **Type:** Diagnosis (source forensics + live probe). No source edits, no rebuild, no redeploy.
- **Root cause class:** `MODELS_ANCHOR_FAILS_WHEN_ABSENT`

## 1. Baseline / Symptom

Delta QA 1.3 renamed the shipped `models/` → `models_backup/`. Deployed backend (S21, includes S20 fix) still fails:

> `POST /api/download/start` returns HTTP **200** but **no download activity** and **no manifest found**.

Hypothesis tested: with `models/` absent, `_resolve_portable_root()` loses its anchor, `app_root` falls back to a wrong directory, and `version.json` (at the portable root) is not found.

## 2. Source Forensics

### 2.1 `src/scan2text/services/path_service.py`

`_resolve_app_root()` — line 64–70:
```python
@staticmethod
def _resolve_app_root() -> Path:
    env_home = os.environ.get("SCAN2TEXT_HOME")
    if env_home:
        return Path(env_home).resolve()
    if getattr(sys, "frozen", False):
        return PathService._resolve_portable_root()   # <-- line 69
    return Path.cwd()
```
For frozen executables, `app_root` is delegated to `_resolve_portable_root()`.

`_resolve_portable_root()` — line 95–108 (THE ANCHOR + FALLBACK):
```python
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

    return exe_dir          # <-- FALLBACK: returns exe_dir (backend/) when no models/ found
```
- **Anchor:** first ancestor of `exe_dir` containing a `models/` directory.
- **Fallback:** if NO ancestor contains `models/`, returns `exe_dir` itself.
- For the locked portable layout, `exe_dir = D:\Scan2Text\backend\`. So the fallback resolves to `D:\Scan2Text\backend\` — which does **NOT** contain `version.json` (that lives at `D:\Scan2Text\version.json`).

### 2.2 `src/scan2text/services/model_downloader_service.py`

`start_download()` manifest check — line 123–128:
```python
version_path = self._app_root / _VERSION_JSON          # line 123  ("version.json")
if not version_path.exists():
    with self._lock:
        self._status = "failed"                        # line 126
        self._error_message = "version.json not found" # line 127
    return
```
If `app_root / "version.json"` is missing → status `"failed"`, `error_message = "version.json not found"`. This is the exact reported symptom.

### 2.3 `src/scan2text/routes/download.py` — singleton pins app_root at startup (compounding factor)

Lines 14–15:
```python
# Module-level singleton — app_root injected from PathService.
_download_svc = ModelDownloaderService(app_root=PathService().app_root)
```
`app_root` is resolved **once, at backend import/startup**, and captured into a module-level singleton for the process lifetime. Creating `models/` *after* startup does not change the pinned `app_root`.

## 3. Live Probes (deployed binary, started directly — NOT via Tauri)

Deployed layout confirmed: `D:\Scan2Text\` contains `backend/`, `logs/`, `models_backup/`, `output/`, `settings/`, `Scan2Text.exe`, `version.json`. `models/` absent (renamed to `models_backup`). Backend bound `127.0.0.1:47351`.

### Probe A — models/ ABSENT, fresh start (PID 26552)
```json
// POST /api/download/start
{ "status": "failed", "bytes_downloaded": 0, "total_bytes": 0, "error_message": "version.json not found" }
// GET /api/download/progress
{ "status": "failed", "bytes_downloaded": 0, "total_bytes": 0, "error_message": "version.json not found" }
```
→ HTTP 200 with `failed` body. **Hypothesis confirmed.**

### Probe B — empty models/ created, NO restart (same PID 26552)
```json
// POST /api/download/start
{ "status": "failed", "bytes_downloaded": 0, "total_bytes": 0, "error_message": "version.json not found" }
// GET /api/download/progress
{ "status": "failed", "bytes_downloaded": 0, "total_bytes": 0, "error_message": "version.json not found" }
```
→ Identical failure. Proves the singleton pins `app_root` at startup; creating `models/` post-start does not recover the running process.

### Probe B' — empty models/ present, FRESH start (PID 28224) [positive control]
```json
// POST /api/download/start
{ "status": "downloading", "bytes_downloaded": 0, "total_bytes": 0, "error_message": null }
// GET /api/download/progress
{ "status": "failed", "bytes_downloaded": 0, "total_bytes": 0, "error_message": "HTTP Error 404: Not Found" }
```
→ With `models/` present at startup, `app_root` resolves to the portable root, `version.json` is found, and the download proceeds PAST the manifest check (`status: downloading`). The subsequent `404` is a **downstream** issue (the GitHub release URL returns 404 in this sandboxed/offline environment) — it is NOT the reported bug. This cleanly separates the two states.

## 4. A vs B Comparison

| State | app_root resolved to | version.json found? | Result |
|---|---|---|---|
| A: models absent, fresh start | `D:\Scan2Text\backend\` (fallback) | No | `failed / "version.json not found"` |
| B: empty models added, no restart | `D:\Scan2Text\backend\` (pinned at startup) | No | `failed / "version.json not found"` |
| B': empty models present, fresh start | `D:\Scan2Text\` (portable root) | Yes | `downloading` → proceeds (404 downstream) |

The deciding variable is **whether `models/` exists at backend startup time** (which sets the pinned `app_root`).

## 5. Root Cause Classification

**`MODELS_ANCHOR_FAILS_WHEN_ABSENT`**

The portable-root resolution (`PathService._resolve_portable_root()`, path_service.py:95–108) anchors on the *presence* of a `models/` directory. When `models/` is absent — first-run before any download, or renamed (Delta QA 1.3) — no ancestor of `exe_dir` contains `models/`, so the documented fallback returns `exe_dir` = `D:\Scan2Text\backend\`. Because `version.json` lives at the portable root `D:\Scan2Text\version.json` (CEO-locked layout: `backend/` sits side-by-side with `Scan2Text.exe`; `version.json` at root), `app_root` resolves to the **wrong directory**. The manifest check `model_downloader_service.py:123` → `D:\Scan2Text\backend\version.json` → NOT FOUND → `status:"failed"`, `"version.json not found"`. The route returns HTTP 200 with that failed body (download.py:25), matching the reported symptom exactly.

A compounding factor (not the primary cause): `download.py:15` captures `app_root` into a module-level singleton at startup, so the failure persists for the process lifetime until restart even if `models/` later appears.

Why not `FALLBACK_WRONG_DIR`: the fallback returning `exe_dir` is by-design (documented safety net); it only triggers because the anchor (`models/`) is missing. The *root* trigger is the missing anchor, so `MODELS_ANCHOR_FAILS_WHEN_ABSENT` is the precise classification.

## 6. Recommended Remediation (design level — NOT implemented)

Anchor portable-root resolution on the **guaranteed** layout instead of the **optional** `models/` presence:

- CEO-locked layout guarantees `backend/` sits side-by-side with `Scan2Text.exe` in the root. Therefore `exe_dir.parent` is *always* the portable root (`D:\Scan2Text\`), deterministically, regardless of whether `models/` exists.
- Design fix: in frozen mode, resolve the portable root to `exe_dir.parent` (i.e. the parent of `backend/`) rather than walking up for a `models/` directory. This removes the fragile dependency on `models/` existing and eliminates the wrong-dir fallback entirely for the locked layout.
- Alternative/additional: make the manifest lookup tolerant of the `models/`-absent case, but the anchor change is cleaner and matches the locked layout contract.
- Note the singleton pinning (download.py:15): any `app_root` fix takes effect on next backend start (normal). No runtime reload needed.

**Do NOT implement in this slice.** Diagnosis only; remediation is design-level guidance for a follow-up slice.

## 7. Verification

- Anchor + fallback code lines documented (path_service.py:69, :95–108).
- Manifest check + error propagation documented (model_downloader_service.py:123–128).
- Singleton pinning documented (download.py:14–15).
- Raw JSON bodies from Probe A, Probe B, Probe B' captured above.
- Final folder state of `D:\Scan2Text`: `backend/`, `logs/`, `models_backup/`, `output/`, `settings/`, `Scan2Text.exe`, `struc.txt`, `version.json`. (`models/` returned to absent; `models_backup/` untouched.)
- No source files modified. No backend process left running.
