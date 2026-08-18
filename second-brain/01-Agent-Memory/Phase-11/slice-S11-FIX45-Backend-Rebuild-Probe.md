# S11-FIX45 — Backend-Rebuild-Probe

## What Changed
- **Source fix:** `src/scan2text/adapters/vlm_ocr.py` — skip `extract_and_save_image_crops()` when `file_type == "pdf"`. The function calls `PIL.Image.open(source_path)` which fails on PDF files with "cannot identify image file". PDFs are multi-page documents; crop extraction is an image-only feature.
- **Test:** `tests/unit/adapters/test_vlm_ocr_routing.py` — added `test_real_adapter_skips_crop_extraction_for_pdf` (RED→GREEN).
- **Rebuild:** PyInstaller exit 0, new backend hash `46D6FBCD...`.
- **Probe:** PDF probe PASS — `probe_exit=0`, `status=completed`, full resume OCR output returned.

## Key Decisions
- Crop extraction (`extract_and_save_image_crops`) is image-only. PDFs render to page images via pdfium, but the post-processing step incorrectly passed the original PDF path to PIL.
- Minimal guard: `if file_type != "pdf":` before calling crop extraction. No changes to `postprocess_service.py`.

## Test Coverage
- Backend: 285 passed, 1 pre-existing failure (`test_health_contract`).
- Frontend: 633 passed, 0 failures.
- New test: `test_real_adapter_skips_crop_extraction_for_pdf` — verifies `extract_and_save_image_crops` is never called with a PDF source path.

## Open Questions
- None. PDF probe green. Ready for CEO re-smoke.
