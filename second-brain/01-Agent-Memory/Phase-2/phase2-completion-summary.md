# Phase 2 Completion Summary

## STATUS: PASS (77/77 tests green)

## Scope
Integration pipeline proof for scan2text Phase 2 — full batch processing from file discovery through OCR to Markdown output, with privacy-safe logging, continuation-on-failure, duplicate-stem handling, and BatchSummary correctness.

## Files Changed

**Created:**
- `tests/fakes/__init__.py` — re-exports SentinelOCR, FailingOCR
- `tests/fakes/ocr.py` — SentinelOCR (sentinel in output, not logs), FailingOCR (fails one filename, succeeds rest)
- `tests/integration/test_phase2_pipeline.py` — T1–T5 scenarios + OneToOneOutput

**Modified:**
- `src/scan2text/services/queue_service.py` — succeeded jobs now append to job_results; skipped files no longer duplicated in job_results
- `src/scan2text/adapters/ocr_engine.py` — added optional `name` parameter to process_image()
- `tests/unit/services/test_queue_service.py` — inline classes updated to accept `name`

## Decisions
- FailingOCR uses the `name` keyword argument passed by queue_service instead of an instance variable (`_current_name`).
- Skipped files are tracked exclusively in `skipped_files`; they do not appear in `job_results`. This makes `len(job_results) == accepted` hold.
- `job_results` contains only accepted-job entries (succeeded + failed).
- The `name` parameter on `process_image()` is optional with default `None`, preserving backward compatibility for subclasses that don't use it.

## Deviations
- **Bug found and fixed:** `QueueService._process_one_job` incremented `summary.succeeded` but did NOT append to `summary.job_results`. Result: `len(job_results)` was less than `accepted` when all jobs succeeded. Fixed by adding the missing append.
- **Bug found and fixed:** `FailingOCR` referenced `self._current_name` which was never set, causing all calls to fail silently. Fixed by using the `name` parameter directly.
- **Minor ABI change:** `OCREngine.process_image()` signature changed from `(image_bytes)` to `(image_bytes, name=None)`. All existing implementations updated.

## Test Evidence
```
77 passed in 0.44s
```

## Guardrail Verification
| Guardrail | Status |
|---|---|
| Local-first (no network) | YES |
| No new dependencies | YES |
| One input → one output | YES |
| Skip unsupported files | YES |
| Continue on failure | YES |
| Privacy-safe logs (sentinel not logged) | YES |
| OCR isolation via OCREngine ABC | YES |
| Tests use tmp_path only, no .scan2text/ writes | YES |

## Risks
- The `name` parameter addition to `process_image()` is a minor ABI change; any third-party or future subclasses must accept it (optional with default).
- FailingOCR's `_fail_once` flag is stateful across calls — works for single-fail scenarios but would need reset for repeated test runs in the same process.

## Phase 3 Entry Point
Phase 3 — PDF multi-page processing, settings persistence, and CLI interface. Key entry points:
1. Extend `FailingOCR` / `SentinelOCR` to handle multi-page PDFs correctly.
2. Add settings service integration tests (settings file read/write).
3. Build out CLI argument parsing and batch directory scanning.

```json
{"project":"scan2text","slice":4,"status":"pass","unit_tests":61,"integration_tests":16,"total_tests":77,"files_changed":["tests/fakes/__init__.py","tests/fakes/ocr.py","tests/integration/test_phase2_pipeline.py","src/scan2text/services/queue_service.py","src/scan2text/adapters/ocr_engine.py","tests/unit/services/test_queue_service.py"],"guardrails":{"local-first":"YES","no-new-deps":"YES","one-input-one-output":"YES","skip-unsupported":"YES","continue-on-failure":"YES","privacy-logs":"YES","ocr-isolation":"YES","no-scan2text-writes":"YES"},"next":"phase3"}