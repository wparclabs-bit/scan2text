# Slice S3 — Post-Processing Service (HTML Tables to GFM + Chart Crops)

Date: 2026-08-10
Phase: Phase 7
Baseline: ec9443d (Phase 6 closed) → 1fafc6b (S2)
Commit: pending

## What Changed

- **New file:** `src/scan2text/services/postprocess_service.py`
  - `convert_html_tables_to_gfm(markdown)` — finds `<table>...</table>` blocks (case-insensitive, multiline), extracts `<td>`/`<th>` cell text (strips inner tags), produces GFM table with separator row after first row. Best-effort; no rowspan/colspan reconstruction (NFR-04).
  - `extract_and_save_image_crops(markdown, source_image_path, output_md_path)` — finds `<img src="images/bbox_{L}_{T}_{R}_{B}.jpg" />` tags, crops source image using scaled 0-1000 coords via PIL, saves to `{output_md_path.parent}/{stem}_files/images/`, rewrites markdown src to relative path.
- **Modified:** `src/scan2text/adapters/vlm_ocr.py`
  - Imports postprocess functions.
  - After receiving raw string from worker queue, calls `convert_html_tables_to_gfm()` then `extract_and_save_image_crops()`. Error dicts pass through unchanged. Crops saved next to source image in `{stem}_files/images/`.
- **New tests:** `tests/unit/services/test_postprocess_service.py` (11 tests)
- **Patched:** `tests/test_vlm_ocr.py` — two tests mock `extract_and_save_image_crops` since they use fake image bytes not valid for PIL.

## Key Decisions

- Stdlib + PIL only; no new dependencies.
- Crops saved adjacent to source image (`{stem}_files/images/`) rather than output dir — adapter doesn't know final output path at call time. Can be moved later if needed.
- Invalid coord pairs (x2≤x1 or y2≤y1) preserve original tag to avoid data loss.
- Image kept open during full substitution to avoid PIL file-handle closure issue.

## Test Coverage

- `convert_html_tables_to_gfm`: simple 2x2, `<th>` cells, nested tags stripped, multiline tables, case-insensitive tags, no-tables passthrough, mixed content preservation.
- `extract_and_save_image_crops`: single crop save + src rewrite, multiple crops, no-img passthrough, invalid coords preserved.

## Open Questions

- Crop directory location: currently next to source image. May need migration to output dir in a future slice if CEO prefers all artifacts grouped with the markdown output.
