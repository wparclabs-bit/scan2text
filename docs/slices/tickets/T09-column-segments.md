## Parent

Spec #4 — Document quality.

## What to build

A scanned page holding a wide table is split into vertical column segments, each segment is read on its own, and the segments are stitched back into one table by row index. Embedded figures come from the PDF itself, never from coordinates a model claims.

## Decisions

D-27 (column segments for scanned wide tables, stitched by row index), D-17 (embedded images are extracted from the document; the prompt never asks for bounding-box tags).

## Acceptance criteria

- [ ] A scanned page with a wide table is split into column segments that are each narrow enough to read accurately.
- [ ] The segments are stitched back into one table by row index, with no lost and no duplicated row.
- [ ] The model's own output is never used to place cells in columns.
- [ ] Embedded images are extracted from the document and placed by the document's own coordinates.
- [ ] A scanned page without a wide table still converts through the ordinary path.
- [ ] The stitched table passes the same validator as a geometry-reconstructed table.

## Blocked by

T08 — A 45-column table is rebuilt from geometry.
