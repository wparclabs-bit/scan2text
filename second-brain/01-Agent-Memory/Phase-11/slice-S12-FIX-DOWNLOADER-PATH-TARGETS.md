# S12-FIX-DOWNLOADER-PATH-TARGETS

**Date:** 2026-08-20
**Slice:** S12 (Phase 11)
**Status:** COMPLETE

## Baseline
S11-DIAG-DOWNLOADER-SCHEMA identified 3 root causes. This slice fixes root cause #1: `ModelDownloaderService` uses `Path.cwd()` instead of `PathService.app_root`.

## Forensics
- **`model_downloader_service.py:L30`:** `self._app_root = app_root or Path.cwd()` — fallback to cwd when no app_root injected
- **`download.py:L14` (before fix):** `_download_svc = ModelDownloaderService()` — no app_root passed, defaults to cwd
- **`model_downloader_service.py:L21-24`:** `_MODEL_SPECS` already has fixed targets `("vlm", "vlm.gguf")`, `("mmproj", "mmproj.gguf")` — target names correct
- **`model_downloader_service.py:L151`:** `filename = key_prefix + ".gguf"` — derived from prefix, not URL extension

## RED
Added 4 tests to `tests/unit/services/test_model_downloader_service.py`:
1. **TestAppRootFallback:** version.json resolved from injected app_root even when cwd differs — PASS (correct behavior with injection)
2. **TestFixedTargetNames:** URLs ending in `.zip` still write to `vlm.gguf`/`mmproj.gguf` — PASS (already correct)
3. **TestLowercaseHashVerify:** SHA256 verify passes with lowercase expected hash — PASS (no case-sensitivity issue)
4. **TestDownloadRouterInjection:** download router singleton uses PathService.app_root — **FAIL** (proves composition bug: singleton uses cwd `D:\WingAI\Projects\scan2text` instead of PathService.app_root)

## GREEN
Minimal fix in `src/scan2text/routes/download.py`:
- Added import: `from scan2text.services.path_service import PathService`
- Changed: `_download_svc = ModelDownloaderService(app_root=PathService().app_root)`

## Results
- **16/16** downloader tests pass (12 existing + 4 new)
- Zero frontend/Rust edits
- Full suite deferred to GATE slice

## Commit
`530f6ea7b0c31cc26c296b2835ddf604eaa32ef2`
