# Scan2Text Current State

<!-- MAINTENANCE PROTOCOL: Keep only the Baseline block + last 5 changelog entries here. When you add a new entry, move the oldest entry to second-brain/01-Agent-Memory/Archive/state-history.md. This protects the 45k token cap (AGENTS.md 3.2). -->

## Baseline
- Phase: Phase 10 (E2E Packaged Verification) — Phase 10 closure sprint
- Date: 2026-08-17
- Tauri shell hash: 61B4939F…
- Backend tests: 262 passed, 1 pre-existing failure (test_health_contract — model loaded=True vs expected False)
- Backend exe hash: A9C7BF5F…
- Frontend tests: 634 green overall, 0 failures
- Rust tests: 0 passed in debug (release-only tests gated). Build clean (0 warnings)
- PRD: v1.12 source of truth in second-brain/04-Product/
- Next: S11-FIX33-SettingsDialog-Functional

## Recent Changelog (last 5)
- **2026-08-17 (S11-DOC-Targeted-Test-Rule):** Added targeted test execution rule to AGENTS.md 3.6 — during RED/GREEN phases only run the target test file, never the full suite, to prevent context window bloat from 639-test output. No code changes.
- **2026-08-17 (S11-FIX35-ProseCompact):** Fixed BUG-35 preview bloat — replaced redundant `prose-sm prose-base` dual with `prose-base prose-compact` in MarkdownPreview; added `.prose-compact` CSS override (`line-height: 1.4`, `p { margin: 0.25em }`) in index.css. +1 test. Frontend: 634 passed, 0 failures. Typecheck clean. Build success. Status: READY FOR CEO MANUAL VERIFICATION.
- **2026-08-17 (S11-FIX32-Rebuild-And-Swap):** Rebuilt backend (PyInstaller exit 0, hash A9C7BF5F…) and Tauri shell (--no-bundle exit 0, hash 61B4939F…). Swapped into D:\Scan2Text portable + repo dist. Three-way hash match confirmed. Boot gate PASS: Uvicorn on 127.0.0.1:47351, zero ModuleNotFoundError, zero Model files not found. No source changes. Status: READY FOR CEO MANUAL VERIFICATION.
- **2026-08-17 (S11-FIX31-Downloader-DeadButton-GracefulError):** Fixed ModelDownloaderModal dead-button bug — button now always rendered in idle/failed/cancelled states (was conditionally hidden in idle). Fetch rejections now set failed state with translated network error instead of silent log. Raw `error_message` rendered via `getErrorMessage()` mapper producing translated strings for network/size-mismatch/disk-full/user-cancelled; generic fallback wraps unknown messages. `formatBytes(0)` replaced with `t('downloader.progressUnknown')` so "0 B of 0 B" never appears when expected size is unknown. +3 tests. Frontend: 633 passed, 0 failures. Typecheck clean. Build success. Status: READY FOR FIX32 REBUILD.
- **2026-08-17 (S11-FIX30-Settings-PortableRoot):** Refactored `_resolve_output_dir()` to delegate to shared `_resolve_portable_root()` — eliminates duplicate walk-up logic. `settings_path`, `logs_dir`, `feedback_dir` already used portable root from S11-FIX28b; this unifies the resolver so output_dir also calls through `_resolve_portable_root()`. Dev behavior unchanged. Backend: 262 passed, 1 pre-existing failure. Status: READY FOR FIX32 REBUILD.
- **2026-08-17 (S11-FIX29b-Tauri-DragDrop-V2-Key):** Committed fix — replaced v1 `fileDropEnabled` with correct Tauri v2 key `dragDropEnabled` in `tauri.conf.json` + validator assertion #8 (confirmed via `config.schema.json`). Tauri v2 intercepts OS file drops by default (`dragDropEnabled=true`), blocking HTML5 onDrop in packaged exe; `false` passes drops through to DOM. Validator 8/8 PASS. Frontend: 633 passed, 0 failures. Typecheck clean. Build success. Status: READY FOR FIX32 REBUILD.

For older history see second-brain/01-Agent-Memory/Archive/state-history.md
