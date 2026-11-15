## Parent

Spec #4 — Document quality.

## What to build

A digital PDF converts from the text layer it already contains: headings, lists, links, code, and paragraph order are rebuilt from the words, their font sizes, and their positions, with no optical recognition and no model in the loop. It is exact, fast, and free.

## Decisions

D-26 (the text layer is the source; headings, lists, links, code, and order are rebuilt from it without optical recognition).

## Acceptance criteria

- [ ] A digital PDF converts without rasterising a page and without calling a model.
- [ ] Headings are recognised from the text layer, and lists stay lists.
- [ ] Hyperlinks survive as links and code survives as code.
- [ ] Reading order is rebuilt correctly for a multi-column page.
- [ ] The conversion runs offline and raises no provider call.
- [ ] Tests use synthetic documents with known correct Markdown, covering headings, lists, links, code, and reading order.

## Blocked by

None (can start immediately).
