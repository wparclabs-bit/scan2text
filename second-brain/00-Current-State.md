# Scan2Text Current State

<!-- MAINTENANCE PROTOCOL: Keep only the Baseline block + last 5 changelog entries here. When you add a new entry, move the oldest entry to second-brain/01-Agent-Memory/Archive/state-history.md. This protects the 45k token cap (AGENTS.md 3.2). -->

## Baseline
- Phase: S32-FIX-FEEDBACK-API-TESTS (COMPLETE)
- Date: 2026-08-23
- Status: ALL S31 SOURCE BUGS FIXED. S31 "bug #1" (path_service.py:71 `parent.parent`) DEBUNKED in S32a — line 71 is CORRECT as-is. Frozen regression 14/14 proves `parent.parent` = portable root. S32-FIX-FEEDBACK-DIR forensics independently confirmed `feedback_dir` resolves to portable root. All other S31 bugs (missing `get_paths()` accessor, missing `ensure_dirs()` alias, wrong model filename, feedback_service.py base_dir) resolved in S32a/S32b/S32-FIX-FEEDBACK-DIR.
- **⚠️ WARNING: DO NOT apply parent.parent→parent change to path_service.py:71 — line 71 is CORRECT for the locked portable layout.**
- Tauri shell: STALE on disk (8.54MB, timestamp 2026-08-21 15:30:23) — not rebuilt this slice (NON-GOAL)
- Backend hash: freshly rebuilt with PyInstaller — deployed to D:\Scan2Text\backend\scan2text-backend.exe (43.51MB / 45,591,824 bytes)
- UPX: NOT installed on build machine — upx=False
- pdfium.dll: present in portable dist (_internal/pypdfium2_raw/pdfium.dll, 6.88MB)
- _internal: 707+ files, all DLLs present (python312.dll, llama.dll, pdfium.dll, 4 VC++ runtime DLLs)
- Backend tests: **350 passed, 0 failures**. Full gate GREEN. Peak RAM 1472 MB.
- Frontend tests: 666 passed, 0 failed. Full suite GREEN. Typecheck clean.
- Rust check: cargo check passed (dev profile compiled in 1.95s)
- version.json: deployed to D:\Scan2Text\version.json with CEO-verified hashes (vlm_sha256=9facc171..., mmproj_sha256=d63a90a1...)
- PRD: v1.12 source of truth in second-brain/04-Product/
- RESULT: All gates GREEN. Backend rebuilt and deployed to portable root.

## Recent Changelog
- **2026-08-23 (S32-FIX-FEEDBACK-API-TESTS):** FIX — **`tests/test_api_feedback.py`: aligned 3 feedback API tests with locked-correct `feedback_dir` behavior.** The S32-FIX-FEEDBACK-DIR change switched FeedbackService from `base_dir/feedback` to `feedback_dir` property. Tests still mocked PathService with only `base_dir` set, so `feedback_dir` was an auto-MagicMock causing assert 0==2 and file-not-moved failures. Also fixed a pre-existing import-deadlock that caused `test_post_feedback_creates_file` to hang 120s: moved PathService patch into the `app` fixture (before importing main) and set both `base_dir=tmp_path` and `feedback_dir=tmp_path/feedback`. All 3 API tests + all 11 feedback tests pass. Full suite: 350 passed, peak RAM 1472 MB. Commit: `efe6644`.
- **2026-08-23 (S32-FIX-FEEDBACK-DIR):** FIX — **`feedback_service.py:24-26`: changed `base_dir` → `feedback_dir` so offline feedback writes to portable-root `feedback/` instead of `backend/feedback/`.** TDD RED→GREEN: 3 new focused tests (TestFeedbackDirNotBaseDir ×3) confirm `_ensure_feedback_dirs`, `save_pending_feedback`, and `move_pending_to_sent` all use `feedback_dir`. All 11 feedback tests pass. py_compile clean. Commit: `77804d7`.
- **2026-08-23 (S32b-ENGINE-MODELNAME-WEBVIEW-REMOVAL):** FIX — **`engine.py`: removed `import webview`, deleted `headless=False` pywebview branch, simplified `launch_app()` to headless-only (dropped `headless` param), pinned model filename `ovisocr2-q8.gguf`→`vlm.gguf`.** 3 targeted tests added (`test_engine_webview_removal.py`): filename pin GREEN, webview-absence GREEN, import test RED by pre-existing `save_markdown` missing from `output_service.py` (out of scope). py_compile clean. Commit: `332cec8`.
- **2026-08-23 (S32a-FIX-PATHSERVICE-API):** FIX — **`get_paths()` accessor + `ensure_dirs` alias added to path_service.py.** TDD RED→GREEN: 4 new tests (TestGetPathsAccessor ×2, TestEnsureDirsAlias ×2) confirm `get_paths()` returns the `_default_instance` singleton and `ensure_dirs` is an alias of `PathService.ensure_runtime_dirs`. Frozen regression: 14/14 pass. Line 71 `parent.parent` confirmed correct for locked portable layout — NOT touched (misdiagnosis per diag-S31). Commit: `af917dc`.
- **2026-08-23 (S31-RECON-PROBE):** DIAG — **RECONCILED: 5 independent bugs identified, fixes deployed across S32a/S32b/S32-FIX-FEEDBACK-DIR.** (1) `path_service.py:71` S24 `parent.parent`→`parent` math error — DEBUNKED: line 71 is CORRECT, `parent.parent` = portable root for locked layout. (2) Missing `get_paths()` accessor — FIXED in S32a. (3) Missing `ensure_dirs()` alias — FIXED in S32a. (4) `engine.py:57` references `ovisocr2-q8.gguf` but disk has `vlm.gguf` — FIXED in S32b. (5) `feedback_service.py:24` uses `base_dir` (=backend/) instead of `feedback_dir` — FIXED in S32-FIX-FEEDBACK-DIR. Full report: `second-brain/01-Agent-Memory/Phase-11/diag-S31-RECON-PROBE.md`.
