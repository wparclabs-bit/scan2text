## Parent

Spec #4 — Document quality.

## What to build

A measured quality gate for both conversion paths. Eight small synthetic fixtures with known correct Markdown are committed, every result passes through a sanitizer and a structural validator before it is shown, and the suite fails when table-cell accuracy drops below the agreed threshold, when a table comes out malformed, or when a column is invented.

## Decisions

D-30 (the sanitizer and the structural validator: pipe escaping, duplicate header removal, de-hyphenation, whitespace normalisation, unbalanced-table and empty-page flags), D-38 (the thresholds), D-39 (eight small synthetic fixtures with goldens; the owner's real documents compared manually but kept out of the repository; committing fixtures needs an explicit ignore exception).

## Acceptance criteria

- [ ] Eight small synthetic fixtures with golden Markdown files exist and are committed, after the owner grants the explicit ignore exception.
- [ ] Every result passes through the sanitizer, whatever the engine.
- [ ] The structural validator flags an unbalanced table and an empty page, and its warning is visible to the user.
- [ ] The suite measures table-cell accuracy and fails below ninety-eight percent.
- [ ] The suite fails on any malformed table and on any hallucinated column in the wide-table fixture.
- [ ] The same fixtures score identically offline and in continuous integration, because the provider seam's fake implementation is used.
- [ ] No fixture derived from a real document is committed.

## Blocked by

T04 — A file over 8 MB becomes Markdown through the cloud engine, and T08 — A 45-column table is rebuilt from geometry.
