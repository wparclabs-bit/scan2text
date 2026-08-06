> HISTORICAL: from quarantined Engineering-OS agent run. Canonical code = manual implementation + Slice-2.5 repair. Verify against src/ before trusting APIs here.
## Slice Summary

STATUS: PASS SLICE: Phase 2.2 - FileService + OutputService

### Files Changed

- `src/scan2text/models/service_results.py`: New Pydantic DTOs — `DiscoveryResult`, `DiscoveredFile`, `SkippedFile`, `OutputWriteResult`
- `src/scan2text/services/file_service.py`: New `FileService.discover()` — accepts paths, expands directories (non-recursive), classifies supported/unsupported files with typed skip records and reason codes (`UNSUPPORTED_FILE`, `MISSING_INPUT`, `INVALID_PATH`)
- `src/scan2text/services/output_service.py`: New `OutputService` — renders `OCRResult` dicts to UTF-8 Markdown, writes one `.md` per result using naming convention `scan_{source}_{HHmm}_{yyyyMMdd}.md`, deterministic collision resolution (`_2`, `_3`, ...), no merged output
- `tests/unit/services/test_file_service.py`: 10 tests covering case-insensitive extensions, unsupported skips, missing files, directory enumeration, count correctness
- `tests/unit/services/test_output_service.py`: 10 tests covering UTF-8 writing, Unix newlines, safe filenames, duplicate stem handling, empty results
- `pyproject.toml`: Added `[tool.pytest.ini_options] pythonpath = ["src"]` for module discovery
- `src/scan2text/__init__.py`, `src/scan2text/models/__init__.py`, `src/scan2text/services/__init__.py`, `tests/unit/__init__.py`, `tests/unit/services/__init__.py`: Module init files

### Test Results

- `python -m pytest tests/unit/services/test_file_service.py -q`: 10 passed
- `python -m pytest tests/unit/services/test_output_service.py -q`: 10 passed
- `python -m pytest tests/unit/services -q`: 20 passed

### Key Decisions / Assumptions

- **Directory scanning**: Non-recursive (docs don't specify recursive; FR-03 says "drag-and-drop" which implies flat)
- **Supported formats**: `.png`, `.jpg`, `.jpeg`, `.bmp`, `.tif`, `.tiff`, `.pdf` — case-insensitive (matches locked docs)
- **Output naming**: `scan_{source}_{HHmm}_{yyyyMMdd}.md` per FR-08
- **Collision resolution**: Appends `_2`, `_3`, etc. to base name before `.md` suffix
- **OCRResult contract**: Accepts dict with `job_id`, `source_file`, `pages` (list of `{page_number, text}`), `full_text`, `completed_at` — matches Phase 1 contracts
- **No new dependencies** beyond Pydantic (already in tech stack)
- **Slice 1 note**: Slice 1 files (`path_service.py`, `settings_service.py`) were not present on disk; created module structure from scratch

### Blockers

- None

### Next Slice

- Ready for Slice 3: QueueService
  
Tag
#ai-handoff #phase2
