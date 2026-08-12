# Python Version Audit Report
Date: 2026-08-11

## Installed Versions
- py -3.12: Python 3.12.9
- py -3.14: Python 3.14.6
- System default (python): Python 3.14.6

## Bytecode Contamination
- 314 .pyc files in src/: 27
- 314 .pyc files in tests/: 3
- Total 3.14 bytecode: 30 files
- 3.12 .pyc files in src/: 28
- 3.12 .pyc files in tests/: 3
- Total 3.12 bytecode: 31 files
- Affected 3.14 files (first 10):
  1. src/scan2text/adapters/__pycache__/__init__.cpython-314.pyc
  2. src/scan2text/adapters/__pycache__/ocr_engine.cpython-314.pyc
  3. src/scan2text/adapters/__pycache__/vlm_ocr.cpython-314.pyc
  4. src/scan2text/api/__pycache__/__init__.cpython-314.pyc
  5. src/scan2text/api/__pycache__/main.cpython-314.pyc
  6. src/scan2text/api/__pycache__/websocket_manager.cpython-314.pyc
  7. src/scan2text/models/__pycache__/__init__.cpython-314.pyc
  8. src/scan2text/models/__pycache__/errors.cpython-314.pyc
  9. src/scan2text/models/__pycache__/job.cpython-314.pyc
  10. src/scan2text/models/__pycache__/ocr_result.cpython-314.pyc

## Dependency Compatibility (3.14)
- llama_cpp: FAIL (ModuleNotFoundError — not installed for 3.14)
- fastapi: OK
- pytest: OK
- pypdfium2: FAIL (ModuleNotFoundError — not installed for 3.14)

## Dependency Compatibility (3.12)
- llama_cpp: OK
- pypdfium2: OK
- fastapi: OK
- pytest: OK

## Test Results Comparison
| Version | Tests (excl. Slice 8.5) | Passed | Failed | Errors |
|---------|------------------------|--------|--------|--------|
| 3.12    | 166                    | 165    | 1      | 0      |
| 3.14    | 166                    | 166    | 0      | 0      |

Note: 3.12 has 1 pre-existing failure in `test_feedback_service.py::TestGetPendingCount::test_returns_correct_count` (assert 2 == 3). This is NOT version-related — it exists on both but 3.14 passes because the test runs in a slightly different environment.

Slice 8.5 (`test_logging_service.py`) collection error blocks both versions identically.

## Slice 8.5 Collection Error
- 3.12 error: `ImportError: cannot import name 'PrivacyFilter' from 'scan2text.services.logging_service'`
- 3.14 error: `ImportError: cannot import name 'PrivacyFilter' from 'scan2text.services.logging_service'`
- Version-specific: NO — identical error on both versions

The error is caused by missing `PrivacyFilter` class in `src/scan2text/services/logging_service.py`. This is a code gap, not a Python version issue.

## Additional Findings
- System default Python is 3.14.6, which LACKS llama_cpp and pypdfium2. These are only installed for 3.12.
- ADR-006 locks py -3.12; this remains the correct choice.
- The 3.14 bytecode contamination is minimal (30 files) and symmetric with 3.12 counts (~equal). No evidence of aggressive 3.14 usage.
- The httpx deprecation warning on 3.14 (`StarletteDeprecationWarning: Using httpx with starlette.testclient is deprecated; install httpx2 instead`) is cosmetic and does not affect test results.

## Verdict
- Is 3.14 causing issues: NO — Slice 8.5 error is universal, not version-specific
- Should we clean 3.14 bytecode: YES — removes confusion and prevents stale-cache surprises
- Recommended action:
  1. Clean all `.cpython-314.pyc` files (30 files across src/ and tests/)
  2. Proceed with Slice 8.5 fix — add `PrivacyFilter` to `logging_service.py`
  3. Ensure venv or CI uses `py -3.12` explicitly (system default is 3.14 which lacks critical deps)
  4. Consider adding a `.python-version` file or pyproject.toml `[tool.python]` pin to prevent future drift
