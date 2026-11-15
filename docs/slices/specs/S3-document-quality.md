# Spec 3 — Document quality

## Problem Statement

As a user with a digital PDF, I want the application to read the text that is already in the file, so that headings, lists, links, code, and paragraph order come out exact instead of being guessed by a small model from a rasterised image.

As a user with a wide table, I want every cell preserved in the right column, so that I can trust the numbers. Today a digital PDF is rasterised and read by a 0.9B model, a wide table is truncated and pipes inside cells break the row, and nothing records which engine and prompt produced a file.

## Solution

As a user, I want a document pipeline that reads the PDF text layer first, reconstructs wide tables from text geometry instead of from model output, and validates the final Markdown before it is shown, so that conversion is exact where the file allows it, honest about what it could not read, and traceable to the recipe that produced it.

The Cloud path asks the model for HTML tables and reuses the existing HTML-to-GFM converter. The output carries metadata naming the engine, the model, the prompt version, the page count, and the generation time, while the Preview panel and the copied Markdown show only the document body.

## User Stories

1. As a user with a digital PDF, I want the existing text read directly from the file, so that the conversion is exact rather than inferred.
2. As a user, I want headings recognised from font size and structure, so that my document's outline survives.
3. As a user, I want lists recognised as lists, so that item structure is preserved.
4. As a user, I want hyperlinks preserved as links, so that references stay usable.
5. As a user, I want code blocks preserved as code, so that indentation and formatting survive.
6. As a user, I want reading order rebuilt from the text layer, so that multi-column pages read in the right sequence.
7. As a user, I want a digital PDF to skip the model entirely, so that it converts faster, offline, and for free.
8. As a user with a scanned PDF, I want the model used where the page truly has no text, so that scans still work.
9. As a user with a wide table, I want the table reconstructed from the text positions, so that every cell lands in the right column.
10. As a user with a very wide table, I want no cell ever truncated, so that no data silently disappears.
11. As a user with a ragged table, I want rows padded to the widest row, so that the Markdown table stays well-formed.
12. As a user with text containing pipes inside a cell, I want those pipes escaped, so that one cell cannot break the row.
13. As a user with a scanned wide table, I want the page split into vertical column segments that are read separately and stitched back by row, so that narrow segments stay legible.
14. As a user, I want duplicate header rows removed from the body, so that the table is not repeated on every page.
15. As a user, I want words split across line breaks rejoined, so that the text reads naturally.
16. As a user, I want whitespace normalised, so that the output is clean.
17. As a user, I want a structural validator to flag an unbalanced table or an empty page, so that a defective file is caught before I open it.
18. As a user, I want the validator's warning visible, so that I know which part of the document to distrust.
19. As a user, I want embedded images extracted from the PDF itself, so that figures appear without trusting model-emitted coordinates.
20. As a user, I want the file to begin with metadata naming the engine, the model, the prompt version, the page count, and the generation time, so that I know how it was produced.
21. As a user, I want the Preview panel to hide that metadata, so that I read my document.
22. As a user, I want the copied Markdown to exclude that metadata, so that pasting it elsewhere stays clean.
23. As a user, I want the output file to keep the same name and the same folder as before, so that my existing workflow is untouched.
24. As a user, I want Cloud output to go through the same sanitizer as local output, so that both engines produce comparable quality.
25. As a maintainer, I want a set of small synthetic documents with known correct Markdown, so that quality is measured rather than admired.
26. As a maintainer, I want the measured table-cell accuracy to be at least 98%, so that a regression in table handling is caught.
27. As a maintainer, I want the wide-table fixture to show no hallucinated columns, so that the model cannot invent data.
28. As a maintainer, I want the quality fixtures to stay tiny and synthetic, so that the public repository stays free of large binaries.

## Implementation Decisions

- The PDF text layer is read with the existing PDF rendering library: words, font sizes, and positions. Headings, lists, links, code, and paragraph order are rebuilt from it without optical recognition (D-26).
- Tables with 13 or more columns are reconstructed from text geometry, not from the model. The model is consulted only for scanned pages, where a wide table is split into column segments, processed separately, and stitched back by row index (D-27).
- Table cells are never truncated. Rows are padded to the widest row, and pipes inside cells are escaped (D-28).
- The Cloud path asks for HTML tables and reuses the existing HTML-to-GFM converter, which already handles merged cells and ragged rows. The prompt never asks for bounding-box tags (D-17).
- Embedded images are extracted from the PDF directly, so no model-emitted coordinates are trusted (D-17).
- The request carries page images and the extracted text layer together; withholding the text buys no privacy and costs fidelity (D-16).
- Cloud output carries YAML front matter with engine, model, prompt version, page count, and generation timestamp. The Preview panel strips it and the copy action copies the body alone (D-29).
- Output naming, the output folder, and the Open Folder behaviour do not change (D-29).
- A sanitizer runs on every result, whatever the engine: pipe escaping, duplicate header removal, de-hyphenation, whitespace normalisation, and a structural validator that flags unbalanced tables and empty pages (D-30).
- A Band is five consecutive pages per request, keeping a table intact across a page break while staying inside the provider's rate limit (D-15).
- The prompt is versioned and its version is recorded in the output metadata, so a result is traceable to the recipe that produced it (D-18).
- A spike runs first and records real figures: base64 image acceptance on the hosted endpoint, token counts for a page and a table crop at five pages per band, latency, and cost for a 30-page document (D-37).
- The spike's pass thresholds are: cost at or below $0.10 per 30-page document, band latency at or below 20 seconds, at least 98% table-cell accuracy on the fixtures, zero malformed tables, and zero hallucinated columns on the 45-column fixture. If a threshold fails, the plan changes (D-38).
- Eight small synthetic fixtures with golden Markdown files are committed, and the owner's real documents are compared manually but kept out of the repository. Committing fixtures needs an explicit ignore exception, requested before it is added (D-39).
- The existing HTML-to-GFM converter's tests are the prior art for the table work; they are extended rather than duplicated (D-17).

## Testing Decisions

- A good test asserts the produced Markdown and the observable behaviour of the pipeline, never the internal steps used to produce it.
- The text-layer reader is tested with synthetic PDFs whose expected Markdown is known exactly, covering headings, lists, links, code, reading order, and multi-column pages (D-26).
- The table reconstruction tests cover a wide table, a ragged table, a cell containing a pipe, a table with a duplicated header, and the 45-column fixture that must produce no hallucinated columns (D-27, D-28).
- The sanitizer tests cover de-hyphenation, whitespace normalisation, duplicate header removal, and the structural validator's unbalanced-table and empty-page cases (D-30).
- The front-matter tests assert that the metadata is present in the file, absent from the Preview output, and absent from the copied Markdown (D-29).
- The output-naming test asserts that a Cloud result keeps the same name and folder as a local result (D-29).
- The quality gate is a measured score, not a snapshot: the table-cell accuracy of the fixtures must be at least 98%, and the wide-table fixture must show zero hallucinated columns (D-38).
- Every test runs offline and without a provider key. The Cloud path is exercised through the provider seam's fake implementation, so the same fixtures score the same way locally and in continuous integration (D-23, D-53).
- Fixtures stay tiny and synthetic; anything derived from a real document is compared manually and never committed (D-39).

## Out of Scope

- Improving optical recognition quality for ordinary scanned pages, beyond the column-segment treatment for wide tables.
- Retraining or fine-tuning any model.
- A document editor, annotation, or any authoring feature.
- Changing output naming, the output folder, or the Open Folder behaviour (D-29).
- Tables wider than the geometry path can reconstruct; these are reported by the validator rather than silently approximated.
- Verifying output against a document standard or an accessibility conformance level.
- A second prompt strategy or automatic prompt selection.
- Per-page image extraction beyond what the PDF already embeds.

## Further Notes

- The largest quality win in this programme is not a better model. It is reading the text layer that digital PDFs already contain (D-26).
- The 13-column threshold is a deliberate line: below it the model's transcription is good enough to be cheaper, above it geometry is the only reliable source (D-27).
- Committing the quality fixtures requires an explicit exception to the repository's ignore rules. That approval is requested as part of the slice that adds them (D-39).
- The spike gates the whole pipeline: if the hosted endpoint refuses base64 images, or the cost and latency thresholds fail, the plan changes before the feature is built (D-37, D-38).
