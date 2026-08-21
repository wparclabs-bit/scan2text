# Scan2Text Current State

<!-- MAINTENANCE PROTOCOL: Keep only the Baseline block + last 5 changelog entries here. When you add a new entry, move the oldest entry to second-brain/01-Agent-Memory/Archive/state-history.md. This protects the 45k token cap (AGENTS.md 3.2). -->

## Baseline
- Phase: S37-GATE-REBUILD-VERIFY (COMPLETE)
- Date: 2026-08-24
- Status: Backend rebuild with S36 logging fixes deployed. PyInstaller spec unmodified (`packaging/scan2text-backend.spec`). New exe deployed to D:\Scan2Text\backend\scan2text-backend.exe (45,594,717 bytes, timestamp 2026-08-22 00:36:18). Boot proof: D:\Scan2Text\logs\app.log created and populated with startup entries. Zero source edits.
- **⚠️ WARNING: DO NOT apply parent.parent→parent change to path_service.py:71 — line 71 is CORRECT for the locked portable layout.**
- Tauri shell: STALE on disk (8.54MB, timestamp 2026-08-21 15:30:23) — not rebuilt this slice (NON-GOAL)
- Backend exe: freshly rebuilt with PyInstaller — deployed to D:\Scan2Text\backend\scan2text-backend.exe (45,594,717 bytes, timestamp 2026-08-22 00:36:18)
- UPX: NOT installed on build machine — upx=False
- pdfium.dll: present in portable dist (_internal/pypdfium2_raw/pdfium.dll)
- _internal: 707+ files, all DLLs present (python312.dll, llama.dll at _internal/llama_cpp/lib/, pdfium.dll, 4 VC++ runtime DLLs)
- Backend tests: **352 passed, 0 failures**. Full gate GREEN. Peak RAM 1472 MB.
- Frontend tests: 666 passed, 0 failed. Full suite GREEN. Typecheck clean.
- Rust check: cargo check passed (dev profile compiled in 1.95s)
- version.json: deployed to D:\Scan2Text\version.json with CEO-verified hashes (vlm_sha256=9facc171..., mmproj_sha256=d63a90a1...)
- PRD: v1.12 source of truth in second-brain/04-Product/
- RESULT: All gates GREEN. Backend rebuilt with S36 fixes, deployed, boot-proven via app.log.

## Recent Changelog
- **2026-08-23 (S33b-REBUILD-DEPLOY):** BUILD — **Rebuilt PyInstaller artifact from current source, deployed to D:\Scan2Text\backend\, smoke-tested.** Preflight: no Scan2Text.exe or scan2text-backend.exe process running. Test gate: 350 passed, 0 failed. Spec discovered at `packaging/scan2text-backend.spec`, rebuilt unmodified via `py -3.12 -m PyInstaller packaging/scan2text-backend.spec --noconfirm`. Dist artifact is folder-based with _internal containing pypdfium2_raw/pdfium.dll, python312.dll, llama_cpp/lib/llama.dll. Deployed by removing old _internal and exe only, copying fresh dist artifact. Smoke test: process started hidden (PID 9972), port 47351 bound within seconds, /api/health returned 200 OK (status=ok, worker=idle, version=0.1.0). Process exited cleanly after health check. Feedback migration: root `D:\Scan2Text\feedback\pending` and `\sent` dirs ensured; backend\feedback\ was empty, zero files moved. Zero source edits. Commit: docs only.
- **2026-08-23 (S32-FIX-FEEDBACK-API-TESTS):** FIX — **`tests/test_api_feedback.py`: aligned 3 feedback API tests with locked-correct `feedback_dir` behavior.** The S32-FIX-FEEDBACK-DIR change switched FeedbackService from `base_dir/feedback` to `feedback_dir` property. Tests still mocked PathService with only `base_dir` set, so `feedback_dir` was an auto-MagicMock causing assert 0==2 and file-not-moved failures. Also fixed a pre-existing import-deadlock that caused `test_post_feedback_creates_file` to hang 120s: moved PathService patch into the `app` fixture (before importing main) and set both `base_dir=tmp_path` and `feedback_dir=tmp_path/feedback`. All 3 API tests + all 11 feedback tests pass. Full suite: 350 passed, peak RAM 1472 MB. Commit: `efe6644`.
- **2026-08-23 (S32-FIX-FEEDBACK-DIR):** FIX — **`feedback_service.py:24-26`: changed `base_dir` → `feedback_dir` so offline feedback writes to portable-root `feedback/` instead of `backend/feedback/`.** TDD RED→GREEN: 3 new focused tests (TestFeedbackDirNotBaseDir ×3) confirm `_ensure_feedback_dirs`, `save_pending_feedback`, and `move_pending_to_sent` all use `feedback_dir`. All 11 feedback tests pass. py_compile clean. Commit: `77804d7`.
- **2026-08-23 (S32b-ENGINE-MODELNAME-WEBVIEW-REMOVAL):** FIX — **`engine.py`: removed `import webview`, deleted `headless=False` pywebview branch, simplified `launch_app()` to headless-only (dropped `headless` param), pinned model filename `ovisocr2-q8.gguf`→`vlm.gguf`.** 3 targeted tests added (`test_engine_webview_removal.py`): filename pin GREEN, webview-absence GREEN, import test RED by pre-existing `save_markdown` missing from `output_service.py` (out of scope). py_compile clean. Commit: `332cec8`.
- **2026-08-23 (S32a-FIX-PATHSERVICE-API):** FIX — **`get_paths()` accessor + `ensure_dirs` alias added to path_service.py.** TDD RED→GREEN: 4 new tests (TestGetPathsAccessor ×2, TestEnsureDirsAlias ×2) confirm `get_paths()` returns the `_default_instance` singleton and `ensure_dirs` is an alias of `PathService.ensure_runtime_dirs`. Frozen regression: 14/14 pass. Line 71 `parent.parent` confirmed correct for locked portable layout — NOT touched (misdiagnosis per diag-S31). Commit: `af917dc`.
