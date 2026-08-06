Unit tests: **53 passed, 0 failed, 0 errors**. Full suite: 66 passed, 3 pre-existing integration failures (unrelated to DRIFT A/B).

---

**FILES CHANGED:**

1. `src/scan2text/services/file_service.py` — Added `@staticmethod sanitize_filename()` with proper extension stripping, special char removal (`&`, `(`, `)`, etc.), whitespace→underscore, empty→"unknown"
2. `src/scan2text/services/path_service.py` — Added module-level `_default_instance = PathService()` so `conftest.py`'s `patch("scan2text.services.path_service._default_instance")` resolves

**DECISIONS:**

- **DRIFT A**: Tests expected `sanitize_filename` to strip extensions and remove `&`, `(`, `)` — `PathService.sanitize_filename` didn't match. Implemented canonical logic directly on FileService rather than delegating or rewriting the test.
- **DRIFT B**: Added `_default_instance` to path_service.py (Option 1 from spec) — minimal, preserves conftest fixture intent without touching tests.