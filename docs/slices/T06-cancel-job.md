# T06 — The user can cancel a long cloud job

## State snapshot
- Read AGENTS.md first, then docs/slices/HANDOFF-GUIDE.md, docs/slices/DECISIONS.md (D-09, D-20, D-22, D-33, D-34), and docs/slices/STATE.md.
- Read docs/slices/T04-cloud-conversion.md for the conversion path and docs/slices/T05-failure-parking.md for the status, reason, and retry machinery that already exist.
- Last commit: `faad470`.
- Baseline: frontend 765 tests in 53 files, backend 537 passed with one warning, typecheck 0 errors, build success (2183 modules), cargo check clean; measured 2026-11-18 on Windows.
- Issue: #14.
- Open blockers: none. Every automated test uses the fake provider; no test touches the network.

House rules:
- Read AGENTS.md first; it is the source of truth.
- Use PowerShell only for repository commands and py -3.12 for Python.
- TDD is mandatory: RED, then minimal GREEN, then refactor.
- Add no dependency and keep every secret out of code, tests, logs, documents, and commits.
- Run targeted tests during RED/GREEN, then all five gates.

## Goal
A user can stop a cloud job that is taking too long. The local wait stops at once, the result is discarded, the upstream request is aborted as far as the connection allows, and the user is told plainly that the provider may still finish the work and charge for it. The queue row keeps its icon, its truncated name, its size, and its dot-only status slot; a small cancel control appears only while the job can still be cancelled.

## Non-goals
- No spend counter — T11.
- No change to the failure taxonomy, the waiting state, the retry behaviour, or the palette — T05 is done.
- No change to the band rule, the conversion path, or the consent gate.
- No change to the local engine and its recipe.
- No dependency installation.
- No change to the Command Center layout, the TopBar, or the two Preview buttons.

## Locked decisions
- D-09 — one active job overall; a cancelled job leaves the active slot exactly like any other terminal job, and the next FIFO job starts.
- D-20 — the taxonomy is unchanged; a cancelled job is never parked, and a parked job keeps its retry button.
- D-22 — the user can cancel a running job: the local wait stops, the result is discarded, the upstream request is aborted best-effort, and a toast and the job tooltip state that the provider may still finish the work and charge for it.
- D-23 — the provider client stays a seam with a fake; the fake proves the upstream abort and no test touches the network.
- D-33 — the waiting colour and the reason-in-tooltip rule are untouched; a cancelled job reuses an existing dot colour and carries the cost warning in its tooltip.
- D-34 — the shared status set grows by exactly one value, `cancelled`, on the backend and on the frontend; the equality test still passes.

## Baseline
Measured on 2026-11-18 at commit `faad470` on Windows; the final counts are measured on 2026-11-18 after this slice.

| Gate | Before | After |
|---|---|---|
| Frontend tests | 765 passed, 53 files | 776 passed, 56 files |
| Frontend typecheck | 0 errors | 0 errors |
| Frontend build | success, 2183 modules | success, 2184 modules |
| Backend tests | 537 passed, 1 warning | 545 passed, 1 warning |
| Cargo check | clean | clean |
| Slice-document checker | exit 0, 9 documents | exit 0, 10 documents |

T04 delivered the conversion path and the provider seam consumer; T05 delivered the failure taxonomy, the waiting state, the reason, and the retry button. Nothing in this slice changes those.

## Files to touch
- `docs/slices/T06-cancel-job.md` — this execution contract.
- `docs/slices/STATE.md` — the rolling state and the new baseline.
- `src/scan2text/cloud/cancellation.py` — the new module: the cancellation flag, the provider hand-off, the registry, and the typed cancellation error.
- `src/scan2text/cloud/provider.py` — the typed abort error and `abort()` on the provider seam.
- `src/scan2text/cloud/fake_provider.py` — the abortable fake with a blocking mode that proves the upstream abort.
- `src/scan2text/cloud/failure.py` — the retry wrapper forwards the abort and never retries an abort.
- `src/scan2text/cloud/conversion.py` — the cancellation checks between bands and before the write; the written file is removed when the job was cancelled.
- `src/scan2text/models/job.py` — the `cancelled` value on `JobStatus` and on `TaskStatus`.
- `src/scan2text/services/queue_service.py` — the task id reaches the cloud job; a cancelled job records `cancelled` and stops the batch.
- `src/scan2text/api/main.py` — the cancel route, the cancelled task state, and the discarded result.
- `frontend/src/lib/api.ts` — the `cancelled` status, the terminal check, and the cancel call.
- `frontend/src/lib/jobCancellation.ts` — the new helper: when a job can still be cancelled.
- `frontend/src/stores/scan2text.store.ts` — the `cancelled` job status, the cancel action, the toast, and the polling stop.
- `frontend/src/components/layout/panels/QueuePanel.tsx` — the cancel control and the cancelled dot with its tooltip.
- `frontend/src/locales/en.json`, `frontend/src/locales/id.json` — the new strings.
- `tests/unit/cloud/test_job_cancellation.py` — the hermetic RED/GREEN tests for the cancellation path.
- `tests/integration/test_cloud_cancel_routes.py` — the cancel route, the finished task, and the status route.
- `tests/integration/test_cloud_failure_status.py` — the shared status set now carries `cancelled` on both sides.
- `tests/unit/cloud/test_cloud_conversion.py` — the T04 stub accepts the new optional `cancellation` argument.
- `tests/test_api_surface.py` — the worker-busy stub accepts the new optional `task_id` argument.
- `frontend/src/lib/api.waiting.test.ts` — the shared status set now holds seven canonical values.
- `frontend/src/stores/scan2text.store.cancel.test.ts`, `frontend/src/components/layout/panels/QueuePanel.cancel.test.tsx`, `frontend/src/lib/api.cancel.test.ts` — the hermetic frontend RED/GREEN tests.

## Files NOT to touch
- `src/scan2text/adapters/vlm_ocr.py` and `src/scan2text/adapters/ocr_engine.py` — the Local engine and its recipe stay untouched.
- `src/scan2text/cloud/route_decision.py` — the thresholds and the route stay the single authority; this slice imports them.
- `src/scan2text/cloud/default_profile.json` — the Cloud prompt asset and the band rule stay untouched.
- `src/scan2text/services/credential_store.py` — the key boundary is settled.
- `frontend/src/components/layout/CommandCenterLayout.tsx`, `TopBar.tsx`, `BottomStatusBar.tsx` — the locked shell stays unchanged.
- `frontend/src/components/layout/panels/PreviewPanel.tsx`, `MarkdownPreview.tsx` — the Preview keeps its two buttons.
- `frontend/src/components/layout/CloudConsentModal.tsx`, `ConsentGate.tsx`, `frontend/src/stores/consent.store.ts` — the T03 gate is stable.
- `frontend/src/index.css`, `frontend/src/theme/palette-lock.test.ts` — no new colour; the palette stays as T05 left it.
- `docs/slices/DECISIONS.md` — decisions are cited, not changed.
- `pyproject.toml` and `frontend/package.json` — no dependency is added or removed.

## RED tests to write first
- `tests/unit/cloud/test_job_cancellation.py`: `test_cancelling_a_running_cloud_job_stops_the_work_and_marks_the_job_cancelled`, `test_a_cancelled_job_writes_no_file_and_keeps_no_result`, `test_cancelling_aborts_the_upstream_request_through_the_provider_seam`, `test_the_upstream_abort_is_best_effort_and_the_local_state_stays_cancelled`, `test_a_cancelled_job_never_becomes_a_parked_job`.
- `tests/integration/test_cloud_cancel_routes.py`: `test_cancel_route_marks_a_running_task_cancelled`, `test_cancel_route_on_a_finished_task_changes_nothing`, `test_status_route_reports_the_cancelled_status`.
- `tests/integration/test_cloud_failure_status.py`: `test_backend_and_frontend_status_sets_are_equal` — updated so the shared set carries `cancelled` on both sides.
- `frontend/src/stores/scan2text.store.cancel.test.ts`: `test_cancelling_a_running_cloud_job_stops_the_wait_and_frees_the_active_slot`, `test_a_late_poll_does_not_revive_a_cancelled_job`, `test_a_cancelled_job_discards_the_partial_result`, `test_cancelling_a_finished_job_changes_nothing`, `test_a_cancelled_job_is_never_parked_and_keeps_no_retry`, `test_the_cancel_toast_says_the_provider_may_still_finish_and_charge`.
- `frontend/src/components/layout/panels/QueuePanel.cancel.test.tsx`: `test_the_cancel_control_appears_only_for_a_running_cloud_job`, `test_the_cancelled_job_tooltip_says_the_provider_may_still_finish_and_charge`, `test_a_parked_job_keeps_its_retry_button`.
- `frontend/src/lib/api.cancel.test.ts`: `test_cancel_task_posts_to_the_cancel_endpoint`, `test_a_cancelled_status_is_terminal_and_stops_the_polling`.
- Expected count before and after: backend 537 tests to at least 545; frontend 765 tests in 53 files to at least 776 in 56 files. RED runs per named file only; the full suites run only at the verification gate.

## Implementation steps
1. Add `src/scan2text/cloud/cancellation.py`: the cancellation flag with the provider hand-off, the typed cancellation error, and the in-memory registry. Confirm the new unit test file fails to import.
2. Give the provider seam an `abort()` and a typed abort error; make the fake abortable and blocking. Confirm the abort test fails.
3. Forward the abort through the retry wrapper and never retry an abort. Confirm the abort test fails for the right reason.
4. Check the cancellation between bands and before the write in the conversion service; remove a file written for a cancelled job. Confirm the no-file test fails.
5. Record `cancelled` in the queue service and stop the batch. Confirm the queue-level test fails.
6. Add the cancel route and the cancelled task state to the API; discard the result of a cancelled task. Confirm the route tests fail.
7. Add the `cancelled` status to the backend and the frontend status sets and keep the equality test green.
8. Add the cancel action, the toast, and the polling stop to the frontend store. Confirm the store tests fail.
9. Add the cancel control and the cancelled dot with its tooltip to the queue row. Confirm the queue tests fail.
10. Add every new string to both locale files with a `data-testid` on each new testable element.
11. Update STATE.md, the vault summary, 00-Current-State.md, and this document's counts; run all five gates and the checker; commit with the GitHub noreply identity and push.

## Verification commands
- `py -3.12 -m pytest -q --tb=line tests/unit/cloud/test_job_cancellation.py` at the repository root with PYTHONPATH=src — expected targeted cancellation tests pass.
- `py -3.12 -m pytest -q --tb=line tests/integration/test_cloud_cancel_routes.py` — expected targeted cancel-route tests pass.
- `npm.cmd run test -- api.cancel.test.ts scan2text.store.cancel.test.ts QueuePanel.cancel.test.tsx` in frontend/ — expected targeted frontend tests pass.
- `py -3.12 -m pytest -q --tb=line` at the repository root with PYTHONPATH=src — expected 545 passed, 1 warning.
- `npm.cmd run test` in frontend/ — expected 776 passed in 56 files.
- `npm.cmd run typecheck` in frontend/ — expected 0 errors.
- `npm.cmd run build` in frontend/ — expected build success.
- `cargo check --message-format=short` in frontend/src-tauri/ — expected clean.
- `py -3.12 scripts/check_slice_docs.py --all` — expected exit 0 with 10 documents.
- `git diff --check` — expected no whitespace errors; no secret, no fixture, no absolute local path.

## New i18n keys
English and Indonesian files both add `queue.status.cancelled`, `queue.cancel.label`, and `queue.cancel.toast`. The tooltip and the toast say the provider may still finish the work and charge for it; neither claims the provider stopped working. No existing string changes meaning.

## Obsidian update
Write `second-brain/01-Agent-Memory/Phase-S66/slice-T06-CANCEL-JOB.md` with the cancellation path, the abort seam, the discarded result, the cost warning, the test evidence, the gate results, and the handoff notes. Update `second-brain/00-Current-State.md` with one changelog line and the new baseline, moving the oldest entry to `second-brain/01-Agent-Memory/Archive/state-history.md` if the changelog exceeds five entries. The vault is local-only and gitignored.

## Definition of done
- [ ] RED was observed failing for the cancellation path, the discarded result, the upstream abort, the cancel route, the store action, and the queue control, each before its GREEN.
- [ ] A running cloud job can be cancelled from the queue row.
- [ ] Cancelling stops the local wait and frees the active slot; the next FIFO job starts.
- [ ] A partial result is discarded and no file is written for a cancelled job.
- [ ] The upstream request is aborted on a best-effort basis, proven through the provider seam's fake.
- [ ] The local state is correct whether or not the upstream abort succeeds.
- [ ] Cancelling a job that has already finished changes nothing.
- [ ] A cancelled job never turns into a parked job, and a parked job keeps its retry button.
- [ ] The toast and the job tooltip state that the provider may still finish and charge, in English and Indonesian.
- [ ] The queue row keeps its icon, its truncated name, its size, and its dot-only status slot; the cancel control appears only for a job that can still be cancelled.
- [ ] Every new string is in English and Indonesian; every new testable element has a `data-testid`.
- [ ] All five gates and the slice-document checker pass; the new counts are recorded.
- [ ] `docs/slices/STATE.md`, the vault summary, `second-brain/00-Current-State.md`, and this document are updated.
- [ ] The work is committed with the GitHub noreply identity and pushed; no secret is committed.
- [ ] No screenshot is required: the Command Center layout does not change; the owner may still inspect the queue row live.

## Handoff notes
- What now works: a user can cancel a running cloud job from the queue row. The local wait stops at once, the job leaves the active slot, any partial result is discarded, no file is written, and the upstream request is abandoned as far as the connection allows. A toast and the job tooltip say the provider may still finish the work and charge for it.
- The next slice may assume: `src/scan2text/cloud/cancellation.py` owns the cancellation flag, the provider hand-off, and the registry; the provider seam exposes `abort()`; `POST /cancel/{task_id}` marks a running task cancelled and changes nothing for a finished one; the shared status set carries `cancelled` on both sides.
- Still open: spend visibility (T11), geometry tables and column segments (T08, T09), fixtures (T10), handoff docs and ADRs (T12).
- Deferred: the local engine cannot interrupt an inference in progress; the cancel control is offered for a cloud job only.
- Operational risk: the owner must still perform the live provider check with a real key; CI has no key and must stay green.
- Decision note: none changed. D-09, D-20, D-22, D-23, D-33, and D-34 are followed as written; the shared status set gains exactly one value, `cancelled`, on both sides.
