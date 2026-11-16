# T07 — A digital PDF converts from its text layer without OCR

## State snapshot
- Read AGENTS.md first, then docs/slices/HANDOFF-GUIDE.md, docs/slices/DECISIONS.md (D-26, D-43, D-44, D-45, D-46, D-47), and docs/slices/STATE.md.
- Last commit: `9d155b2` (this slice's implementation commit; the branch also carries the T05 commits `ac76dec` and `4638a87`).
- Baseline: frontend 764 tests in 53 files, backend 537 passed with one warning, typecheck 0 errors, build success (2183 modules), cargo check clean; measured 2026-11-17 on Windows.
- Issue: #8.
- Open blockers: none. The PDF library (pypdfium2) is already a project dependency, so the text layer is read without installing anything.
- Concurrency note: the main checkout carried an unrelated in-flight slice (T05) while this document was written. This slice was developed on its own branch and rebased onto the T05 commits, so the two did not collide.

House rules:
- Read AGENTS.md first; it is the source of truth.
- Use PowerShell only for repository commands and py -3.12 for Python.
- TDD is mandatory: RED, then minimal GREEN, then refactor.
- Add no dependency and keep every secret out of code, tests, logs, documents, and commits.
- Run targeted tests during RED/GREEN, then all five gates.

## Goal
A PDF that already carries text converts from that text layer. Headings, lists, hyperlinks, code, and paragraph order are rebuilt from the words, their font sizes, and their positions. The page is never rasterised on this path and no model is called, so the result is exact, offline, and free. A page without a text layer still goes to OCR.

## Non-goals
- No geometry tables (T08) and no column segments (T09).
- No change to the Cloud engine.
- No sanitizer and no structural validator (T10).
- No committed PDF fixtures (T10); the tests build their PDF in memory.
- No frontend change and no new locale string.
- No dependency installation.
- No change to the Local engine recipe, the Command Center shell, or the two Preview buttons.

## Locked decisions
- D-26 — The PDF text layer is read with pdfium: words, font sizes, and positions. Headings, lists, links, code, and paragraph order are rebuilt from it without OCR.
- D-43 — The slice document restates the decisions it depends on, by ID, in one line each.
- D-44 — One fixed fourteen-section template, including "Files to touch", "Files NOT to touch", the exact RED tests, the verification commands, the new i18n keys, the Obsidian update, and the handoff notes.
- D-45 — The slice document opens with a state snapshot that is refreshed at the end; one rolling docs/slices/STATE.md is updated after the slice.
- D-46 — The slice names its RED tests exactly and lists the five gates.
- D-47 — The slice carries a five-line house-rules block and points to AGENTS.md as the source of truth.

## Baseline
Measured on 2026-11-17 at commit `9d155b2` on Windows (the branch carries the T05 commits).

| Gate | Before | After |
|---|---|---|
| Frontend tests | 764 passed, 53 files | 764 passed, 53 files (no frontend change) |
| Frontend typecheck | 0 errors | 0 errors |
| Frontend build | success, 2183 modules | success, 2183 modules |
| Backend tests | 530 passed, 1 warning | 537 passed, 1 warning (+7 text-layer and routing tests) |
| Cargo check | clean | clean |
| Slice-document checker | exit 0, 7 documents | exit 0, 8 documents |

The text layer is read with pypdfium2, the PDF library the project already ships. Nothing is installed.

## Files to touch
- `docs/slices/T07-text-layer.md` — this execution contract.
- `docs/slices/STATE.md` — the rolling state and the new baseline.
- `src/scan2text/services/text_layer.py` — the reader: words, font sizes, positions, links, and the Markdown rebuilt from them.
- `src/scan2text/services/pdf_service.py` — one helper that rasterises a single page, used only for a page without a text layer.
- `src/scan2text/services/queue_service.py` — the routing: a PDF with a text layer takes the text path; a page without one still takes OCR.
- `tests/unit/services/test_text_layer.py` — the reader and the rebuilt Markdown.
- `tests/unit/services/test_text_layer_pipeline.py` — the routing, the no-model proof, and the no-rasterisation proof.

## Files NOT to touch
- `frontend/` — the slice changes no user-visible string and no component.
- `src/scan2text/adapters/vlm_ocr.py` — the Local engine and its recipe stay untouched; the text path never calls it.
- `src/scan2text/cloud/` — the Cloud engine is out of scope.
- `src/scan2text/models/` — no job, error, or result model changes.
- `src/scan2text/services/output_service.py` — the Markdown contract and the page separator stay as they are.
- `src/scan2text/api/main.py` — the HTTP contract does not change.
- `docs/slices/DECISIONS.md` — no decision changes in this slice.

## RED tests to write first
- `tests/unit/services/test_text_layer.py` — `test_digital_page_rebuilds_heading_list_link_code_and_order`, `test_two_column_page_reads_left_column_before_right_column`, `test_page_without_text_layer_reports_no_text`.
- `tests/unit/services/test_text_layer_pipeline.py` — `test_digital_pdf_produces_markdown_without_calling_the_model`, `test_digital_pdf_is_not_rasterised`, `test_scanned_pdf_still_uses_the_ocr_path`, `test_mixed_pdf_uses_text_layer_for_the_digital_page_and_ocr_for_the_scanned_page`.

Expected count before: 0 tests in the two new files. Expected count after: 7 tests.

## Implementation steps
1. Write `tests/unit/services/test_text_layer.py` with a PDF built in memory (standard library bytes, no committed fixture) and run it: RED, because the reader module does not exist.
2. Add `src/scan2text/services/text_layer.py`: read the words, their font sizes, and their positions; group them into lines; rebuild headings, lists, links, code, and reading order; run the targeted test: GREEN.
3. Write `tests/unit/services/test_text_layer_pipeline.py` and run it: RED, because the queue still sends every PDF to OCR.
4. Route in `src/scan2text/services/queue_service.py`: a PDF with a text layer converts from it, a page without one is rasterised and sent to OCR; run the targeted test: GREEN.
5. Refactor only after GREEN: one helper for the page rasterisation in `src/scan2text/services/pdf_service.py`, and no duplicated Markdown rules.
6. Run the five gates and record the counts.

## Verification commands
- `py -3.12 -m pytest tests/unit/services/test_text_layer.py tests/unit/services/test_text_layer_pipeline.py -q --tb=line` — the targeted test, 7 passed.
- `pwsh -NoProfile -Command "$env:PYTHONPATH='src'; py -3.12 -m pytest -q --tb=line"` — the full backend suite from the repository root.
- `npm.cmd run test` — the frontend suite in `frontend/`.
- `npm.cmd run typecheck` — 0 errors.
- `npm.cmd run build` — success.
- `cargo check --message-format=short` — clean, in `frontend/src-tauri/`.
- `py -3.12 scripts/check_slice_docs.py --all` — exit 0 over every slice document.

## New i18n keys
None. The slice is backend-only and adds no user-visible string.

## Obsidian update
- `second-brain/01-Agent-Memory/Phase-S66/slice-T07-TEXT-LAYER.md` — what the reader does, the rules it rebuilds, the RED and GREEN evidence, the baseline, and what is still open.
- `second-brain/00-Current-State.md` — the new baseline and one changelog entry.

## Definition of done
- [x] RED observed failing, for the right reason.
- [x] The targeted test green.
- [x] The five gates green, with the new counts recorded here and in docs/slices/STATE.md.
- [x] The slice-document checker passes.
- [x] The Obsidian summary and 00-Current-State.md are updated.
- [x] No dependency added, no fixture committed, no frontend change, no secret in the diff.
- [x] The work is committed with a GitHub noreply email.

## Handoff notes
- What now works that did not before: a PDF that carries a text layer converts from that text layer. `src/scan2text/services/text_layer.py` reads the words, their font sizes, their positions, and the page's link annotations, and rebuilds Markdown: a heading level from the font size against the body size, a bullet or numbered item from the line's first characters, a fenced code block from a monospace font, a hyperlink from the link annotation that covers the words, paragraphs from the lines that sit on the same baseline band, and reading order from the columns.
- What the next slice may assume: the routing lives in `QueueService._convert_pdf_text_layer`. A PDF with a text layer never reaches the model and is never rasterised; a page without a text layer is rasterised on its own and sent to OCR; a mixed document converts page by page and joins the pages with the FR-06 separator. The reader is pure: it never writes a file and never calls a model.
- One existing test changed: `tests/unit/cloud/test_cloud_conversion.py` asserted that a small digital PDF reaches the OCR adapter on the local path. The local path for a digital PDF is now the text layer, so the test now asserts that the file stayed local and that its Markdown came from the text layer.
- Still open: the heuristics are deliberately simple — a heading is a line whose font size is at least 1.15 times the body size, a column is a band of lines that do not overlap horizontally, and a paragraph is a run of same-sized lines less than 1.6 line heights apart. T08 (geometry tables) and T09 (column segments) build on this reader; T10 owns the committed fixtures and the sanitizer. The committed-fixture ignore exception still needs the owner's approval.
- The PDF library is pypdfium2, already a project dependency. Nothing was installed.
- This slice was developed on the branch `slice/T07-text-layer` because the main checkout carried T05 in flight; the branch was rebased onto the T05 commits and then fast-forwarded into `main`. The commits are `9d155b2` (the reader, the routing, the tests, and this document) and `f689648` (the state and these handoff notes).
