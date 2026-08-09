# Slice 7.2g — Real VLM Wiring: MTMD Vision + Settings Params + PDF Render

**Date:** 2026-08-09
**Phase:** 7 (Real Backend)
**Baseline:** 166c1b9

## What Changed

- **`src/scan2text/adapters/vlm_ocr.py`** — Full rewrite from mocked single-image worker to real GLM-OCR adapter using `llama-cpp-python` MTMD chat handler.
  - Worker now loads both GGUF model and mmproj vision projector via `MTMDChatHandler`.
  - `VlmOcrAdapter.__init__` reads all engine knobs from `AppSettings`: `model_path`, `mmproj_path`, `n_ctx`, `n_threads`, `ocr_timeout_seconds`, `max_pdf_pages`, `worker_priority`.
  - `ocr()` accepts images (reads bytes directly) and PDFs (renders pages to PNG via `pypdfium2` + Pillow).
  - Multi-image tasks join results with `\n\n---\n\n`.
  - Three error constants: `OCR_TIMEOUT`, `MODEL_NOT_FOUND`, `PDF_TOO_MANY_PAGES`.
  - Priority class resolved dynamically from settings (`below_normal` / `normal` / `idle`).

- **`src/scan2text/smoke.py`** — New manual smoke test script for Phase 7 E2E validation against real samples.

- **`pyproject.toml`** — Added `"pillow>=10.0"` dependency (required by pypdfium2 page rendering pipeline).

- **`tests/test_vlm_ocr.py`** — Added `test_ocr_pdf_uses_rendered_pages` routing test verifying PDF path sends rendered PNG bytes, not raw PDF.

## Key Decisions

1. **MTMDChatHandler over raw Llama**: Vision requires the multimodal chat handler; raw `Llama` cannot accept image URLs. Handler is created once per worker process at spawn time.
2. **Settings-driven params**: All engine knobs flow through `AppSettings` (already defined in 7.2b); no hardcoded values in adapter.
3. **PDF → PNG before queue**: `_render_pdf()` converts pages to PNG bytes via pypdfium2 + Pillow so the worker receives uniform image payloads regardless of input format.
4. **Pillow as explicit dep**: pypdfium2's `.to_pil()` requires Pillow; added to `[project]` dependencies.

## Test Coverage

- 119 tests passing (118 baseline + 1 new: `test_ocr_pdf_uses_rendered_pages`).
- Existing mocked tests remain green — `SettingsService`, `Process`, `psutil` patches cover init path without loading real models.
- New test verifies PDF routing: `_render_pdf` lambda returns `[b"png1", b"png2"]`, input queue receives `{"action": "ocr", "images": [b"png1", b"png2"], "max_tokens": 4096}`.

## Open Questions

- Real accuracy judgment requires manual smoke run against actual GGUF/mmproj files (not yet present in repo).
- Worker error handling for `MODEL_NOT_FOUND`: currently loops forever draining input queue with error dicts — acceptable for Phase 7 MVP.
- No frontend changes; all existing 565 frontend tests untouched.
