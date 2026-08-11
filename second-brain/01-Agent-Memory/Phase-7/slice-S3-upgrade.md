# Slice S3-Upgrade: Matrix HTML Parser and Crop Guardrails

**Date:** 2026-08-11
**Phase:** Phase 7
**Baseline:** 134 backend tests green
**Outcome:** 143 backend tests green (+9 new)

## What Changed

### `src/scan2text/services/postprocess_service.py`
- `convert_html_tables_to_gfm`: Complete rewrite from regex-based to 2D Matrix `_TableParser` (stdlib `html.parser.HTMLParser`).
  - Merged cells (`rowspan`/`colspan`): text duplicated into every covered grid cell.
  - Ragged rows: short rows padded with `""`, long rows truncated to header column count.
  - Headerless tables: first `<td>` row promoted to header (always treated as header row).
  - Line breaks: `<br>` tags flattened to single space during text collection.
  - Ghost tables: single-row tables with `<th>` but no `<td>` revert to plain text (no pipe chars).
  - Unclosed tags: `_finalize_pending()` called after `feed()` to flush dangling cells/rows.
- `extract_and_save_image_crops`: Added two guardrails.
  - Coordinate clamping: all bbox coords clamped to `[0, image_dim]` before cropping.
  - Minimum size rejection: crops < 20×20 px skipped with `logger.warning`, original tag preserved.

### `tests/unit/services/test_postprocess_service.py`
- 9 new tests added (all RED→GREEN):
  - `test_messy_unclosed_tags` — missing closing td/tr tags
  - `test_merged_cells_rowspan_colspan` — rowspan=2 colspan=2 duplication
  - `test_ragged_rows_pad_and_truncate` — pad short, truncate long
  - `test_headerless_table_promotes_first_row` — td-only table
  - `test_line_breaks_flattened_to_spaces` — `<br>` → space
  - `test_ghost_table_reverts_to_plain_text` — th-only table
  - `test_crop_clamp_coordinates` — bbox exceeding image dims
  - `test_crop_reject_tiny` — 5×5 px crop rejected
  - `test_crop_accept_minimum` — 20×20 px crop accepted

## Key Decisions

1. **stdlib only for tables**: Used `html.parser.HTMLParser` — no new dependencies. Existing Pillow retained for crops.
2. **Ghost table heuristic**: Detected as single-row table where first row contains `<th>` but no `<td>` exists anywhere in the block.
3. **Span tracker design**: Row-based set (`dict[int, set[int]]`) mapping future row indices to occupied column sets. Simpler and more correct than the initial (row,col)->remaining counter approach.
4. **Unclosed tag resilience**: `_finalize_pending()` called after `feed()` ensures dangling open cells/rows are flushed before grid is read.
5. **Crop guardrails applied before save**: Clamp first, then check min size, then crop+save. Original tag preserved on rejection.

## Test Coverage

- Backend: 143 passed (134 existing + 9 new). Zero regressions.
- Frontend: 565 passed (unchanged).
- New tests cover: messy HTML, merged cells, ragged rows, headerless tables, line breaks, ghost tables, crop clamp, crop reject tiny, crop accept minimum.

## Open Questions

- None. Slice complete per spec.
