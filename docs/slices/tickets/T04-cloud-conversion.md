## Parent

Spec #3 — Cloud engine.

## What to build

The end-to-end cloud path: a file over the threshold is routed to the cloud engine, sent as five-page bands of page images together with the extracted text layer, converted from HTML tables through the existing converter, and written to disk with the same name and the same folder as a local result, plus provenance metadata. The queue row shows a cloud icon; the Preview shows the document body only.

## Decisions

D-05, D-06, D-08, D-09 (routing, per file, the fifty-megabyte ceiling, one active job), D-15 (five pages per band), D-16 (images and text layer together), D-17 (HTML tables through the existing converter, no bounding-box tags), D-18 (versioned prompt recorded in the output), D-29 (provenance metadata, preview and copy show the body only, naming and folder unchanged), D-32 (cloud icon in the queue row), D-35 (Preview keeps exactly two buttons).

## Acceptance criteria

- [ ] A file over the threshold routes to the cloud engine and a file at or below it stays on the local engine.
- [ ] A file over fifty megabytes is rejected with a clear message.
- [ ] Pages are sent in bands of five, and each request carries the page images and the extracted text layer.
- [ ] The model's HTML tables are converted through the existing converter, so merged cells and ragged rows survive.
- [ ] The result is written with the same naming rule and the same output folder as a local result.
- [ ] The file begins with metadata naming the engine, the model, the prompt version, the page count, and the generation time; the Preview and the copied Markdown exclude it.
- [ ] The queue row shows a small cloud icon whose tooltip names the engine and the model, and the status dot still means status only.
- [ ] The job's runtime file path and size are declared in the frontend job type rather than attached at runtime.
- [ ] The provider seam has a fake implementation, and the end-to-end path is proven through it without a network call.

## Blocked by

T03 — The first cloud job asks consent.
