# T08 - A 45-column table is rebuilt from geometry

## State snapshot
- Read AGENTS.md first, then docs/slices/HANDOFF-GUIDE.md, docs/slices/DECISIONS.md (D-16, D-17, D-26, D-27, D-28, D-38 as amended), and docs/slices/STATE.md.
- Read docs/slices/tickets/T08-geometry-tables.md for the ticket body, docs/slices/T07-text-layer.md for the reader this slice builds on, and docs/slices/T04-cloud-conversion.md for the wide-table record this slice consumes.
- Last commit before this slice: `6151555`.
- Baseline at the start: frontend 787 tests in 58 files, backend 545 passed with one warning, typecheck 0 errors, build success (2186 modules), cargo check clean; measured 2026-11-18 on Windows.
- Final result: implemented and green; the final counts are recorded in the Baseline table and in `docs/slices/STATE.md`.
- Issue: #15.
- Open blockers: none. The PDF library (pypdfium2) is already a project dependency, so the geometry path is built without installing anything.

House rules:
- Read AGENTS.md first; it is the source of truth.
- Use PowerShell only for repository commands and py -3.12 for Python.
- TDD is mandatory: RED, then minimal GREEN, then refactor.
- Add no dependency and keep every secret out of code, tests, logs, documents, and commits.
- Run targeted tests during RED/GREEN, then all five gates.

## Goal
A wide table is rebuilt from the geometry of the text on the page, not from what a model reports. Every cell lands in the right column, no cell is truncated, ragged rows are padded to the widest row, pipes inside cells are escaped, and a repeated header row is removed from the body. A table of thirteen or more columns takes this path. A table of twelve or fewer columns is not routed to it.

## Non-goals
- No column segments for scanned pages - T09.
- No committed golden fixtures and no sanitizer - T10.
- No Cloud conversion change beyond consuming the record a wide table already leaves.
- No change to the text-layer heuristics for headings, lists, links, code, or reading order.
- No change to the Local engine and its recipe.
- No dependency installation.
- No change to the Command Center layout, the TopBar, or the two Preview buttons.

## Locked decisions
- D-16 - The provider request sends page images and the extracted text layer together.
- D-17 - The Cloud prompt asks for HTML tables, and the existing HTML-to-GFM converter produces the final Markdown.
- D-26 - The PDF text layer is read with pdfium: words, font sizes, and positions.
- D-27 - Tables with thirteen or more columns are reconstructed from text geometry, not from the model.
- D-28 - Table cells are never truncated, rows are padded to the widest row, and pipes inside cells are escaped.
- D-38 (as amended) - The geometry path must reach at least 98% cell accuracy with zero malformed tables and zero hallucinated columns.

## Baseline
Measured on 2026-11-18 at commit `6151555` on Windows.

| Gate | Before | After |
|---|---|---|
| Frontend tests | 787 passed, 58 files | 787 passed, 58 files (no frontend change) |
| Frontend typecheck | 0 errors | 0 errors |
| Frontend build | success, 2186 modules | success, 2186 modules |
| Backend tests | 545 passed, 1 warning | 558 passed, 1 warning (+13 tests) |
| Cargo check | clean | clean |
| Slice-document checker | exit 0, 11 documents | exit 0, 12 documents |

RED evidence: `tests/unit/services/test_geometry_tables.py` failed to import `find_geometry_tables`; the three converter cases failed on truncation, an unescaped pipe, and a repeated header; the Cloud case failed because the result carried only the model reply. GREEN: 48 passed across the three T08 target files, then 558 passed in the full backend suite.

## Files to touch
- `docs/slices/T08-geometry-tables.md` - this execution contract.
- `docs/slices/STATE.md` - the rolling state and the new baseline.
- `src/scan2text/services/text_layer.py` - the geometry reader built on the T07 words, positions, and font sizes.
- `src/scan2text/services/postprocess_service.py` - the existing HTML-to-GFM converter: no truncation, widest-row padding, pipe escaping, and repeated-header removal.
- `src/scan2text/cloud/conversion.py` - consume the wide-table record and carry the reconstructed table.
- `tests/unit/services/test_geometry_tables.py` - the geometry reconstruction tests.
- `tests/unit/services/test_postprocess_service.py` - the extended converter tests.
- `tests/unit/services/test_text_layer_pipeline.py` - the local-path proof: a wide table converts with no model call.
- `tests/unit/cloud/test_cloud_conversion.py` - the wide-table record consumption test.
- `tests/unit/cloud/__init__.py` - the package marker that lets the shared PDF fixture builder import in a standalone Cloud test run.

## Files NOT to touch
- `frontend/` - the slice changes no user-visible string and no component.
- `src/scan2text/adapters/vlm_ocr.py` - the Local engine and its recipe stay untouched.
- `src/scan2text/cloud/provider.py` and `src/scan2text/cloud/models.py` - the provider seam and the recipe stay untouched.
- `src/scan2text/services/queue_service.py` - the T07 local routing already calls the text-layer reader; the reader itself owns the geometry result.
- `src/scan2text/api/main.py` - the HTTP contract does not change.
- `docs/slices/DECISIONS.md` - no decision changes in this slice.

## RED tests to write first
- `tests/unit/services/test_geometry_tables.py` - `test_thirteen_column_table_is_reconstructed_from_word_positions`, `test_no_cell_is_truncated_in_a_wide_table`, `test_ragged_wide_table_rows_are_padded_to_the_widest_row`, `test_pipe_inside_a_wide_table_cell_is_escaped`, `test_repeated_header_row_is_removed_from_the_wide_table_body`, `test_forty_five_column_table_has_no_hallucinated_column`, `test_table_with_twelve_or_fewer_columns_is_not_routed_to_the_geometry_path`, `test_forty_five_column_table_reaches_at_least_98_percent_cell_accuracy`, `test_the_geometry_reader_and_the_cloud_path_share_one_wide_table_limit`.
- `tests/unit/services/test_postprocess_service.py` - extend the existing converter tests: `test_ragged_rows_are_padded_to_the_widest_row_without_truncation` replaces `test_ragged_rows_pad_and_truncate`, `test_pipe_inside_a_cell_is_escaped`, `test_repeated_header_row_is_removed_from_the_body`.
- `tests/unit/services/test_text_layer_pipeline.py` - `test_local_pdf_rebuilds_a_wide_table_from_geometry_without_the_model`.
- `tests/unit/cloud/test_cloud_conversion.py` - `test_a_wide_table_record_is_filled_by_the_geometry_path_instead_of_a_placeholder`.

Expected count before: 0 tests in `tests/unit/services/test_geometry_tables.py`; the converter, pipeline, and Cloud files keep their current counts. Expected count after: 13 new or extended tests across the four files (545 to 558 backend tests).

## Implementation steps
1. Write `tests/unit/services/test_geometry_tables.py` with PDFs built in memory, run the file, and confirm RED because no geometry reader exists.
2. Add the geometry reader to `src/scan2text/services/text_layer.py`: group words into visual lines, recognise a table structurally from repeated horizontal column positions and font sizes, derive the column boundaries, assign every cell, remove a repeated body header, and emit an HTML table for the existing converter.
3. Extend `tests/unit/services/test_postprocess_service.py`, confirm RED, then extend `convert_html_tables_to_gfm`: pad every row to the widest row, never truncate a cell, escape pipes inside cells, and remove a repeated header row from the body.
4. Add the Cloud consumption test in `tests/unit/cloud/test_cloud_conversion.py`, confirm RED, then fill the awaiting-geometry record from the PDF text geometry and carry the reconstructed table in the result.
5. Confirm the geometry path is not used for a table of twelve or fewer columns and that no output contains a column the page did not have.
6. Refactor only after GREEN: one geometry path, one HTML-to-GFM path, no duplicated Markdown writer.
7. Run the five gates and the slice-document checker, refresh this document and `docs/slices/STATE.md`, write the vault summary, update `second-brain/00-Current-State.md`, commit with the GitHub noreply email, and push.

## Verification commands
- `pwsh -NoProfile -Command "$env:PYTHONPATH='src'; py -3.12 -m pytest tests/unit/services/test_geometry_tables.py -q --tb=line"` - the targeted geometry tests pass.
- `pwsh -NoProfile -Command "$env:PYTHONPATH='src'; py -3.12 -m pytest tests/unit/services/test_postprocess_service.py tests/unit/services/test_text_layer_pipeline.py tests/unit/cloud/test_cloud_conversion.py -q --tb=line"` - the extended converter, local-path, and Cloud tests pass.
- `pwsh -NoProfile -Command "$env:PYTHONPATH='src'; py -3.12 -m pytest -q --tb=line"` - the full backend suite passes at the repository root.
- `npm.cmd run test` in `frontend/` - 787 passed in 58 files.
- `npm.cmd run typecheck` in `frontend/` - 0 errors.
- `npm.cmd run build` in `frontend/` - build success.
- `cargo check --message-format=short` in `frontend/src-tauri/` - clean.
- `py -3.12 scripts/check_slice_docs.py --all` - exit 0 over every slice document.

## New i18n keys
None. The slice is backend-only and adds no user-visible string.

## Obsidian update
- `second-brain/01-Agent-Memory/Phase-S66/slice-T08-GEOMETRY-TABLES.md` - the geometry rules, the RED and GREEN evidence, the baseline, and the handoff notes.
- `second-brain/00-Current-State.md` - the new baseline and one changelog entry; the vault keeps only the last five changelog entries, so the oldest entry moves to `second-brain/01-Agent-Memory/Archive/state-history.md`.

## Definition of done
- [x] RED observed failing, for the right reason.
- [x] The targeted tests green.
- [x] A table of thirteen or more columns is reconstructed from the text positions and font sizes.
- [x] A table of twelve or fewer columns is not routed to the geometry path.
- [x] No cell is truncated; ragged rows are padded to the widest row.
- [x] Pipes inside cells are escaped and a repeated header row is removed from the body.
- [x] The forty-five-column table produces no hallucinated column and reaches 100% cell accuracy.
- [x] The existing HTML-to-GFM converter is reused and its tests are extended, not duplicated.
- [x] The Cloud wide-table record carries the reconstructed table rather than a placeholder.
- [x] The model is never asked to read a table of thirteen or more columns.
- [x] Every new string is in English and Indonesian; every new testable element has a `data-testid`. The slice is backend-only: no new string, no new testable element.
- [x] All five gates and the slice-document checker pass; the new counts are recorded.
- [x] `docs/slices/STATE.md`, the vault summary, `second-brain/00-Current-State.md`, and this document are updated.
- [x] The work is committed with the GitHub noreply email and pushed; no secret is committed.
- [x] No screenshot is required: the Command Center layout does not change.

## Handoff notes
- What now works that did not before: `src/scan2text/services/text_layer.py` finds a wide table by structure - rows of cells that share column anchors - and rebuilds every cell from the words, their positions, and their font sizes. `find_geometry_tables(page)` returns the reconstructed rows; `build_geometry_table_markdown(page)` returns the final Markdown through the existing HTML-to-GFM converter. `build_page_markdown(page)` now emits that table, so the Local path (T07's `QueueService._convert_pdf_text_layer`) converts a wide digital PDF with no model call and no rasterisation.
- The shared converter now owns the D-28 rules for every path: `src/scan2text/services/postprocess_service.py` pads each row to the widest row, never truncates a cell, escapes a pipe inside a cell, and drops a repeated header row from the body.
- What the next slice may assume: the Cloud path (`src/scan2text/cloud/conversion.py`) computes each page's column count from the geometry reader as well as from the tab signal, keeps a wide page out of the model request, and fills the `awaiting_geometry` record with the reconstructed table. A page that the geometry path cannot rebuild stays in `awaiting_geometry` and keeps the `[wide table awaiting geometry]` placeholder; the tab-only T04 fixture is one such page, and its test still passes unchanged.
- The owner can see a wide table converted locally by dropping a digital PDF (one that already carries text) of at most 8 MB into the queue: the Local engine reads the text layer, rebuilds the wide table from its geometry, and writes the Markdown with no cloud consent and no model request.
- Still open: T09 column segments for scanned pages, T10 committed fixtures and the sanitizer, T12 handoff documentation and ADRs.
- Risks and notes: the geometry reader works per page, so a table whose header sits on one page and whose body sits on the next is not detected and stays in `awaiting_geometry`. The column count comes from the widest aligned row on the page, and the tolerance follows the observed column pitch, so the 13-column and 45-column layouts both resolve. The repeated-header removal now lives in the converter; T10's sanitizer must not escape pipes a second time.
- No dependency was installed, no fixture was committed, no frontend file changed, and no decision changed.
