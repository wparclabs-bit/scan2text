# T04 — A file over 8 MB becomes Markdown through the cloud engine

## State snapshot
- Read `AGENTS.md` first, then `docs/slices/HANDOFF-GUIDE.md`, `docs/slices/DECISIONS.md` (D-04, D-05, D-06, D-08, D-09, D-12, D-15 as amended, D-16, D-17, D-18, D-23, D-29, D-32, D-35), and `docs/slices/STATE.md`.
- Read `docs/slices/T03-consent-gate.md` for the consent gate and the routing API, and `docs/slices/T01-provider-spike.md` for the measured figures.
- Committed as the T04 commit recorded at the foot of this document.
- Baseline at the start: frontend 741 tests in 46 files, typecheck 0 errors, build success (2176 modules), backend 496 passed with one warning, cargo check clean; measured 2026-11-15 on Windows at commit `8ad9235`.
- Final result: implemented and green; the final counts are recorded in the GREEN evidence section.
- Open blockers: none. Every automated test uses the fake provider and no test calls the network. The sandbox cannot remove its own temporary tree, so the repository's `tmp_path`-based backend tests cannot all run here; continuous integration has a normal temporary directory.
- Issue: #12.

House rules:
- Read `AGENTS.md` first; it is the source of truth.
- Use PowerShell only for repository commands and `py -3.12` for Python.
- TDD is mandatory: RED, then minimal GREEN, then refactor.
- Add no dependency and keep every secret out of code, tests, logs, documents, and commits.
- Run targeted tests during RED/GREEN, then all five gates.

## Goal
A user drops a document above the local threshold, accepts consent once, and the document comes back as Markdown written to disk with the same name and in the same folder as a local result. The file begins with a metadata block that names the engine, the model, the prompt version, the page count, and the generation time. The queue row shows a small cloud icon whose tooltip names the engine and the model, while the status dot still means status only. The Preview panel and the copied Markdown show the document, not the bookkeeping. A file above 50 MB is refused with a clear message before anything is sent.

## Non-goals
- No failure parking, no cancel of a running job, no spend counter — T05, T06, T11.
- No geometry tables, no column segments, no sanitizer, no committed fixtures — T08, T09, T10.
- No change to the Local engine and its recipe.
- No local model name in the interface.
- No dependency installation.
- No native PDF upload to the provider.
- No provider preset beyond one OpenAI-compatible endpoint, and no hard spending cap.
- No change to the Command Center layout, the TopBar, or the two Preview buttons.

## Locked decisions
- D-04 — each Profile carries its own Recipe; the Cloud recipe is temperature 0.6, top_p 0.95, thinking disabled.
- D-05 — files over 8 MB route to the Cloud engine; files at or below 8 MB stay Local.
- D-06 — routing is decided per file, never per batch.
- D-08 — the Cloud engine accepts files up to 50 MB; anything larger is rejected with a clear message.
- D-09 — one active job overall; a Cloud job occupies the queue slot exactly like a Local job, first in first out.
- D-12 — consent is granted once per session at the first Cloud job and governs the send.
- D-15 (amended) — a Band is five consecutive 150 DPI full pages in one request; a table of twelve or fewer columns is transcribed from the page image inside the page band; a table of thirteen or more columns is never sent to the model and is recorded as awaiting the geometry path (T08).
- D-16 — one request carries the page images and the extracted text layer together.
- D-17 — the prompt asks for HTML tables; the existing converter produces the final Markdown; no bounding-box image tag is ever requested or trusted.
- D-18 — the prompt is a versioned asset inside the Profile; the version is recorded in the output metadata.
- D-23 — the provider client is a seam with a fake implementation; no test touches the network.
- D-29 — Cloud output carries YAML front matter: engine, model, prompt version, page count, generation timestamp; the Preview strips it and "Copy Markdown" copies the body without it.
- D-32 — a Cloud job shows a small icon-only cloud glyph in the queue row with a tooltip naming the engine and the model; the status dot keeps status meanings only.
- D-35 — the Preview header keeps exactly two buttons; provenance lives in the queue tooltip and in the Markdown file.

## Baseline
Measured on 2026-11-15 at commit `8ad9235` on Windows; the final counts are measured on 2026-11-16 after this slice.

| Gate | Before | After |
|---|---|---|
| Frontend tests | 741 passed, 46 files | 751 passed, 50 files |
| Frontend typecheck | 0 errors | 0 errors |
| Frontend build | success, 2176 modules | success, 2183 modules |
| Backend tests | 496 passed, 1 warning | 514 passed, 1 warning |
| Cargo check | clean | clean |
| Slice-document checker | exit 0, 5 documents | exit 0, 6 documents |

T03 delivered the routing authority, the consent store, the consent modal, and the raised input cap. The provider seam, its fake, the Profile, and the credential store came from T02. Nothing has ever been sent to the provider: T04 sends pages for the first time.

RED evidence, recorded before each GREEN:
- Backend: `tests/unit/cloud/test_cloud_conversion.py` and `tests/integration/test_cloud_convert_routes.py` failed 9 of 18 on the first run — the output path was never resolved, the prompt still asked for no markup wording the test forbids, the convert route answered 502, and the two status tests drove `_run_processing` with the bare app instead of a real queue.
- Frontend: the five targeted files failed 7 of 33 with the implementation reverted — the job interface declared no file facts, the Preview and the copy action kept the provenance block, the queue row had no cloud icon and the status tooltip had no test id, and the process call carried no consent flag.
- GREEN: 18 of 18 backend tests in the two T04 modules, 33 of 33 frontend tests in the five T04 files, then the five gates above.

## Files to touch
- `docs/slices/T04-cloud-conversion.md` — this execution contract.
- `docs/slices/STATE.md` — the rolling state and the new baseline.
- `src/scan2text/cloud/conversion.py` — page rendering at 150 DPI, the text layer, the five-page band, the one request, the reply parser, the metadata block, and the write.
- `src/scan2text/cloud/service.py` — the Cloud conversion entry point that refuses to send without consent.
- `src/scan2text/cloud/routes_convert.py` — the convert route and its consent rejection.
- `src/scan2text/cloud/default_profile.json` — the versioned Cloud prompt asset, now asking explicitly for HTML tables and forbidding bounding-box tags (D-17, D-18).
- `src/scan2text/services/queue_service.py` — route each file by `decide_route`; a file above the threshold executes the Cloud path, one active job, first in first out.
- `src/scan2text/api/main.py` — the app-state Cloud conversion dependency; the existing `/process` payload gains the consent flag.
- `tests/unit/cloud/test_cloud_conversion.py`, `tests/integration/test_cloud_convert_routes.py` — hermetic RED/GREEN tests.
- `frontend/src/stores/scan2text.store.ts` — `engine`, `cloudModelId`, `filePath`, and `metaSize` declared on the job type.
- `frontend/src/components/layout/panels/QueuePanel.tsx` — the cloud icon and its engine-and-model tooltip.
- `frontend/src/components/layout/panels/PreviewPanel.tsx` — the Preview body and the copy action both strip the metadata block.
- `frontend/src/components/layout/panels/MarkdownPreview.tsx` — strip the metadata block from the rendered body.
- `frontend/src/lib/markdownProvenance.ts` — the one front-matter stripping helper.
- `frontend/src/lib/api.ts` — the consent flag on the process call.
- `frontend/src/hooks/useCloudRequirement.ts` — reads the declared job fields instead of casting them.
- `frontend/src/locales/en.json`, `frontend/src/locales/id.json` — the new strings.

## Files NOT to touch
- `src/scan2text/adapters/vlm_ocr.py` and `src/scan2text/adapters/ocr_engine.py` — the Local engine and its recipe stay untouched.
- `src/scan2text/cloud/provider.py`, `src/scan2text/cloud/fake_provider.py`, `src/scan2text/cloud/capability.py` — the T02 seam is stable; T04 consumes it.
- `src/scan2text/cloud/route_decision.py` — the thresholds are the single authority; T04 imports them, never copies them.
- `src/scan2text/services/credential_store.py` — the key boundary is settled; no key is read outside the Cloud service.
- `src/scan2text/services/pdf_service.py` — its 150 DPI renderer is reused as written; the cap stays at the 50 MB ceiling.
- `frontend/src/components/layout/CommandCenterLayout.tsx`, `TopBar.tsx`, `BottomStatusBar.tsx` — the locked shell stays unchanged.
- `frontend/src/components/layout/CloudConsentModal.tsx`, `ConsentGate.tsx`, `frontend/src/stores/consent.store.ts` — the T03 gate is stable; T04 proves it still governs the send.
- `docs/slices/DECISIONS.md` — decisions are cited, not changed.
- `pyproject.toml` and `frontend/package.json` — no dependency is added or removed.

## RED tests to write first
- `tests/unit/cloud/test_cloud_conversion.py`: `test_file_above_the_threshold_routes_to_the_cloud_engine_and_one_at_or_below_stays_local`, `test_pages_are_sent_in_bands_of_five_150_dpi_page_images_with_the_extracted_text_layer`, `test_model_html_tables_are_converted_through_the_existing_gfm_converter_keeping_merged_cells_and_ragged_rows`, `test_written_file_starts_with_the_metadata_block_naming_engine_model_prompt_version_page_count_and_generation_time`, `test_written_file_name_and_output_folder_match_the_local_naming_rule`, `test_a_file_above_fifty_megabytes_is_rejected_with_a_clear_message`, `test_a_band_never_sends_300_dpi_table_crops`, `test_a_table_with_thirteen_or_more_columns_is_not_sent_to_the_model_and_is_recorded_as_awaiting_geometry`, `test_cloud_conversion_refuses_to_send_without_consent`, `test_the_recipe_keeps_temperature_0_6_top_p_0_95_and_thinking_disabled`, `test_the_prompt_requests_html_tables_and_never_bounding_box_tags`.
- `tests/integration/test_cloud_convert_routes.py`: `test_convert_route_returns_the_written_file_metadata_and_engine`, `test_convert_route_refuses_without_consent_and_sends_nothing`, `test_convert_route_rejects_a_file_above_the_ceiling`.
- `frontend/src/components/layout/panels/QueuePanel.engine.test.tsx`: `test_queue_row_shows_the_cloud_icon_with_a_tooltip_naming_the_engine_and_the_model`, `test_status_dot_keeps_status_meaning_and_never_names_the_engine`.
- `frontend/src/lib/markdownProvenance.test.ts`: `test_front_matter_is_stripped_from_the_preview_body`, `test_a_horizontal_rule_later_in_the_body_is_not_truncated`.
- `frontend/src/components/layout/panels/PreviewPanel.provenance.test.tsx`: `test_preview_panel_excludes_the_metadata_block`, `test_copied_markdown_excludes_the_metadata_block`.
- `frontend/src/stores/scan2text.store.filefacts.test.ts`: `test_job_type_declares_the_file_path_and_the_file_size`, `test_add_job_stores_the_declared_file_path_and_size`.
- `frontend/src/lib/api.test.ts`: `test_upload_file_sends_the_cloud_consent_flag_when_granted`.
- Expected count before and after: backend 496 tests to at least 510 tests; frontend 741 tests in 46 files to at least 750 tests in 50 files. RED runs per named file only; the full suites run only at the verification gate.

## Implementation steps
1. Write `src/scan2text/cloud/conversion.py`: `CLOUD_EXECUTION_BAND_SIZE = 5`, `CLOUD_PAGE_DPI = 150`, `WIDE_TABLE_COLUMN_LIMIT = 12`, the page asset with its PNG bytes and extracted text, `build_band_request`, the band walk, the reply parser that calls the existing `convert_html_tables_to_gfm`, the metadata block, and the write through `PathService.resolve_output_path`. Confirm the named unit tests fail.
2. Add the Cloud conversion entry point to `src/scan2text/cloud/service.py` that refuses to send unless consent was granted. Confirm the consent test fails.
3. Expose the convert route in `src/scan2text/cloud/routes.py` returning the written path and the metadata, and rejecting an over-ceiling file and a consent-less request. Confirm the named route tests fail.
4. Route each file in `QueueService.process_image_paths` by `decide_route`: above the threshold executes the Cloud path, at or below it keeps the Local path, one active job, first in first out. Confirm the routing test fails.
5. Point the Cloud prompt asset at the D-17 wording: HTML tables, no bounding-box tags. Keep temperature 0.6, top_p 0.95, and thinking disabled as measured. Confirm the recipe and prompt tests fail.
6. Declare `engine`, `cloudModelId`, `filePath`, and `metaSize` on the frontend job type and set them in `addJob`, removing the runtime casts. Confirm the store tests fail.
7. Add the one `stripProvenanceFrontMatter` helper and use it in both the Preview body and the copy action. Confirm the provenance tests fail.
8. Add the cloud icon and its engine-and-model tooltip to the queue row, keeping the status dot status-only. Confirm the queue tests fail.
9. Add the consent flag to the process call. Confirm the api test fails.
10. Update both locale files, the rolling state, this document's final counts, the vault summary, and `00-Current-State.md`; run all five gates and the checker; commit with the GitHub noreply email and push.

## Verification commands
- `py -3.12 -m pytest -q --tb=line tests/unit/cloud/test_cloud_conversion.py` at the repository root with `PYTHONPATH=src` — expected targeted Cloud conversion tests pass.
- `py -3.12 -m pytest -q --tb=line tests/integration/test_cloud_convert_routes.py` — expected targeted convert-route tests pass.
- `npm.cmd run test -- QueuePanel.engine.test.tsx markdownProvenance.test.ts PreviewPanel.provenance.test.tsx scan2text.store.filefacts.test.ts api.test.ts` in `frontend/` — expected targeted frontend tests pass.
- `py -3.12 -m pytest -q --tb=line` at the repository root with `PYTHONPATH=src` — expected 496 plus the new tests passed, 1 warning.
- `npm.cmd run test` in `frontend/` — expected at least 750 passed in at least 50 files.
- `npm.cmd run typecheck` in `frontend/` — expected 0 errors.
- `npm.cmd run build` in `frontend/` — expected build success.
- `cargo check --message-format=short` in `frontend/src-tauri/` — expected clean.
- `py -3.12 scripts/check_slice_docs.py --all` — expected exit 0 with 6 documents.
- `git diff --check` — expected no whitespace errors; the staged diff carries no key, no secret, no fixture, and no absolute local path.

## New i18n keys
English and Indonesian files both add `queue.engine.cloud` and `queue.engine.tooltip`; the tooltip interpolates the model id. Both files also add `errors.fileAboveCeiling` for the 50 MB rejection message. No existing string changes meaning.

## Obsidian update
Write `second-brain/01-Agent-Memory/Phase-S66/slice-T04-CLOUD-CONVERSION.md` with the band rule, the consent gate proof, the metadata block, the naming and folder rule, the frontend engine facts, the test evidence, the gate results, and the handoff notes. Update `second-brain/00-Current-State.md` with one changelog line and the new baseline, moving the oldest entry to `second-brain/01-Agent-Memory/Archive/state-history.md` if the changelog exceeds five entries. The vault is local-only and gitignored.

## Definition of done
- [x] RED was observed failing for the conversion module, the consent refusal, the route, the queue routing, the store facts, the provenance strip, the queue icon, and the api flag, each before its GREEN.
- [x] A file above 8 MB routes to the Cloud engine and a file at or below it stays Local.
- [x] Pages travel in bands of five 150 DPI page images together with the extracted text layer, in one request per band.
- [x] No band of 300 DPI table crops is ever sent.
- [x] A table of thirteen or more columns is not sent to the model and is recorded as awaiting the geometry path.
- [x] The model's HTML tables are converted through the existing converter; merged cells and ragged rows survive.
- [x] The written file begins with the metadata block naming engine, model, prompt version, page count, and generation time.
- [x] The file name and the output folder match the local naming rule exactly; no file is overwritten.
- [x] A file above 50 MB is rejected with a clear message before any request.
- [x] A Cloud job cannot execute unless consent was granted, and the T03 gate still governs the send.
- [x] One active job overall; a Cloud job occupies the queue slot and first-in first-out order holds.
- [x] The queue row shows the cloud icon with a tooltip naming the engine and the model; the status dot still means status only.
- [x] The Preview panel and the copied Markdown exclude the metadata block.
- [x] The job type declares the file path and the file size instead of attaching them at runtime.
- [x] Every new string is in English and Indonesian; every new testable element has a `data-testid`.
- [x] All five gates and the slice-document checker pass; the new counts are recorded.
- [x] `docs/slices/STATE.md`, the vault summary, `second-brain/00-Current-State.md`, and this document are updated.
- [x] The work is committed with the GitHub noreply identity and pushed; no secret is committed.
- [x] No screenshot is required: the Command Center layout does not change; the owner may still inspect the queue row and the consent modal live.

## Handoff notes
- What now works: a document above the local threshold is rendered at 150 DPI, banded five pages at a time, and sent with its extracted text layer in one request per band; the reply's HTML tables become Markdown through the existing converter; the result is written beside local results with the same naming rule and begins with a metadata block naming the engine, the model, the prompt version, the page count, and the generation time; the queue row shows a cloud icon naming the engine and model; the Preview and the copy action show the body only.
- The next slice may assume: `src/scan2text/cloud/conversion.py` owns the band rule, the 150 DPI render, the consent refusal, the metadata block, and the write; the convert route returns the written path plus the metadata; the frontend job declares `engine`, `cloudModelId`, `filePath`, and `metaSize`; `stripProvenanceFrontMatter` is the one front-matter stripper.
- Still open: failure parking (T05), cancel (T06), geometry tables and column segments (T08, T09), fixtures (T10), spend visibility (T11).
- Deferred: a wide table is recorded as awaiting the geometry path and is not transcribed; T08 must consume that record.
- Cleanup note: `src/scan2text/api/main.py` reads `cloud_service._profiles`, `cloud_service._credentials`, and `cloud_service._provider_factory` to build the conversion service. It works and the tests cover it, but those are private attributes of the T02 service; a later slice should expose them as public accessors instead.
- Cleanup note: the frontend sends the batch consent as `consent_granted` in the `/process` payload, the field the T03 backend already reads. The queue row falls back to the Profile's model id when a job carries no model of its own, so a profile read happens only while a Cloud job without a known model is on screen.
- Operational risk: the owner must still perform the live provider check with a real key outside the repository; CI has no key and must stay green.
- Decision note: none changed. D-15 and D-38 were already amended on T01 evidence, and T04 follows the amended rule.
