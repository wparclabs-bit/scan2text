# S11-FIX46-PdfChartCrops

**Date:** 2026-08-18
**Phase:** Phase 11
**Status:** COMPLETE

## What Changed

PDF pages now get chart crops extracted from the rasterized page image (the exact image the model received), with tags rewritten to relative paths exactly like the image flow.

### Forensics (read-only)
- **(a) pdf_service raster function:** `pdf_service.render_pdf_to_images()` returns `List[Path]` (PNG file paths). But in `vlm_ocr.py`, the actual rasterization is done in `_render_pdf()` which uses `pdfium.PdfDocument` directly: `pdf[index].render(scale=_PDF_RENDER_SCALE)` → `bitmap.to_pil().convert("RGB")` → `_prepare_views()` → returns `List[bytes]` of PNG-encoded bytes per page view.
- **(b) VLM image object:** For PDFs: `bitmap.to_pil().convert("RGB")` → `_prepare_views()` → returns `List[bytes]` of PNG. The model receives PNG bytes base64-encoded as `data:image/png;base64,{b64}`. For images: `Image.open(path).convert("RGB")` → `_prepare_views()` → same.
- **(c) Current extract_and_save_image_crops signature + FIX45 skip:** Signature was `extract_and_save_image_crops(markdown: str, source_image_path: Path, output_md_path: Path) -> str`. It opened the source path with `Image.open(source_image_path)` at line 273. FIX45 skip: `vlm_ocr.py` line 253: `if file_type != "pdf":` — entire crop extraction skipped for PDFs.

### Implementation
1. **`postprocess_service.py`:** `extract_and_save_image_crops` now accepts `source_image: Path | Image.Image`. If a `Path`, opens it with PIL (owned, closed in finally). If a PIL Image, uses it directly (not owned).
2. **`vlm_ocr.py` `_render_pdf`:** Now returns `List[tuple[bytes, Image.Image]] | dict` — each tuple is `(png_bytes, pil_image)`. The pil_image is the exact image fed to the model so bbox geometry matches.
3. **`vlm_ocr.py` `ocr()`:** For PDFs, splits the joined OCR text by `\n\n---\n\n`, calls `extract_and_save_image_crops` per page with the page's PIL image, then re-joins. Deleted the `if file_type != "pdf":` blanket skip (FIX45).
4. **Guard ordering preserved:** No-text check in `output_service.py` runs before crop rewrite (architecture-level ordering).

### Tests Added (`tests/test_pdf_chart_crops.py`)
- **Seam test:** PIL image + markdown with `<img src="images/bbox_0_0_20_20.jpg" />` → crop JPEG saved under `{stem}_files/images/` AND tag rewritten to relative path.
- **PDF integration:** Monkeypatch `_render_pdf` to return solid-color PIL image, mock model output with one bbox tag → final .md contains rewritten relative tag AND crop file exists.
- **Regression:** Existing image-flow crop tests stay green unchanged.

### Tests Updated
- `test_vlm_ocr.py`: `_render_pdf` mock now returns `[(bytes, PIL.Image)]` tuples.
- `test_vlm_ocr_routing.py`: `test_real_adapter_skips_crop_extraction_for_pdf` → `test_real_adapter_calls_crop_extraction_for_pdf` — asserts crop extractor IS called for PDFs with a PIL Image source.

## Key Decisions
- L9 rasterize-then-crop: use the exact PIL image the model received (after `_prepare_views` normalization), not the raw PDF path.
- Per-page crop processing: split joined OCR text, process each page's crops independently, re-join.
- Backward-compatible signature: `Path | Image.Image` keeps all existing callers working.

## Test Coverage
- New: 4 tests in `tests/test_pdf_chart_crops.py`
- Updated: 2 tests in `test_vlm_ocr.py` + `test_vlm_ocr_routing.py`
- Regression: all 23 existing postprocess tests green, all 7 existing routing tests green

## Open Questions
- Multi-view pages (very large PDF pages that `_prepare_views` splits): currently each view shares the same pil_image. Bbox geometry is per-view so this is correct, but the crop directory naming is shared across views. Pre-existing behavior, not changed.

## GATES
| Gate | Result |
|------|--------|
| Backend tests | 289 passed, 1 pre-existing (test_health_contract) |
| Frontend typecheck | clean |
| Frontend build | success |
| Targeted RED confirm | 3 failed (as expected) |
| Targeted GREEN confirm | 34 passed |
