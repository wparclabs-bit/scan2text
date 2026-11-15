# T03 — The first cloud job asks consent

## State snapshot
- Read `AGENTS.md` first, then `docs/slices/HANDOFF-GUIDE.md`, `docs/slices/DECISIONS.md` (D-05, D-06, D-07, D-08, D-09, D-11, D-12, D-13, D-14, D-31, D-36, and the amended D-15), and `docs/slices/STATE.md`.
- Read `docs/slices/T02-cloud-profile.md` for the Profile, the provider seam, and the credential storage that already exist.
- Committed as `69ed2c6`.
- Baseline at the start: frontend 716 tests in 42 files, typecheck 0 errors, build success (2176 modules), backend 486 passed with one warning, cargo check clean; measured 2026-11-15 on Windows.
- Final result: implemented and green. Backend 486 to 496 tests; frontend 716 tests in 42 files to 739 tests in 45 files; build 2176 to 2178 modules; typecheck 0 errors; cargo clean; slice-document checker exit 0 with 5 documents.
- Gate note: this sandbox cannot remove its own temporary tree, so the repository's 13 `tmp_path`-based backend tests cannot run here; the full suite reports 496 passed with that one documented environment error group. CI, which has a normal temp directory, runs them and reports the clean count. The frontend suite is unaffected once the sandbox permits Node to spawn its test workers.
- Open blockers: none. The owner supplies the real key outside the repository; every automated test uses fakes and no test calls the network.
- Issue: #11.

House rules:
- Read `AGENTS.md` first; it is the source of truth.
- Use PowerShell only for repository commands and `py -3.12` for Python.
- TDD is mandatory: RED, then minimal GREEN, then refactor.
- Add no dependency and keep every secret out of code, tests, logs, documents, and commits.
- Run targeted tests during RED/GREEN, then all five gates.

## Goal
A user drops a batch that contains a large document. Before anything leaves the machine, one modal names the provider, the model, the file count, the total size, the region, and the fact that the provider records traffic under its own terms. The user chooses Send, Cancel, or checks "process this batch on the CPU instead". When the Cloud engine is switched off, or when no key is stored, the user is never dead-ended: one aggregated toast per batch offers to add an API key, to enable the Cloud engine, or to process on the CPU anyway. Nothing is sent anywhere. This slice only decides and asks.

## Non-goals
- No cloud conversion and no page sent to any provider; that is T04. This slice sends nothing.
- No failure parking, no cancel of a running job, and no spend counter; those are T05, T06, and T11.
- No fixture commit, no dependency installation, no second provider preset, and no native PDF upload.
- No change to the Local engine, its Ovis model files, or its recipe.
- No change to the Command Center layout or the TopBar, and no new shell surface.
- No key in the modal, in a toast, in browser storage, or in any log.

## Locked decisions
- D-05 — files over 8 MB route to the Cloud engine; files up to 8 MB stay Local.
- D-06 — routing is decided per file, never per batch; a mixed batch yields two routes.
- D-07 — the 8 MB and 50 MB thresholds live in one backend module and are exposed through the API; the frontend never decides the route.
- D-08 — the Cloud engine accepts files up to 50 MB; anything larger is rejected.
- D-09 — one active job overall; a Cloud job occupies the queue slot like a Local job.
- D-11 — the key never enters settings, the frontend, storage, logs, crash dumps, or toasts.
- D-12 — cloud consent appears once per session at the first Cloud job, names provider, model, file count, total size, region, and the provider's own traffic recording, and offers Send, Cancel, and a CPU override for the batch.
- D-13 — a file over the threshold with no key is blocked with one toast offering "add an API key" or "process on CPU anyway"; the CPU override lasts for the batch.
- D-14 — the Cloud engine toggle is off by default and independent of key presence.
- D-31 — Cloud settings live in the existing Settings dialog; no new shell surfaces.
- D-36 — one aggregated toast per batch states the limits and the remedy.
- D-15 (amended) — a Band is five consecutive 150 DPI pages; table geometry rules are unchanged.

## Baseline
Measured on 2026-11-15 at commit `2232800` on Windows.

| Gate | Result |
|---|---|
| Frontend tests | 716 passed, 42 files |
| Frontend typecheck | 0 errors |
| Frontend build | success, 2176 modules |
| Backend tests | 486 passed, 1 warning |
| Cargo check | clean |
| Slice-document checker | exit 0, 4 documents |

T02 delivered the Profile, the provider seam with its fake, the credential store, and the capability test. The routing thresholds and the consent gate do not exist yet: the frontend refuses any file over 20 MB at the drop zone, so a document above the 8 MB local threshold can never reach a routing decision.

## Files to touch
- `docs/slices/T03-consent-gate.md` — this execution contract.
- `docs/slices/STATE.md`, `second-brain/01-Agent-Memory/Phase-S66/slice-T03-CONSENT-GATE.md`, `second-brain/00-Current-State.md` — state and local-only vault summary.
- `src/scan2text/cloud/route_decision.py` — the single owner of the 8 MB and 50 MB boundaries and the per-file route.
- `src/scan2text/cloud/models.py`, `src/scan2text/cloud/default_profile.json` — the Profile gains its region value.
- `src/scan2text/cloud/routes.py` — expose the thresholds and the per-file route through the API.
- `src/scan2text/services/pdf_service.py` — raise the input cap from 20 MB to the 50 MB ceiling so a file above 8 MB reaches the routing decision.
- `tests/unit/cloud/test_route_decision.py`, `tests/integration/test_cloud_routing_routes.py` — hermetic RED/GREEN tests.
- `frontend/src/stores/consent.store.ts` and `frontend/src/stores/consent.store.test.ts` — gate state, once-per-session flag, per-batch CPU override.
- `frontend/src/lib/cloudRouting.ts` — the frontend mirror of the thresholds for early convenience rejection only.
- `frontend/src/components/layout/CloudConsentModal.tsx` and `frontend/src/components/layout/CloudConsentModal.test.tsx` — the consent dialog built from the existing dialog components.
- `frontend/src/lib/api.ts` — routing-threshold client call.
- `frontend/src/lib/fileValidation.ts`, `frontend/src/components/dropzone/FileDropZone.tsx`, `frontend/src/locales/en.json`, `frontend/src/locales/id.json` — raised input cap and the new strings.
- `frontend/src/components/layout/WelcomeModal.tsx` and its test — the honesty copy names 50 MB.
- `frontend/src/i18n/resources.test.ts`, `frontend/src/lib/fileValidation.test.ts`, `frontend/src/components/dropzone/FileDropZone.size.test.tsx` — the copy assertions move to 50 MB.

## Files NOT to touch
- `src/scan2text/adapters/vlm_ocr.py` and `src/scan2text/adapters/ocr_engine.py` — the Local engine and its recipe stay untouched.
- `src/scan2text/cloud/provider.py`, `src/scan2text/cloud/fake_provider.py`, `src/scan2text/cloud/capability.py` — the T02 seam is stable; this slice sends nothing.
- `src/scan2text/services/credential_store.py` — the key boundary is settled; no key is read in this slice.
- `frontend/src/components/layout/CommandCenterLayout.tsx`, `TopBar.tsx`, `BottomStatusBar.tsx` — the locked shell stays unchanged.
- `frontend/src/stores/scan2text.store.ts` — the queue store is untouched; the gate lives in its own store.
- `docs/slices/DECISIONS.md` — decisions are cited, not changed.
- `pyproject.toml` and `frontend/package.json` — no dependency is added or removed.

## RED tests to write first
- `tests/unit/cloud/test_route_decision.py`: `test_batch_with_one_small_and_one_large_file_returns_a_different_route_for_each`, `test_thresholds_live_in_the_route_decision_module`, `test_file_at_the_eight_megabyte_boundary_stays_local`, `test_file_above_the_fifty_megabyte_ceiling_is_rejected`, and `test_local_engine_choice_overrides_every_route_in_the_batch`.
- `tests/integration/test_cloud_routing_routes.py`: `test_routing_thresholds_are_exposed_through_the_api`, `test_batch_route_preview_splits_a_mixed_batch`, `test_batch_route_rejects_a_non_positive_size`, `test_profile_response_carries_the_region_value`, and `test_main_app_exposes_routing_routes`.
- `frontend/src/stores/consent.store.test.ts`: `test_gate_state_is_cloud_enabled_when_a_key_is_stored`, `test_gate_state_is_needs_key_when_cloud_is_enabled_without_a_key`, `test_gate_state_is_cloud_disabled_when_the_toggle_is_off`, `test_consent_is_asked_once_per_session_and_not_again_for_a_later_cloud_job`, `test_cpu_override_routes_the_whole_batch_to_the_local_engine`, and `test_consent_flag_is_never_written_to_browser_storage`.
- `frontend/src/components/layout/CloudConsentModal.test.tsx`: `test_modal_names_provider_model_count_total_size_region_and_traffic_recording`, `test_send_grant_is_the_only_path_that_permits_a_cloud_job`, `test_cancel_denies_and_permits_no_cloud_job`, `test_cpu_checkbox_routes_the_batch_locally`, `test_modal_never_renders_or_logs_the_key`, and `test_consent_strings_exist_in_english_and_indonesian`.
- `frontend/src/lib/cloudRouting.test.ts`: `test_dropzone_accepts_a_file_above_the_local_threshold` and `test_frontend_rejects_a_file_above_the_ceiling_early`.
- Expected count before and after: backend 486 tests to 496 tests; frontend 716 tests in 42 files to 739 tests in 45 files. RED is run per named file only; the full suites run only at the verification gate.

## Implementation steps
1. Write `route_decision.py` with `LOCAL_THRESHOLD_BYTES = 8 * 1024 * 1024`, `CEILING_BYTES = 50 * 1024 * 1024`, the `Engine` values `local` and `cloud`, and `decide_route(size_bytes, *, engine_choice=None)`. Confirm the named unit tests fail.
2. Expose `GET /api/cloud/routing` returning the two bounds and the engines, and `POST /api/cloud/batch-route` returning one route per file plus counts and total size. Confirm the named API tests fail.
3. Add `region` to `CloudProfile` and to `default_profile.json`; return it through the Profile API. Confirm the named region test fails.
4. Raise `MAX_PDF_SIZE_BYTES` to the 50 MB ceiling so a file above 8 MB reaches the routing decision.
5. Write `consent.store.ts`: `cloudState` (`enabled` with a key descriptor / `enabled` without / `disabled`), `resolveConsentGate`, `requestConsent(batch)`, `grantConsent`, `denyConsent`, `setCpuOverride`, and the module-private session flag. Memory only. Confirm the named store tests fail.
6. Write `CloudConsentModal.tsx` from `dialog.tsx`, `button.tsx`, and `label.tsx`: provider, model, file count, total size, region, the traffic-recording statement in plain words, Send, Cancel, and the CPU checkbox. Confirm the named modal tests fail.
7. Add the one aggregated per-batch toast for the `needs-key` and `cloud-disabled` states, with the add-a-key, enable-the-Cloud-engine, and process-on-CPU actions.
8. Add `cloudRouting.ts` for the early convenience rejection only, raise the drop zone cap, and update both locale files and every affected copy assertion.
9. Update the rolling state, this document's final counts and state snapshot, the vault summary, and `00-Current-State.md`; run all five gates and the checker; commit with the GitHub noreply email.

## Verification commands
- `py -3.12 -m pytest -q --tb=line tests/unit/cloud/test_route_decision.py` at the repository root with `PYTHONPATH=src` — expected targeted routing tests pass.
- `py -3.12 -m pytest -q --tb=line tests/integration/test_cloud_routes.py` — expected targeted Cloud API tests pass.
- `npm.cmd run test -- consent.store.test.ts CloudConsentModal.test.tsx cloudRouting.test.ts` in `frontend/` — expected targeted frontend tests pass.
- `py -3.12 -m pytest -q --tb=line` at the repository root with `PYTHONPATH=src` — expected 496 passed, 1 warning (plus 13 `tmp_path`-based tests that this sandbox cannot host; CI runs them).
- `npm.cmd run test` in `frontend/` — expected 739 passed in 45 files.
- `npm.cmd run typecheck` in `frontend/` — expected 0 errors.
- `npm.cmd run build` in `frontend/` — expected build success, 2178 modules.
- `cargo check --message-format=short` in `frontend/src-tauri/` — expected clean.
- `py -3.12 scripts/check_slice_docs.py --all` — expected exit 0 with 5 documents.
- `git diff --check` — expected no whitespace errors; `git diff --cached` — expected no key, secret, fixture, or absolute local path.

## New i18n keys
English and Indonesian files both add `consent.*`: `title`, `provider`, `model`, `fileCount`, `totalSize`, `region`, `trafficNotice`, `send`, `cancel`, `useCpu`, and `cpuQueued`. English and Indonesian files both add `consent.toast.*`: `needsKey`, `addKey`, `enableCloud`, `cloudDisabled`, and `processOnCpu`. The raised cap changes the existing `errors.fileTooLarge`, `dropzone.hint`, and `welcome.bullet2` strings in both files.

## Obsidian update
Write `second-brain/01-Agent-Memory/Phase-S66/slice-T03-CONSENT-GATE.md` with the routing authority, the API shape, the three gate states, the once-per-session memory-only flag, the consent content, the raised input cap, the test evidence, the gate results, and the handoff notes. Update `second-brain/00-Current-State.md` with one changelog line and the new baseline, moving the oldest entry to `second-brain/01-Agent-Memory/Archive/state-history.md` if the changelog exceeds five entries. The vault is local-only and gitignored.

## Definition of done
- [ ] RED was observed failing for the routing module, the API exposure, the consent store, and the modal, each before its GREEN.
- [ ] The 8 MB and 50 MB boundaries live in one backend module and are reachable through the API; the frontend only rejects the over-ceiling case early.
- [ ] A mixed batch yields one route per file, and a batch-level CPU override sends the whole batch to the Local engine.
- [ ] The drop zone accepts a file above the local threshold so it reaches the routing decision.
- [ ] The consent modal names the provider, the model, the file count, the total size, the Profile region, and the provider's traffic recording in plain words.
- [ ] The modal offers Send, Cancel, and a CPU checkbox for the whole batch.
- [ ] One aggregated toast per batch covers the no-key and Cloud-disabled escapes, naming add-a-key, enable-the-Cloud-engine, and process-on-CPU.
- [ ] Consent is asked once per session, held in memory only, and never written to browser storage.
- [ ] The key appears in no modal, toast, log, or storage write.
- [ ] Every new string is in English and Indonesian; every new testable element has a `data-testid`.
- [ ] All five gates and the slice-document checker pass; new counts are recorded.
- [ ] `docs/slices/STATE.md`, the vault summary, `second-brain/00-Current-State.md`, and this document are updated.
- [ ] The work is committed with the GitHub noreply identity; no secret is committed.
- [ ] No screenshot is required because the Command Center layout does not change; the owner may still inspect the consent modal with a real key.

## Handoff notes
- What now works: the boundaries are authoritative in one backend module and visible through the API; a mixed batch routes per file; the first Cloud job of a session asks consent once, naming the recipient, the data, the region, and the provider's recording, with Send, Cancel, and a whole-batch CPU override; a keyless or Cloud-disabled user gets one escape toast per batch.
- The next slice may assume: `GET /api/cloud/routing` returns the two bounds; `POST /api/cloud/batch-route` returns per-file routes; `CloudProfile.region` is present and is the only source of the region string; the consent store holds `grantConsent`, `denyConsent`, `setCpuOverride`, and a `sessionConsentGranted` flag that no persistence layer sees.
- Still open: cloud conversion, page sending, failure parking, cancel, and spend visibility are T04, T05, T06, and T11.
- T04 must build the over-ceiling rejection message and prove it; this slice only proves that the ceiling exists in the routing module and the API.
- Operational risk: the owner must still perform the live provider check with a real key outside the repository; CI has no key and must stay green.
- Decision note: the frontend keeps a mirrored copy of the two bounds for drop-zone convenience only. If a future slice changes a bound, the backend module remains the authority and the mirror must move in the same commit.
