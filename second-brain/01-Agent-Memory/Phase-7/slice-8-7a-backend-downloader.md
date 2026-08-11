# Slice 8.7a — Backend Model Downloader (Streaming + Hash Verification)

Date: 2026-08-11
Phase: Phase 7
Status: COMPLETE

## What Changed

### New files
- `src/scan2text/services/model_downloader_service.py` — `ModelDownloaderService` singleton
- `src/scan2text/routes/download.py` — 3 REST endpoints
- `tests/unit/services/test_model_downloader_service.py` — 6 unit tests
- `tests/test_api_download.py` — 6 API integration tests

### Modified files
- `src/scan2text/api/main.py` — imported and registered `download_routes.router`

## Key Decisions

1. **Singleton pattern**: `_download_svc` module-level instance in `download.py` routes. Tests patch `scan2text.routes.download._download_svc` directly (not the class constructor) because the singleton is created at import time.

2. **Stdlib only**: Uses `urllib.request.urlopen` — no new dependencies per CEO decision.

3. **Atomic rename**: Download writes to `{model_version}.part`, computes SHA256, then renames to `{model_version}.gguf` only on hash match. On failure or cancellation, `.part` is deleted.

4. **Cancellation via threading.Event**: The background thread checks `self._cancel_event.is_set()` between chunks and after the hash verification phase.

5. **Content-Length fallback**: Uses `resp.getheader("Content-Length")` with fallback to `model_size_bytes` from `version.json`.

6. **Error handling**: Missing `version.json`, hash mismatch, and network errors all set `status="failed"` with an `error_message` — no silent failures.

## Test Coverage

| Test | File | Status |
|------|------|--------|
| `test_reads_version_json_and_sets_downloading_status` | test_model_downloader_service.py | PASS |
| `test_successful_download_creates_part_then_renames` | test_model_downloader_service.py | PASS |
| `test_cancellation_deletes_part_file` | test_model_downloader_service.py | PASS |
| `test_hash_mismatch_deletes_part_and_sets_failed` | test_model_downloader_service.py | PASS |
| `test_initial_state` | test_model_downloader_service.py | PASS |
| `test_state_updates_during_download` | test_model_downloader_service.py | PASS |
| `test_post_download_start_triggers_service` | test_api_download.py | PASS |
| `test_post_download_start_returns_failed_status_when_no_version_json` | test_api_download.py | PASS |
| `test_get_download_progress_returns_state` | test_api_download.py | PASS |
| `test_get_download_progress_defaults_when_idle` | test_api_download.py | PASS |
| `test_post_download_cancel_triggers_cancellation` | test_api_download.py | PASS |
| `test_post_download_cancel_when_idle_returns_ok` | test_api_download.py | PASS |

**Total backend tests: 186 (was 174, +12)**

## Open Questions

- None. Frontend UI deferred to Slice 8.7b.
