# T05 — A provider failure parks the job with a reason and a retry

## State snapshot
- Read AGENTS.md first, then docs/slices/HANDOFF-GUIDE.md, docs/slices/DECISIONS.md (D-20, D-21, D-23, D-33, D-34), and docs/slices/STATE.md.
- Read docs/slices/T04-cloud-conversion.md for the conversion path, the provider seam, and the job fields that already exist.
- Last commit: `4c72ed4`.
- Baseline: frontend 751 tests in 50 files, backend 514 passed with one warning, typecheck 0 errors, build success (2176 modules), cargo check clean; measured 2026-11-16 on Windows.
- Issue: #13.
- Open blockers: none. Every automated test uses the fake provider and no test touches the network.

House rules:
- Read AGENTS.md first; it is the source of truth.
- Use PowerShell only for repository commands and py -3.12 for Python.
- TDD is mandatory: RED, then minimal GREEN, then refactor.
- Add no dependency and keep every secret out of code, tests, logs, documents, and commits.
- Run targeted tests during RED/GREEN, then all five gates.

## Goal
A provider problem never wastes the user's money and never silently changes engines. A rejected key, a forbidden request, or an exhausted quota fails at once with a specific message and a way to fix the key. A rate limit, a server error, or a timeout retries three times with backoff and jitter and then parks the job. A dead network parks the job. A document that runs past thirty minutes parks with a retry button. A parked job shows one waiting state whose reason is a short human sentence in its tooltip, in English and Indonesian, with a retry action that resumes the same job.

## Non-goals
- No cancel of a running job — T06.
- No spend counter — T11.
- No geometry tables, column segments, sanitizer, or committed fixtures — T08, T09, T10.
- No change to the conversion path itself, the band rule, the local engine, or its recipe.
- No dependency installation.
- No change to the Command Center layout, the TopBar, or the two Preview buttons.
- The engine never changes on its own; no test asserts a fallback to another engine.

## Locked decisions
- D-20 — Failure taxonomy: 401, 403, and quota errors fail fast with a specific message and a fix-key action; 429, 5xx, and timeouts retry three times with backoff and jitter then park; a dead network parks. The engine never changes on its own.
- D-21 — Polling is status-driven: poll until terminal, keep the existing health guard and backoff, one document has a 30-minute ceiling, hitting it parks with a retry button.
- D-23 — The provider client is a seam with a fake implementation; no test touches the network.
- D-33 — One new waiting colour, warm amber-brown `#B45309`, matte. The reason lives in the tooltip in both locales. The token joins the palette lock test and the palette section of AGENTS.md.
- D-34 — One new status value `waiting` with a reason field on backend and frontend. Backend gains error codes for rate limited, network unavailable, and provider unauthorized. The `skipped` mismatch between backend and frontend is fixed; the two status sets are asserted equal.

## Baseline
Measured on 2026-11-16 at commit `4c72ed4` on Windows.

| Gate | Before | After |
|---|---|---|
| Frontend tests | 751 passed, 50 files | 763 passed, 53 files |
| Frontend typecheck | 0 errors | 0 errors |
| Frontend build | success, 2176 modules | success, 2183 modules |
| Backend tests | 514 passed, 1 warning | 529 passed, 1 warning |
| Cargo check | clean | clean |
| Slice-document checker | exit 0, 6 documents | exit 0, 7 documents |

GREEN evidence: 12 of 12 taxonomy tests, then 3 of 3 status tests, then 42 targeted frontend tests; the five gates above; the checker exited 0 with seven valid documents. RED evidence: `ModuleNotFoundError: No module named 'scan2text.cloud.failure'` and `ImportError: cannot import name 'TaskStatus'` on the first backend run, then the frontend status-set test failing until `TASK_STATUSES` was declared. The existing error-code lock test was updated for the eight new `ErrorCode` values.

T04 delivered the band rule, the conversion service, the provider seam consumer, the declared job facts, and the consent flag. Nothing in this slice changes those.

## Files to touch
- `docs/slices/T05-failure-parking.md` — this execution contract.
- `docs/slices/STATE.md` — the rolling state and new baseline.
- `src/scan2text/models/errors.py` — new ErrorCode values for the taxonomy and the ceiling.
- `src/scan2text/models/job.py` — canonical `TaskStatus` set (queued, processing, completed, failed, waiting, skipped) and `WAITING` on `JobStatus`.
- `src/scan2text/cloud/failure.py` — the taxonomy: `FailureCause`, `ProviderFailure`, `ProviderParkedError`, `classify_failure`, `RetryingProviderClient` with backoff and jitter.
- `src/scan2text/cloud/provider.py` — exception types for forbidden, quota, rate limit, server error, and network; HTTP and network mapping in `OpenAICompatibleProviderClient.complete`.
- `src/scan2text/cloud/fake_provider.py` — scriptable failure modes for every taxonomy cause and an attempt counter.
- `src/scan2text/cloud/conversion.py` — wrap the provider client with the retry taxonomy in `CloudConversionService.convert`; raise typed parked/failed errors.
- `src/scan2text/cloud/service.py` — public accessors for the profile, credential, and provider factory dependencies.
- `src/scan2text/cloud/routes_convert.py` — map the typed failure errors to HTTP responses; consume the public accessors.
- `src/scan2text/services/queue_service.py` — a parked Cloud job records `waiting`, `reason`, and `error_code` in the job result; a fast-fail records a specific message.
- `src/scan2text/api/main.py` — use `TaskStatus`, propagate `waiting`/`reason`/`error_code` into `/status`, use the public accessors, apply the ceiling at the task.
- `tests/unit/cloud/test_failure_taxonomy.py` — hermetic RED/GREEN tests for the taxonomy, retries, backoff, and no-retry proof.
- `tests/integration/test_cloud_failure_status.py` — waiting status route, status-set equality, ceiling.
- `frontend/src/lib/api.ts` — `reason` on the status response, `WaitingTaskStatusResponse`, `isTaskWaiting`, status-driven polling, exported `TASK_STATUSES`.
- `frontend/src/stores/scan2text.store.ts` — `waiting` job status, `reason`, ceiling, waiting handling in the poll loop, retry resumes the same job.
- `frontend/src/components/layout/panels/QueuePanel.tsx` — the waiting dot, the reason tooltip, and the retry button.
- `frontend/src/index.css` — the matte warm amber-brown waiting token.
- `frontend/src/theme/palette-lock.test.ts` — the waiting colour lock.
- `frontend/src/lib/api.waiting.test.ts`, `frontend/src/stores/scan2text.store.waiting.test.ts`, `frontend/src/components/layout/panels/QueuePanel.waiting.test.tsx` — hermetic frontend RED/GREEN tests.
- `frontend/src/locales/en.json`, `frontend/src/locales/id.json` — the new strings.

## Files NOT to touch
- `src/scan2text/adapters/vlm_ocr.py` and `src/scan2text/adapters/ocr_engine.py` — the Local engine and its recipe stay untouched.
- `src/scan2text/cloud/route_decision.py` — the thresholds are the single authority; this slice imports them.
- `src/scan2text/cloud/capability.py` — the connection test is stable; the taxonomy wraps conversion only.
- `src/scan2text/services/credential_store.py` — the key boundary is settled.
- `src/scan2text/services/pdf_service.py` — the 150 DPI renderer is reused as written.
- `frontend/src/components/layout/CommandCenterLayout.tsx`, `TopBar.tsx`, `BottomStatusBar.tsx` — the locked shell stays unchanged.
- `frontend/src/components/layout/CloudConsentModal.tsx`, `ConsentGate.tsx`, `frontend/src/stores/consent.store.ts` — the T03 gate is stable.
- `frontend/src/components/layout/panels/PreviewPanel.tsx`, `MarkdownPreview.tsx`, `frontend/src/lib/markdownProvenance.ts` — the Preview stays unchanged.
- `docs/slices/DECISIONS.md` — decisions are cited, not changed.
- `pyproject.toml` and `frontend/package.json` — no dependency is added or removed.

## RED tests to write first
- `tests/unit/cloud/test_failure_taxonomy.py`: `test_rejected_key_fails_on_first_attempt_with_a_specific_message_and_no_retry`, `test_forbidden_request_fails_on_first_attempt_with_a_specific_message_and_no_retry`, `test_exhausted_quota_fails_on_first_attempt_with_a_specific_message_and_no_retry`, `test_rate_limit_retries_three_times_then_parks`, `test_server_error_retries_three_times_then_parks`, `test_timeout_retries_three_times_then_parks`, `test_dead_network_parks_without_failing`, `test_retries_use_backoff_and_jitter`, `test_parked_error_carries_reason_and_error_code`, `test_a_parked_job_never_switches_engine`.
- `tests/integration/test_cloud_failure_status.py`: `test_waiting_status_route_returns_reason_and_error_code`, `test_backend_and_frontend_status_sets_are_equal`, `test_document_ceiling_parks_the_task`.
- `frontend/src/lib/api.waiting.test.ts`: `test_is_task_waiting_recognises_the_waiting_status`, `test_polling_stops_at_a_waiting_terminal_state`, `test_waiting_reason_is_exposed_on_the_response`.
- `frontend/src/stores/scan2text.store.waiting.test.ts`: `test_a_waiting_poll_sets_the_waiting_status_and_reason`, `test_retry_of_a_parked_job_resumes_the_same_job`, `test_document_ceiling_parks_the_job`, `test_waiting_is_not_a_terminal_transition_blocker`.
- `frontend/src/components/layout/panels/QueuePanel.waiting.test.tsx`: `test_waiting_dot_uses_the_matte_amber_brown_colour`, `test_waiting_tooltip_shows_the_reason_sentence_in_english_and_indonesian`, `test_waiting_row_shows_a_retry_button`.
- `frontend/src/theme/palette-lock.test.ts`: `test_waiting_colour_is_registered_as_matte_amber_brown`.
- Expected count before and after: backend 514 tests to at least 529; frontend 751 tests in 50 files to at least 764 in 55 files. RED runs per named file only; full suites run only at the verification gate.

## Implementation steps
1. Extend the fake provider with every taxonomy mode and an attempt counter, and the real provider with typed exceptions and HTTP/network mapping. Confirm the taxonomy tests fail.
2. Add `failure.py` with `FailureCause`, the typed errors, `classify_failure`, and `RetryingProviderClient` (three retries with backoff and jitter). Confirm retry and no-retry tests fail.
3. Wrap the client in `CloudConversionService.convert` and raise typed parked/failed errors. Confirm the conversion and status tests fail.
4. Add the `waiting` status, reason, and error codes to the backend models, queue service, and `/status` route; apply the ceiling. Confirm the status tests fail.
5. Add public accessors to `CloudService` and switch `main.py` and the convert route to them. Keep existing tests green.
6. Add the frontend `waiting` status, reason, status-driven polling, ceiling, and retry-resumes in `api.ts` and the store. Confirm the frontend tests fail.
7. Add the waiting dot colour, tooltip reason sentence, retry button, and the palette lock token. Confirm the palette and queue tests fail.
8. Add every new string to both locale files with a `data-testid` on each new testable element.
9. Update STATE.md, the vault summary, 00-Current-State.md, and this document's counts; run all five gates and the checker; commit with the GitHub noreply identity and push.

## Verification commands
- `py -3.12 -m pytest -q --tb=line tests/unit/cloud/test_failure_taxonomy.py` at the repository root with PYTHONPATH=src — expected taxonomy tests pass.
- `py -3.12 -m pytest -q --tb=line tests/integration/test_cloud_failure_status.py` — expected status tests pass.
- `npm.cmd run test -- api.waiting.test.ts scan2text.store.waiting.test.ts QueuePanel.waiting.test.tsx palette-lock.test.ts` in frontend/ — expected targeted frontend tests pass.
- `py -3.12 -m pytest -q --tb=line` at the repository root with PYTHONPATH=src — expected 514 plus the new tests passed, 1 warning.
- `npm.cmd run test` in frontend/ — expected at least 764 passed in at least 55 files.
- `npm.cmd run typecheck` in frontend/ — expected 0 errors.
- `npm.cmd run build` in frontend/ — expected build success.
- `cargo check --message-format=short` in frontend/src-tauri/ — expected clean.
- `py -3.12 scripts/check_slice_docs.py --all` — expected exit 0 with 7 documents.
- `git diff --check` — expected no whitespace errors; no secret, no fixture, no absolute local path.

## New i18n keys
English and Indonesian files both add `queue.status.waiting`, `queue.waiting.retry`, `queue.waiting.reason.network`, `queue.waiting.reason.rateLimited`, `queue.waiting.reason.serverError`, `queue.waiting.reason.timeout`, `queue.waiting.reason.ceiling`, `errors.providerUnauthorized`, `errors.providerForbidden`, `errors.providerQuota`, and `errors.fixApiKey`. No existing string changes meaning.

## Obsidian update
Write `second-brain/01-Agent-Memory/Phase-S66/slice-T05-FAILURE-PARKING.md` with the taxonomy, the retry proof, the waiting status and reason, the ceiling, the public accessors, the test evidence, the gate results, and handoff notes. Update `second-brain/00-Current-State.md` with one changelog line and the new baseline, moving the oldest entry to `second-brain/01-Agent-Memory/Archive/state-history.md` if the changelog exceeds five entries. The vault is local-only and gitignored.

## Definition of done
- [x] RED was observed failing for the taxonomy, the waiting status, the status-set equality, the ceiling, the frontend waiting handling, and the palette colour, each before its GREEN.
- [x] A rejected key, a forbidden request, and an exhausted quota each fail on the first attempt with a specific message and a fix-key action, and no retry is attempted.
- [x] A rate limit, a server error, and a timeout each retry three times with backoff and jitter and then park the job.
- [x] A dead network parks the job instead of failing it.
- [x] A parked job exposes a retry action and its reason in the tooltip, in English and Indonesian.
- [x] A retry of a parked job resumes the job rather than starting a second one.
- [x] A document over thirty minutes parks with a retry button.
- [x] The backend and frontend expose exactly the same status values and a test asserts equality.
- [x] One new matte warm amber-brown colour is registered in the palette lock and AGENTS.md; no existing colour changed meaning.
- [x] The reason is a short human sentence, never a raw status code.
- [x] Polling is status-driven with the health guard, backoff, and the ceiling.
- [x] The conversion route uses public accessors of the cloud service.
- [x] Every new string is in English and Indonesian; every new testable element has a `data-testid`.
- [x] All five gates and the slice-document checker pass; the new counts are recorded.
- [x] STATE.md, the vault summary, and 00-Current-State.md are updated.
- [x] The work is committed with the GitHub noreply identity and pushed; no secret is committed.

## Handoff notes
- What now works: provider failures are honest. Auth and quota problems fail fast with a fix-key message; rate limits, server errors, and timeouts retry three times with backoff and jitter then park; a dead network and a thirty-minute document park the job. A parked job shows one waiting dot in matte amber-brown with a short reason sentence and a retry button that resumes the same job.
- The next slice may assume: `src/scan2text/cloud/failure.py` owns the taxonomy and the retry wrapper; the `/status` route returns `waiting`, `reason`, and `error_code`; `TASK_STATUSES` is the shared set asserted equal; `CloudService` exposes public accessors for its dependencies.
- Still open: cancel (T06), spend visibility (T11), text layer (T07), geometry tables and column segments (T08, T09), fixtures (T10).
- Deferred: no automatic provider failover — an engine never changes on its own.
- Operational risk: the owner must still perform the live provider check with a real key; CI has no key and must stay green.
- Decision note: none changed. D-20, D-21, D-23, D-33, and D-34 are followed as written.
