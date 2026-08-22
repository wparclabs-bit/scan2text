# S30-DIAG-MODELS-PATH-SPLIT

**Date:** 2026-08-23
**Status:** DIAG COMPLETE — root cause identified, fix design ready
**Parent slices:** S22 (models anchor fails), S24 (app_root fixed — incorrectly), S28 (zip extraction)

---

## Disk Truth

| Path | Exists | Notes |
|---|---|---|
| `D:\Scan2Text\Scan2Text.exe` | 8.97 MB | Tauri shell, timestamp 8/21 15:30 |
| `D:\Scan2Text\backend\scan2text-backend.exe` | 45.59 MB | PyInstaller artifact, timestamp 8/21 17:36 |
| `D:\Scan2Text\models\vlm.gguf` | 811,843,498 B | GGUF magic `47 47 55 46` ✓ |
| `D:\Scan2Text\models\mmproj.gguf` | 204,987,079 B | GGUF magic `47 47 55 46` ✓ |
| `D:\Scan2Text\settings\settings.json` | exists | model_path="", mmproj_path="" |
| `D:\Scan2Text\logs\` | empty dir | NO app.log |
| `D:\Scan2Text\backend\logs\` | 4 files | backend-boot.log1-4.txt (rotation) |
| `D:\Scan2Text\backend\feedback\` | pending/ sent/ | Active feedback queue |
| `D:\Scan2Text\feedback\` | DOES NOT EXIST | — |

**App.log:** Not found at either `D:\Scan2Text\logs\app.log` or `D:\Scan2Text\backend\logs\app.log`. Backend uses `backend-boot.log*.txt` naming (Rust-side logging), Python logs go to `log_file` property path which lands in `backend/logs/` per observed behavior.

**Model files:** Both genuine GGUF (not ZIP). CEO-verified sizes match version.json.

---

## Consumer-to-Resolver Map

### path_service.py resolvers

| Resolver | File:Line | Frozen behavior | Returns (live) |
|---|---|---|---|
| `_resolve_base_dir()` | `path_service.py:52` | `Path(sys.executable).parent` | `D:\Scan2Text\backend` |
| `_resolve_app_root()` | `path_service.py:64` | `Path(sys.executable).parent.parent` | **`D:\`** ← BUG |
| `_resolve_portable_root()` | `path_service.py:97` | Walks exe_dir, parent, parent.parent for models/; fallback exe_dir | `D:\Scan2Text` ✓ |
| `_resolve_models_dir()` | `path_service.py:138` | Priority: env → grandparent(models/) → parent(models/) → exe_dir(models/) → exe_dir | `D:\Scan2Text` ✓ |

### Consumer mapping

| Consumer | File:Line | Resolver called | Pinned? | Resolved path (live) | Correct? |
|---|---|---|---|---|---|
| **OCREngine (VlmOcrAdapter)** | `vlm_ocr.py:170` | `PathService()` auto → `models_dir` prop → `_resolve_models_dir()` | No (new instance per init) | `D:\Scan2Text\models` ✓ | Source says models exist → should work. **But running binary logs "Model files not found"** — binary has diverged code (see Note 1). |
| **engine.py boot check** | `engine.py:57-58` | `paths.models_dir` (via `get_paths()`) | No (startup-time) | `D:\Scan2Text\models` ✓ (source) | Source says "Model not found" warning at line 60 checks `ovisocr2-q8.gguf` (wrong name — should be `vlm.gguf`). Note: `get_paths()` does not exist in source. |
| **ModelDownloaderService** | `download.py:15` | `PathService().app_root` at module level | **YES — pinned at import** | `D:\models` (broken app_root) | Download target = `D:\models\` ← WRONG |
| **FeedbackService** | `feedback_service.py:24` | `self._paths.base_dir` (NOT `feedback_dir` prop) | No (new instance per call) | `D:\Scan2Text\backend\feedback` | Uses `base_dir` not `feedback_dir` prop ← WRONG |
| **LoggingService** | `logging_service.py:127` | `get_paths().log_file` → `logs_dir` prop → `_resolve_portable_root()` | No | `D:\Scan2Text\logs\app.log` (source) | Source resolves correctly. Running binary logs to `backend/logs/` — binary has different code. |
| **SettingsService** | `settings_service.py:37` | `PathService()` auto → `settings_path` prop → `_resolve_portable_root()` | No | `D:\Scan2Text\settings\settings.json` ✓ (source) | Source resolves correctly. |

**Note 1 — Source/Binary divergence:** The deployed backend binary was built from source that included `get_paths()` and `exe_root` in path_service.py. These symbols do NOT exist in the current working tree or at HEAD. The import `from scan2text.services.path_service import get_paths` in engine.py would raise `ImportError` against current source. The running binary therefore executes a different code path than what the source shows. This divergence must be resolved before any fix can be validated.

---

## Pinning Evidence

| Consumer | Pinning mechanism | Impact |
|---|---|---|
| `ModelDownloaderService` | Module-level `_download_svc = ModelDownloaderService(app_root=PathService().app_root)` at `download.py:15` | app_root frozen to value at first import. If download starts before models land, `app_root` is wrong and downloads go to `D:\models\`. |
| `_ocr_engine` | Module-level `None` sentinel, set once in `create_app()` at `engine.py:34` | OCREngine instantiated once at boot. If models absent at boot, `_loaded=False` and stays False until restart. |
| `_default_instance` | Module-level `_default_instance = PathService()` at `path_service.py:300` | Tests patch this; production doesn't use it directly. |

---

## Root Cause

**One sentence:** S24's fix made `_resolve_app_root()` return `exe_dir.parent.parent` (`D:\`) instead of `exe_dir.parent` (`D:\Scan2Text`), creating a permanent split between `_resolve_app_root()` (wrong, goes to drive root) and `_resolve_portable_root()` (correct, finds `models/` at `exe_dir.parent`), while `FeedbackService` bypasses both by using `base_dir` directly.

**Detailed mechanism:**
1. `sys.executable` = `D:\Scan2Text\backend\scan2text-backend.exe`
2. `_resolve_app_root()` computes `exe_dir.parent.parent` = `D:\Scan2Text.parent` = `D:\` (WRONG)
3. `_resolve_portable_root()` walks `[exe_dir, exe_dir.parent, exe_dir.parent.parent]` looking for `models/`, finds it at `exe_dir.parent` = `D:\Scan2Text` (CORRECT)
4. `_resolve_models_dir()` also finds `models/` at `exe_dir.parent.parent` = `D:\Scan2Text` (CORRECT by accident — same as portable root)
5. `FeedbackService._ensure_feedback_dirs()` uses `self._paths.base_dir` = `exe_dir` = `D:\Scan2Text\backend` → feedback lands in `backend/feedback/`
6. `ModelDownloaderService` is pinned at import with broken `app_root` → download target is `D:\models\`

---

## Fix Design (NO CODE — design only)

### Option A: Make `_resolve_app_root()` deterministic (recommended)

Change `path_service.py:71` from:
```python
return Path(sys.executable).parent.parent
```
to:
```python
return Path(sys.executable).parent
```

This makes `app_root` = `D:\Scan2Text` (the actual portable root), matching `_resolve_portable_root()`.

**Files to change:**
- `src/scan2text/services/path_service.py:71` — one-line fix

**Pinning to invalidate:**
- `download.py:15` module-level `_download_svc` — must be recreated after any path change (restart backend)
- `engine.py:34` `_ocr_engine` — recreated on each `create_app()` call (normal restart)

**Consumers that benefit:**
- `settings_path` → `D:\Scan2Text\settings\settings.json` ✓
- `assets_dir` → `D:\Scan2Text\assets` ✓
- `models_dir` (when app_root injected) → `D:\Scan2Text\models` ✓
- `ModelDownloaderService` pinned app_root → `D:\Scan2Text` ✓

**Consumers that STILL need fixing:**
- `FeedbackService.feedback_service.py:24` — uses `base_dir` not `feedback_dir` prop. Must change to `self._paths.feedback_dir`.
- `engine.py:57` — checks for `ovisocr2-q8.gguf` instead of `vlm.gguf` (wrong model name). Also references non-existent `get_paths()` and `exe_root`.

### Option B: Re-route every consumer through `_resolve_app_root()`

Keep `_resolve_app_root()` as-is and change all consumers that currently use `_resolve_portable_root()` or `base_dir` to use `app_root` instead. This is larger blast radius and masks the underlying math error.

**Not recommended** — Option A fixes the root math error.

### Complete file:line change list (Option A + feedback fix)

| File | Line | Change |
|---|---|---|
| `src/scan2text/services/path_service.py` | 71 | `parent.parent` → `parent` |
| `src/scan2text/services/feedback_service.py` | 24-26 | Use `self._paths.feedback_dir` instead of `base / "feedback"` |
| `src/scan2text/engine.py` | 49-53 | Replace `get_paths()` / `exe_root` with valid PathService calls; fix model name from `ovisocr2-q8.gguf` to `vlm.gguf` |
| `src/scan2text/services/path_service.py` | add | Add `get_paths()` function and `exe_root` property (or refactor engine.py to not need them) |

### Pre-start validation (post-fix)

After rebuild, before marking complete:
1. Verify `_resolve_app_root()` returns `D:\Scan2Text` not `D:\`
2. Verify `PathService().app_root == PathService().app_root` (consistent)
3. Verify `PathService().feedback_dir` resolves to portable root
4. Verify no module-level `PathService()` pinning survives restart with wrong paths
5. Run full backend test suite

---

## Verification Checklist

- [x] Disk truth table captured
- [x] App.log location identified (backend-boot.log*.txt in backend/logs/)
- [x] Consumer-to-resolver map with file:line produced
- [x] Pinning evidence documented
- [x] One-sentence root cause stated
- [x] Complete fix design with file:line list
- [ ] Source/binary divergence resolved (get_paths/exe_root missing from source)
- [ ] Fix implemented and tested (out of scope for this diag slice)
- [ ] git status clean

---

## Context

- S22 diagnosed `MODELS_ANCHOR_FAILS_WHEN_ABSENT`: `_resolve_portable_root()` fallback to exe_dir when no models/ ancestor
- S24 "fixed" by hardcoding `exe_dir.parent.parent` but this is mathematically wrong for the locked layout where `backend/` is a subdirectory of the portable root
- S28 added zip extraction to downloader
- Locked layout: `Scan2Text.exe` and `backend/` are siblings at portable root; `sys.executable` points into `backend/`
