**STATUS: PASS — 0 failed, 0 errors (was 3 failed, 66 passed)**

**FILES CHANGED:**

- `tests/integration/test_output_generation.py` — Added `mock_paths.resolve_output_path.return_value = tmp_scan2text / "output.md"` so `OutputService.write()` returns a real Path instead of MagicMock
- `tests/integration/test_pdf_handling.py` — Imported `OCRPage` and replaced `[MagicMock(page_number=1, text="hello")]` with `[OCRPage(page_number=1, text="hello")]` for Pydantic v2 compatibility
- `tests/integration/test_queue_service.py` — Added `file_path="/data/<name>"` to each `OCRJob()` call in `test_skipped_file_does_not_block_others` since `file_path` is now required

**DECISIONS:**

- Used `tmp_scan2text` fixture for real paths in test_output_generation (consistent with existing fixture usage)
- No implementation files modified — all fixes are purely test-fixture adjustments