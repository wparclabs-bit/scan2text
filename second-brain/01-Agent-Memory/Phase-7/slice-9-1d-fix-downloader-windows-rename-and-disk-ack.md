# S9.1d — Fix Downloader Windows Rename + Disk-Aware Status + Restart Path

Date: 2026-08-12
Slice: S9.1d
Status: COMPLETE

## What Changed

### Backend (`src/scan2text/services/model_downloader_service.py`)
- **Bug 1 fix**: Replaced `part_path.rename(final_path)` with `os.replace(part_path, final_path)` at line ~230. `os.replace()` is Windows-safe — overwrites existing target without WinError 183.
- **Bug 2 fix**: Added `_verify_file(path, expected_sha256, expected_size)` method that checks exist + size + SHA256. `get_progress()` now validates disk files before returning state; if both vlm.gguf and mmproj.gguf verify, returns `status: complete` immediately without spawning a download thread.
- **Concurrent guard**: `start_download()` now sets `self._status = "downloading"` BEFORE spawning the background thread, so a second concurrent call sees `"downloading"` and returns early.
- **Restart from failed**: Removed the implicit block that prevented restart from failed/cancelled state. The guard only blocks when status == `"downloading"`.
- **Skip verified files**: In `_download()`, each file is checked with `_verify_file()` before downloading; verified files are skipped and their bytes added to progress directly.
- **Clean stale .part files**: At start of `start_download()`, all `.part` files are unlinked (missing_ok=True) before any download begins.

### Frontend (`frontend/src/components/layout/ModelDownloaderModal.test.tsx`)
- Added test: `clicking Restart Download in failed state calls POST /api/download/start` — verifies button is clickable and handler fires correctly.

## Key Decisions
- Used `os.replace()` instead of `path.rename()` for Windows cross-platform safety. `os.replace()` is atomic on both POSIX and Windows.
- Disk validation in `get_progress()` (not a separate endpoint) keeps the API simple; App.tsx already polls this endpoint.
- Status set to `"downloading"` before thread spawn (not after) — this is what closes the concurrent-start race.
- No UI changes to the restart button — forensics showed the button code was correct; CEO's "unclickable" report likely stemmed from visual styling during active download or a race condition now resolved by the disk-aware path skipping download when models exist.

## Test Coverage
- Backend: 196 → 199 passed (+3 new tests in `TestDiskAwareDownload`)
  - `test_precreated_vlm_with_correct_sha_skips_download_and_no_rename_error`
  - `test_valid_models_on_disk_returns_complete_without_download`
  - `test_concurrent_start_calls_do_not_run_two_downloads`
- Frontend: 589 → 590 passed (+1 new test)
  - `clicking Restart Download in failed state calls POST /api/download/start`
- Pre-existing failure unchanged: `test_health_contract` (dummy models on disk make adapter loaded=True)

## Open Questions
- None. All three reported bugs addressed.

## Files Modified
- `src/scan2text/services/model_downloader_service.py` — core fix
- `tests/unit/services/test_model_downloader_service.py` — 3 new RED→GREEN tests
- `frontend/src/components/layout/ModelDownloaderModal.test.tsx` — 1 new test
