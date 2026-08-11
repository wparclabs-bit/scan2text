# Slice 8.5 — PrivacyFilter Implementation

Date: 2026-08-11
Phase: Phase 7 (Real Backend)
Parent ADR: ADR-007 Decision 5

## What Changed

- `src/scan2text/services/logging_service.py`: Added `PrivacyFilter` class (subclass of `logging.Filter`) that strips file paths and long text blocks from log records. Added `StructuredFormatter` class for JSON structured OCR event logs. Wired both into `setup_logging()` with RotatingFileHandler at 1 MB / backupCount 1. Default formatter changed to StructuredFormatter.
- `tests/unit/services/test_logging_service.py`: Added missing `import logging`. Fixed `pytest.approx` function reference to literal timestamp string. Fixed `"%"` format trick to direct `logger.info(json.dumps(...))`.

## Key Decisions

1. **PrivacyFilter threshold**: String args >40 chars replaced with `[REDACTED]`; file extensions (.pdf/.jpg/.jpeg/.png/.webp/.md/.txt) and Windows paths replaced with `[FILE_REDACTED]`; text blocks >200 chars truncated to 100 chars + `...[REDACTED]`.
2. **StructuredFormatter as default**: All handlers use StructuredFormatter so log files contain pure JSON for OCR events while falling back to standard format for plain messages.
3. **Handler cleanup**: `root.handlers.clear()` in setup_logging prevents handler accumulation across test runs.
4. **log_ocr_event attached to logger**: Bound method attached to root logger instance so tests can call `logger.log_ocr_event(...)`.

## Test Coverage

- `TestPrivacyFilter::test_no_filenames_in_logs` — single filename redacted
- `TestPrivacyFilter::test_no_content_in_logs` — long arg string redacted
- `TestPrivacyFilter::test_multiple_filenames_redacted` — multiple filenames all redacted
- `TestRotationConfig::test_rotation_config` — maxBytes=1MB, backupCount=1
- `TestStructuredFormatter::test_structured_ocr_event` — JSON output with allowed fields
- `TestLogOcrEvent::test_log_ocr_event_success` — successful event logs structured JSON
- `TestLogOcrEvent::test_log_ocr_event_with_error` — error event logs error_code
- `TestNoContentLeakage::test_ocr_result_not_in_logs` — sensitive text never in logs

Backend total: 174 passed (only pre-existing `test_feedback_service.py::test_returns_correct_count` fails with 2==3).

## Open Questions

- None. Slice 8.5 complete. Next: slice 8.6 (model downloader) and 8.7 (release cadence).
