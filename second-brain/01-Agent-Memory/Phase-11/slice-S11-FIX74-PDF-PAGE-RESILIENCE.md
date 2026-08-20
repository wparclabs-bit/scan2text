# S11-FIX74 — PDF Page Resilience

- **Status:** COMPLETE (TDD RED→GREEN)
- **Date:** 2026-08-20
- **Commit:** (pending — see FINAL OUTPUT)

## Defect
Defect 2 from `S11-DIAG-BACKEND-STATUS-SEMANTICS`: PDF processing was atomic per
file. One bad page (timeout / engine error / post-processing error) killed the
ENTIRE PDF — no `.md` written even when most pages OCR fine.

## Root-cause site
`src/scan2text/adapters/vlm_ocr.py`, `VlmOcrAdapter.ocr()`, per-page loop at
**lines 272–278**. The call `extract_and_save_image_crops(page_text, pil_img,
output_md_path)` (was 275–277) ran unguarded inside the per-page loop; any
exception propagated out of `ocr()` and was swallowed by
`queue_service._process_single:260`, which marked the whole PDF FAILED and
wrote no `.md`. (The batched single `output_queue.get()` at line 247 also fails
the whole PDF atomically on an engine/timeout error dict — separate limitation.)

## Fix
Minimal, page-level mirror of FIX73 semantics (`vlm_ocr.py:272-299`):
- Wrap the per-page `extract_and_save_image_crops` in try/except.
- Skip failed pages; collect successful pages IN ORDER.
- Join successful pages into ONE Markdown doc with the FR-06 `\n\n---\n\n`
  separator preserved.
- Log skipped pages privacy-safely (NFR-02): `logger.warning("PDF page OCR
  failed: index=%s code=%s", i, OCR_FAILED)` — page index + error code only,
  NO filename, NO document content.
- Return an `OCR_FAILED` dict (→ quarantine, no `.md`) ONLY when zero pages
  succeed. Any page succeeds → caller writes the `.md`; batch-level
  `PARTIAL_FAILURE` (FIX73) still applies via main.py.

## Tests
New file `tests/test_vlm_ocr_pdf_page_resilience.py` (5 tests, RED confirmed
then GREEN):
- one middle page raises → job completes; good pages present IN ORDER with
  separator; bad page absent.
- all pages fail → `ocr()` returns `OCR_FAILED` dict.
- skipped page logs page index + code only; no filename/content in any record.
- end-to-end partial success → ONE `.md` with only good pages (via
  `QueueService.process_image_paths`).
- end-to-end all-fail → no `.md`, source quarantined.

Mock pattern reused from `test_pdf_chart_crops.py` / `test_vlm_ocr.py`:
`patch.object(VlmOcrAdapter, "__init__", …)` + set `_loaded/_timeout/_input_queue
/_output_queue` + monkeypatch `_render_pdf`; patch
`scan2text.adapters.vlm_ocr.extract_and_save_image_crops` with a `side_effect`;
privacy via `caplog`; end-to-end `.md` via `QueueService`.

## Targeted regression
67 passed across `test_vlm_ocr_pdf_page_resilience.py`,
`test_vlm_ocr.py`, `test_pdf_chart_crops.py`, `test_vlm_ocr_pdfium_import.py`,
`test_timeout_autoscale.py`, `unit/adapters/test_vlm_ocr_routing.py`,
`unit/services/test_queue_service.py`, `integration/test_pdf_handling.py`,
`integration/test_queue_service.py`, `test_status_semantics.py`.

## Deferred to GATE3
Full backend suite (322 passed + 1 pre-existing `test_health_contract`),
rebuild, deploy, and PyInstaller. **Deployed backend binary at
`D:\Scan2Text\backend` is STILL STALE (`B94612C9…`)** — not rebuilt this slice.

## Scope kept
No frontend/Rust/Tauri changes; no new dependencies; no `main.py` batch-status
edit (FIX73 locked); logging-infrastructure gap left parked.
