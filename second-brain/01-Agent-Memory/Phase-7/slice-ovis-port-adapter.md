# Slice S2 — Port VLM OCR Adapter to OvisOCR2 Recipe (ADR-006)

Date: 2026-08-10
Phase: Phase 7
Slice: S2 (backend only)

## What Changed

`src/scan2text/adapters/vlm_ocr.py` rewritten per ADR-006:

- **Docstring**: "GLM-OCR 0.9B" → "OvisOCR2 0.9B (ADR-006)"; states one persistent worker, ONE normalized full-page PNG per page (no tiling).
- **Prompt**: replaced free-form GLM prompt with exact OvisOCR2 verbatim prompt (triple-single-quoted, leading `\n` included).
- **Geometry**: deleted `_TILE_TARGET`, `_TILE_OVERLAP`, `_tile_image`. Added `_MAX_IMAGE_EDGE = 2880`, `_MAX_PIXELS = 4_000_000`. New `_prepare_views(img) -> List[bytes]` computes scale from both edge and area caps, resizes with LANCZOS when needed, encodes single PNG. `_pil_to_png` cap logic removed (now lives only in `_prepare_views`). `_shrink_to_png` updated to use `_prepare_views`.
- **Sampling**: `create_chat_completion` now passes `temperature=0.1` and `repeat_penalty=1.0` (ADR-006 locked; llama-cpp default repeat penalty hurts OCR).
- **Callers**: `ocr()` uses `_prepare_views(pil_img.convert("RGB"))`; `_render_pdf()` uses `_prepare_views(bitmap.to_pil().convert("RGB"))` per page. Multi-page PDF join (`\n\n---\n\n`) retained.

`tests/test_vlm_ocr.py` updated:
- Patch targets changed from `_tile_image` to `_prepare_views` in existing tests.
- Deleted `test_tile_image_splits_wide_images` and `test_tile_image_keeps_portrait_single`.
- Added `test_prepare_views_returns_one_view_for_normal_image`, `test_prepare_views_caps_long_edge_to_2880`, `test_prepare_views_caps_pixels_to_4m`.

`tools/port_check.py` created (new file) — instantiates `VlmOcrAdapter`, times `ocr("samples/biaya.jpg")`, prints settings + WALL_SECONDS + CHARS + `<tr` count + presence of 11 numerics + `<table` check.

## Key Decisions

- No tiling for OvisOCR2: full-page pass only (ADR-006 §5). Wide-sheet 2-pass tiling parked as enhancement.
- `_MAX_PIXELS = 4_000_000` chosen so image tokens (~px/1024 ≈ 3906) + 4096 output fit within n_ctx 8192 with headroom.
- `repeat_penalty=1.0` explicitly set; llama-cpp default penalizes repetition too aggressively for OCR.
- `_shrink_to_png` repurposed to call `_prepare_views` instead of old `_pil_to_png` (which had its own cap).

## Port Check Numbers

```
settings ocr_timeout_seconds=600
WALL_SECONDS=83.1
CHARS=4616
<tr count=27
all_numerics=YES
<table=YES
tr_count>=20 YES
PASS=YES
```

All 11 numerics present, `<table` present, `<tr` count = 27 ≥ 20. PASS.

## Test Coverage

Backend tests: 122 → 123 (+1 new test for pixel-cap capping). All green.

## Open Questions

- Wide-sheet 2-pass tiling (parked per ADR-006) — revisit in future slice if CEO requests.
- max_tokens headroom on dense pages (image4 at 8192) — noted in ADR-006 open items.
