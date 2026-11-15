## Parent

Spec #4 — Document quality.

## What to build

A wide table is rebuilt from the geometry of the text on the page rather than from what a model reports, so that every cell lands in the right column and no data is invented or lost. Tables of thirteen or more columns take this path.

## Decisions

D-27 (geometry reconstruction from thirteen columns upward), D-28 (no truncated cells, rows padded to the widest row, pipes inside cells escaped).

## Acceptance criteria

- [ ] A table of thirteen or more columns is reconstructed from the text positions, and a table below that threshold may still use the model.
- [ ] No cell is ever truncated, and a ragged table's rows are padded to the widest row.
- [ ] A pipe inside a cell is escaped, so one cell cannot break the row.
- [ ] A repeated header row is removed from the body.
- [ ] The forty-five-column fixture produces no hallucinated column.
- [ ] The existing HTML-to-GFM converter's tests are extended rather than duplicated.

## Blocked by

T07 — A digital PDF converts from its text layer without OCR.
