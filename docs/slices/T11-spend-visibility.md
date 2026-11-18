# T11 — Spend is visible

## State snapshot
- Read `AGENTS.md` first, then `docs/slices/HANDOFF-GUIDE.md`, `docs/slices/DECISIONS.md` (D-19, D-23, D-24, D-36), and `docs/slices/STATE.md`.
- Read `docs/slices/T01-provider-spike.md` for the measured figures and `docs/slices/T02-cloud-profile.md` for the Profile and its connection test.
- Last commit: `aef9b80`.
- Baseline at the start: frontend 776 tests in 56 files, typecheck 0 errors, build success (2184 modules), backend 545 passed with one warning, cargo check clean; measured 2026-11-18 on Windows.
- Final result: implemented and green. Backend 545 tests; frontend 787 tests in 58 files; typecheck 0 errors; build 2186 modules; cargo clean; slice-document checker exit 0 with 11 documents.
- Open blockers: none. The owner supplies the real key outside the repository; all automated tests use fakes and make no network call.

House rules:
- Read `AGENTS.md` first; it is the source of truth.
- Use PowerShell only for repository commands and `py -3.12` for Python.
- TDD is mandatory: RED, then minimal GREEN, then refactor.
- Add no dependency and keep every secret out of code, tests, logs, documents, and commits.
- Run targeted tests during RED/GREEN, then all five gates.

## Goal
A user can see what the Cloud engine is costing before any document is sent and can watch the estimated cost accumulate for the current application session. The consent dialog keeps every existing fact and adds an estimate derived from the Profile's measured token figures and published rates. The Cloud section of Settings shows the session total. The counter is memory only, starts at zero when the application starts, and never stops, delays, or fails a job.

## Non-goals
- No hard spending cap and no test that expects a job to stop because of cost.
- No spending dashboard, chart, historical report, per-day view, or per-model breakdown.
- No persistence of the counter and no browser-storage write.
- No cancellation behaviour; that is T06.
- No change to the conversion path, failure taxonomy, consent gate, band rule, or provider seam.
- No dependency installation and no live provider call from an automated test.
- No change to the Command Center layout, TopBar, BottomBar, or the two Preview buttons.

## Locked decisions
- D-19 — the connection test proves capability and reports a per-document estimate backed by measured Profile figures.
- D-23 — the provider client remains a seam with a fake; no test touches the network.
- D-24 — cost is visible before sending and through a per-session counter; there is no hard dollar cap.
- D-36 — one aggregated batch message carries the routing facts; this slice adds the estimate without removing any existing fact.

## Baseline
Measured on 2026-11-18 at commit `aef9b80` on Windows.

| Gate | Result |
|---|---|
| Frontend tests | 776 passed, 56 files |
| Frontend typecheck | 0 errors |
| Frontend build | success, 2184 modules |
| Backend tests | 545 passed, 1 warning |
| Cargo check | clean |
| Slice-document checker | exit 0, 10 documents |

T01 measured one 150 DPI page inside a five-page band at 2167 prompt tokens and 381 completion tokens. At the highest published serverless rates, a thirty-page document costs about `$0.019`. The T02 Profile already carries those measured figures and the two published rates. T11 derives the shown estimate from those Profile fields; no rate is a literal in product code.

## Files to touch
- `docs/slices/T11-spend-visibility.md` — this execution contract.
- `docs/slices/STATE.md` — refreshed status and baseline.
- `second-brain/01-Agent-Memory/Phase-S66/slice-T11-SPEND-VISIBILITY.md` and `second-brain/00-Current-State.md` — local-only vault summary and changelog.
- `frontend/src/lib/cloudCost.ts` and `frontend/src/lib/cloudCost.test.ts` — pure estimate calculation from Profile token figures and published rates.
- `frontend/src/stores/cloudSpend.store.ts` and `frontend/src/stores/cloudSpend.store.test.ts` — memory-only per-job estimates and session total.
- `frontend/src/hooks/useCloudRequirement.ts` — derives the per-document and batch estimates and records per-job estimates.
- `frontend/src/stores/consent.store.ts` — carries the batch estimate to the consent dialog.
- `frontend/src/components/layout/CloudConsentModal.tsx` — shows the estimate and list-price disclaimer before Send.
- `frontend/src/components/layout/CloudSettingsSection.tsx` — shows the session total and reset notice.
- `frontend/src/stores/scan2text.store.ts` and `frontend/src/stores/scan2text.store.test.ts` — records a completed Cloud job's estimate once.
- `frontend/src/components/layout/ConsentGate.test.tsx` and `frontend/src/components/layout/SettingsDialog.test.tsx` — user-facing estimates, session total, and i18n coverage.
- `frontend/src/locales/en.json` and `frontend/src/locales/id.json` — English and Indonesian strings.

## Files NOT to touch
- `frontend/src/components/layout/CommandCenterLayout.tsx`, `frontend/src/components/layout/TopBar.tsx`, `frontend/src/components/layout/BottomStatusBar.tsx`, and `frontend/src/components/layout/panels/PreviewPanel.tsx` — the locked shell and Preview buttons stay unchanged.
- `src/scan2text/cloud/conversion.py`, `src/scan2text/cloud/failure.py`, and `src/scan2text/services/queue_service.py` — the conversion path, failure taxonomy, and band rule stay unchanged.
- `src/scan2text/cloud/provider.py` and `src/scan2text/cloud/fake_provider.py` — the provider seam and hermetic fake stay unchanged.
- `frontend/src/components/layout/CloudConsentModal.tsx` existing facts — provider, model, file count, total size, region, and traffic statement remain present; only the estimate is added.
- `frontend/src/stores/consent.store.ts` consent decisions — the existing once-per-session gate, CPU override, and escape paths stay unchanged.
- `pyproject.toml` and `frontend/package.json` — no dependency is added or removed.
- `docs/slices/DECISIONS.md` — decisions are cited, not changed.

## RED tests to write first
- `frontend/src/lib/cloudCost.test.ts`: `test_estimate_uses_measured_profile_tokens_and_published_rates` and `test_estimate_changes_when_measured_figures_or_rates_change`.
- `frontend/src/stores/cloudSpend.store.test.ts`: `test_session_total_starts_at_zero`, `test_completed_job_cost_is_added_once`, and `test_spend_is_never_written_to_browser_storage`.
- `frontend/src/stores/scan2text.store.test.ts`: `test_completed_cloud_job_adds_its_estimate_to_the_session_total` and `test_cost_never_stops_delays_or_fails_a_cloud_job`.
- `frontend/src/components/layout/ConsentGate.test.tsx`: `test_estimated_cost_appears_before_send_with_the_existing_consent_facts` and `test_cost_wording_exists_in_english_and_indonesian`.
- `frontend/src/components/layout/SettingsDialog.test.tsx`: `test_session_total_is_visible_in_the_cloud_section` and `test_session_total_starts_at_zero`.
- Expected count before and after: frontend 776 tests in 56 files to 787 tests in 58 files. RED is run per named file only; the full suites run only at the verification gate.

## Implementation steps
1. Write the pure estimate test against the T01 Profile figures. Implement the smallest calculation that multiplies measured prompt and completion tokens by the Profile's published rates and the Profile's standard pages-per-document. The calculation must ignore any stored total and contain no rate literal.
2. Write the memory-only spend-store tests. Implement a Zustand store whose initial total is zero, whose per-job estimate map and completed-job set live only in memory, and whose reset returns the total to zero.
3. Write the Cloud-job completion tests. Record the job's estimate once when a Cloud job completes; do not change the job's status, retry, delay, or failure behaviour because of cost.
4. Extend the Cloud requirement hook to derive the estimate from the loaded Profile, record the per-document estimate for each Cloud-routed job, and pass the batch estimate to the consent summary.
5. Add the estimate and list-price disclaimer to the consent dialog without removing any existing fact. Add English and Indonesian strings and a `data-testid` to each new testable element.
6. Show the session total and its memory-only notice in the Cloud section of Settings. Use the shared i18n setup in every affected test.
7. Run the named targeted tests after each vertical cycle. Refactor only after GREEN.
8. Update the rolling state, the vault summary, and this document's final counts; run all five gates and the slice-document checker; commit with the GitHub noreply email; push so the workflow runs.

## Verification commands
- `npm.cmd run test -- src/lib/cloudCost.test.ts src/stores/cloudSpend.store.test.ts src/stores/scan2text.store.test.ts src/components/layout/ConsentGate.test.tsx src/components/layout/SettingsDialog.test.tsx` in `frontend/` — expected targeted tests pass.
- `py -3.12 -m pytest -q --tb=line` at the repository root with `PYTHONPATH=src` — expected 545 passed, 1 warning.
- `npm.cmd run test` in `frontend/` — expected 787 passed in 58 files.
- `npm.cmd run typecheck` in `frontend/` — expected 0 errors.
- `npm.cmd run build` in `frontend/` — expected build success.
- `cargo check --message-format=short` in `frontend/src-tauri/` — expected clean.
- `py -3.12 scripts/check_slice_docs.py --all` — expected exit 0.
- `git diff --check` — expected no whitespace errors; the staged diff contains no key, secret, fixture, or absolute local path.

## New i18n keys
English and Indonesian files both add:
- `consent.estimatedCost` — the label for the estimate before Send.
- `cloudCost.estimateNotice` — the shared plain statement that the figure is an estimate against published list price, not an invoice.
- `settings.cloud.sessionTotal` — the label for the current-session total.
- `settings.cloud.sessionTotalNotice` — the statement that the total is memory only and resets when the application starts.

## Obsidian update
Write `second-brain/01-Agent-Memory/Phase-S66/slice-T11-SPEND-VISIBILITY.md` with the estimate formula, Profile inputs, consent and Settings surfaces, memory-only counter behaviour, no-cap decision, RED evidence, gate results, and handoff notes. Update `second-brain/00-Current-State.md` with one changelog line and the new baseline, moving the oldest entry to `second-brain/01-Agent-Memory/Archive/state-history.md` if the changelog exceeds five entries. The vault is local-only and gitignored.

## Definition of done
- [ ] RED was observed failing for each vertical cycle and GREEN followed with the smallest implementation.
- [ ] The estimate appears in the consent dialog before Send and keeps provider, model, file count, total size, region, and traffic statement.
- [ ] The estimate is calculated from the Profile's measured token figures and published rates, not a rate literal or stored total.
- [ ] English and Indonesian say plainly that the figure is an estimate against published list price, not an invoice.
- [ ] A completed Cloud job adds its estimate once to the session total.
- [ ] The session total starts at zero, resets with application state, and is never written to browser storage.
- [ ] No mechanism stops, delays, retries, or fails a job because of cost.
- [ ] Every new string is in English and Indonesian; every new testable element has a `data-testid`.
- [ ] All five gates and the slice-document checker pass; new counts are recorded.
- [ ] `docs/slices/STATE.md`, the vault summary, `second-brain/00-Current-State.md`, and this document are updated.
- [ ] The work is committed with the GitHub noreply identity and pushed; no secret is committed.
- [ ] The owner manually checks the consent estimate and Settings total with a real Profile; no screenshot is required because the Command Center, TopBar, BottomBar, and Preview layout do not change.

## Handoff notes
- What now works: a user sees a derived Cloud estimate before Send and a memory-only total for completed Cloud jobs in Settings.
- The next slice may assume: the Profile's measured token figures and published rates are the only cost inputs; no cost decision exists outside the pure estimate helper and the memory-only spend store.
- The next slice may assume: the session total resets with the store and is never persisted; no hard cap or cost-based job outcome exists.
- Still open: the owner owes one live provider check with a real key, including the consent estimate and Settings total.
- Operational risk: the estimate is a published-list-price estimate, not an invoice; provider discounts, caching, and actual page counts can make the bill differ.
