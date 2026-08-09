# Slice 7.2g-fix4: Auto-Scale Tiling for Wide Images

## What Changed
- Added `_TILE_TARGET = 1152`, `_TILE_OVERLAP = 0.10` constants to `vlm_ocr.py`.
- Added `_pil_to_png(img)` — caps long edge at `_MAX_IMAGE_EDGE` (2048), encodes PNG.
- Refactored `_shrink_to_png` to delegate to `_pil_to_png`.
- Added `_tile_image(img)` — splits wide images (aspect >= 1.3 and width > ~1613px) into overlapping tiles at the ~1152px sweet spot; portrait/normal images pass through single-pass.
- Updated `VlmOcrAdapter.ocr()` to use `_tile_image(pil_img.convert("RGB"))` for images instead of raw `_shrink_to_png`.
- Updated `VlmOcrAdapter._render_pdf()` to use `_tile_image(bitmap.to_pil().convert("RGB"))` per page instead of manual render+shrink.
- Added two tests: `test_tile_image_splits_wide_images` (2300×1000 → 2 tiles) and `test_tile_image_keeps_portrait_single` (1000×1400 → 1 tile).
- Fixed two existing tests (`test_multiple_ocr_calls_use_same_worker_queues`, `test_timeout_returns_error_dict_without_killing_worker`) to patch `PIL.Image.open` since the code path now opens the file directly before tiling.

## Key Decisions
- Sweet spot ~1150px proven by smoke tests; rounded to 1152 for clean binary math.
- Wide threshold: aspect ratio >= 1.3 AND width > `_TILE_TARGET * 1.4` (~1613px) — avoids tiling marginally wide images that the model handles fine in one pass.
- 10% overlap between adjacent tiles prevents edge-cut text from being lost at tile boundaries.
- Portrait/normal images are unchanged — single `_pil_to_png` call, no extra complexity.
- PDF pages also auto-tiled via the same `_tile_image` path after pypdfium2 rendering.

## Test Coverage
- `test_tile_image_splits_wide_images`: 2300×1000 white image → exactly 2 tiles.
- `test_tile_image_keeps_portrait_single`: 1000×1400 white image → exactly 1 tile.
- All 121 root tests passing (2 new + 2 fixed existing).

## Open Questions
- Tile count formula uses `round(w / _TILE_TARGET)` — may produce non-uniform tile widths at edges due to overlap. Acceptable for now; can refine if smoke tests show quality issues.
- No test for 3+ tile split (very wide images > 3456px). Could add if needed.
