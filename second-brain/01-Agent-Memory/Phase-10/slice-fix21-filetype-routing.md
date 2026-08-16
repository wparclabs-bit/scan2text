# Slice S10-FIX21 — FileType Routing Fix

## What Changed
- **Root cause**: Packaged backend routed files by display-name substring matching ("pdf" in filename) instead of real file type. A real PDF named `chat.pdf` hit PIL's `Image.open()` → "cannot identify image file". A PNG named "sample secure pdf.png" hit the PDF renderer → hang.
- **Fix**: Extracted `detect_file_type()` in `pdf_service.py` — suffix primary (`.pdf` → pdf, `.png/.jpg/.jpeg/.webp` → image), magic-byte tie-breaker (`%PDF`, `89504E47`, `FFD8FF`, `RIFF`).
- Wired `VlmOcrAdapter.ocr()` to use `detect_file_type()` instead of raw `path.suffix.lower() == ".pdf"`.
- Wired `QueueService._process_one_job()` to use `detect_file_type()` instead of `discovered.extension == ".pdf"`.
- Replaced inline `_render_pdf()` in `VlmOcrAdapter` with calls to `pdf_service.check_page_limit()` + `pdf_service.check_pdf_size()` (new 20 MB cap).
- Added `PDF_TOO_COMPLEX` error code to `ErrorCode` enum.
- Added 6 routing tests in `tests/unit/adapters/test_vlm_ocr_routing.py`.

## Key Decisions
- Magic-byte tie-breaker only activates when suffix is empty or not in the known set — preserves existing behavior for all normal cases.
- 20 MB PDF size guard enforced alongside existing 20-page guard via `pdf_service.check_pdf_size()`.
- `pdf_service.render_pdf_to_images()` kept as the reference renderer; `VlmOcrAdapter._render_pdf()` now delegates to its validation functions but keeps its own pypdfium2 render loop (avoids temp-file overhead for VLM pipeline).

## Test Coverage
- `tests/unit/adapters/test_vlm_ocr_routing.py` — 6 tests:
  - PNG named with "pdf" substring → image pipeline
  - UUID-named .pdf with PDF bytes → pdf_service
  - Routing uses suffix, not name substring
  - Uppercase .PDF extension → pdf_service
  - Real adapter: PNG-named-with-pdf → PIL called, PDF renderer NOT called
  - Real adapter: UUID .pdf → PDF branch taken, PIL NOT called
- Baseline: **253 passed, 1 pre-existing failure** (`test_health_contract` — model loaded=True vs expected False).

## Open Questions
- None.
