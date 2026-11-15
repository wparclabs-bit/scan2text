# T02 — Save a cloud profile and prove the model works

## State snapshot
- Read `AGENTS.md` first, then `docs/slices/HANDOFF-GUIDE.md`, `docs/slices/DECISIONS.md` (D-01, D-03, D-04, D-10, D-11, D-14, D-18, D-19, D-23, D-24, D-31, D-40, amended D-15), and `docs/slices/STATE.md`.
- Read `docs/slices/T01-provider-spike.md` for the measured figures.
- Last commit: 1343be1.
- Final result: implemented and green. Backend 463 to 486 tests; frontend 710 to 716 tests in 42 files; build 2176 to 2177 modules; typecheck 0 errors; cargo clean; slice-document checker exit 0 with 4 documents.
- Baseline at the start: frontend 710 tests in 42 files, typecheck 0 errors, build success (2176 modules), backend 463 passed with one warning, cargo check clean; measured 2026-11-15 on Windows.
- Open blockers: none. The owner supplies the real key outside the repository; all automated tests use fakes and make no network call.

House rules:
- Read `AGENTS.md` first; it is the source of truth.
- Use PowerShell only for repository commands and `py -3.12` for Python.
- TDD is mandatory: RED, then minimal GREEN, then refactor.
- Add no dependency and keep every secret out of code, tests, logs, documents, and commits.
- Run targeted tests during RED/GREEN, then all five gates.

## Goal
A user opens Settings, sees a Cloud engine section marked Beta and switched off, enters an OpenAI-compatible base URL, a model identifier, and their own API key, then presses Test connection. The application stores the key in the operating system's credential store, sends one small image plus text, and reports the model, its vision capability, the latency, and the measured per-document cost estimate. A model that cannot read images is identified before any document is sent.

## Non-goals
- No routing, consent dialog, cloud conversion, failure parking, cancel action, or spend counter; those belong to T03, T04, T05, T06, and T11.
- No fixture commit, dependency installation, native PDF upload, provider preset, or hard spending cap.
- No change to the Local engine, its Ovis model files, or its recipe.
- No change to the Command Center layout or TopBar and no new shell surface.
- No live provider call from an automated test.

## Locked decisions
- D-01 — the Cloud engine speaks the OpenAI-compatible chat-completions shape only.
- D-03 — the Local engine stays fixed to Ovis 0.9B; the Cloud Profile is the only extension point.
- D-04 — each Profile carries its own Recipe; the Cloud Recipe uses temperature 0.6, top_p 0.95, and thinking disabled.
- D-10 — the key lives in Windows Credential Manager through `advapi32` via `ctypes`; a DPAPI-encrypted file is the documented fallback.
- D-11 — the key never enters `AppSettings`, `settings.json`, frontend state or storage, logs, crash dumps, or toasts; only an identifier and last four characters may be shown.
- D-14 — the Cloud engine toggle is off by default and independent of key presence; turning it off does not delete the key.
- D-15 — a Band is five consecutive 150 DPI pages; tables of thirteen or more columns stay on the geometry path.
- D-18 — the Cloud prompt is a versioned Profile asset.
- D-19 — the connection test proves capability by sending one small image plus text and reporting model, vision capability, latency, and per-document cost.
- D-23 — the provider client is a seam with a fake; no test touches the network.
- D-24 — cost is visible; there is no hard dollar cap and the spend counter belongs to T11.
- D-31 — Cloud profiles live in a new Cloud engine section of the existing Settings dialog.
- D-40 — the Cloud engine is an opt-in Beta in Settings, off by default.

## Baseline
Measured on 2026-11-15 at commit `1343be1` on Windows.

| Gate | Result |
|---|---|
| Frontend tests | 710 passed, 42 files |
| Frontend typecheck | 0 errors |
| Frontend build | success, 2176 modules |
| Backend tests | 463 passed, 1 warning |
| Cargo check | clean |

T01 measured one 150 DPI page inside a five-page band at 2167 prompt tokens and 381 completion tokens. At the highest published serverless rates, a thirty-page document costs about `$0.019`. Those measured figures and the Cloud Recipe live in the Profile data, not in the capability algorithm.

## Files to touch
- `docs/slices/T02-cloud-profile.md` — this execution contract.
- `docs/slices/STATE.md` — refreshed status and baseline.
- `second-brain/01-Agent-Memory/Phase-S66/slice-T02-CLOUD-PROFILE.md` and `second-brain/00-Current-State.md` — local-only vault summary and changelog.
- `src/scan2text/cloud/` — Cloud Profile, Recipe, measured cost data, provider seam, fake provider, and capability test.
- `src/scan2text/services/credential_store.py` — Windows Credential Manager adapter and DPAPI file fallback.
- `src/scan2text/routes/cloud.py` and `src/scan2text/api/main.py` — local-only Profile, key, and capability endpoints.
- `tests/unit/cloud/` and `tests/integration/test_cloud_routes.py` — hermetic RED/GREEN tests.
- `frontend/src/lib/api.ts` — Cloud Profile client functions.
- `frontend/src/components/layout/SettingsDialog.tsx` and `frontend/src/components/layout/SettingsDialog.test.tsx` — Cloud section and its tests.
- `frontend/src/locales/en.json` and `frontend/src/locales/id.json` — English and Indonesian strings.

## Files NOT to touch
- `src/scan2text/adapters/vlm_ocr.py` and `src/scan2text/adapters/ocr_engine.py` — the Local engine and its locked recipe stay untouched.
- `frontend/src/components/layout/CommandCenterLayout.tsx`, `frontend/src/components/layout/TopBar.tsx`, and `frontend/src/components/layout/BottomStatusBar.tsx` — the locked Command Center shell stays unchanged.
- `frontend/src/stores/scan2text.store.ts` — no routing, jobs, or persistence are added in this slice.
- `docs/slices/DECISIONS.md` — decisions are cited, not changed.
- `pyproject.toml` and `frontend/package.json` — no dependency is added or removed.
- `src/scan2text/models/settings.py` — the Profile and descriptor use a separate file so the key never enters `AppSettings` or `settings.json`.

## RED tests to write first
- `tests/unit/cloud/test_provider_capability.py`: `test_openai_request_contains_one_text_part_and_one_image_part`, `test_vision_fake_reports_vision_capability`, `test_text_only_fake_is_not_vision_capable`, `test_rejected_key_fake_raises_authentication_error`, and `test_timeout_fake_raises_provider_timeout`.
- `tests/unit/cloud/test_credential_store.py`: `test_windows_credential_manager_round_trips_secret`, `test_dpapi_fallback_is_used_when_credential_manager_fails`, `test_delete_removes_secret`, and `test_descriptor_contains_only_identifier_and_last_four`.
- `tests/unit/cloud/test_cloud_profile.py`: `test_default_profile_is_beta_and_disabled`, `test_default_profile_keeps_t01_recipe_and_measured_cost`, `test_saved_profile_never_contains_secret`, and `test_disabling_profile_preserves_key_descriptor`.
- `tests/integration/test_cloud_routes.py`: `test_profile_response_never_contains_secret`, `test_save_key_returns_descriptor_only`, `test_delete_key_is_separate_from_disable`, `test_connection_test_uses_fake_provider_without_network`, and `test_connection_test_reports_text_only_model`.
- `frontend/src/components/layout/SettingsDialog.test.tsx`: `test_cloud_section_is_beta_and_disabled_by_default`, `test_cloud_profile_loads_without_exposing_key`, `test_test_connection_saves_profile_then_reports_capability`, `test_text_only_result_is_reported`, `test_toggle_off_does_not_delete_key`, and `test_cloud_strings_exist_in_english_and_indonesian`.
- Expected count before and after: backend 463 tests to 486 tests; frontend 710 tests in 42 files to 716 tests in 42 files. RED is run per named file only; the full suites run only at the verification gate.

## Implementation steps
1. Write the Profile data model and default Profile asset with the T01 Recipe, measured token figures, and `$0.0187` thirty-page estimate; keep the Cloud toggle off and no credential descriptor.
2. Write the provider seam and fake first. The fake modes are vision, text-only, rejected key, and timeout. Confirm the named provider/capability tests fail for the missing implementation.
3. Implement the OpenAI-compatible client with configurable base URL and model id. Its JSON request has one user message containing one image part and one text part, temperature 0.6, top_p 0.95, and thinking disabled.
4. Implement the capability test around the provider seam. It returns model id, vision capability, round-trip latency, and the Profile's measured thirty-page estimate; rejected-key and timeout errors stay typed and contain no secret.
5. Implement the credential adapter with `ctypes` calls to `advapi32` `CredWriteW`, `CredReadW`, and `CredDeleteW`. If that platform API fails, use a documented DPAPI `CryptProtectData`/`CryptUnprotectData` encrypted-file fallback. Return only a descriptor containing the credential target identifier and last four characters.
6. Implement the Profile service and local API. A key is written only to the credential store; the Profile file stores only the descriptor. Disabling the Cloud engine leaves the descriptor and credential intact; deleting the key is a separate endpoint.
7. Implement the Settings Cloud section with Beta, off-by-default toggle, base URL, model id, password field, save, delete key, and Test connection. Read the key transiently from the password field, clear it after submission, and never put it in React state, browser storage, logs, or toasts.
8. Add English and Indonesian strings and `data-testid` values for every new testable element. Run the named targeted tests after each vertical cycle.
9. Update the rolling state, the vault summary, and this document's final counts; run all five gates and the slice-document checker; commit with the GitHub noreply email.

## Verification commands
- `py -3.12 -m pytest -q --tb=line tests/unit/cloud/test_provider_capability.py` — expected targeted provider and capability tests pass.
- `py -3.12 -m pytest -q --tb=line tests/unit/cloud/test_credential_store.py tests/unit/cloud/test_cloud_profile.py tests/integration/test_cloud_routes.py` — expected targeted backend tests pass.
- `npm.cmd run test -- SettingsDialog.test.tsx` in `frontend/` — expected targeted Settings tests pass.
- `py -3.12 -m pytest -q --tb=line` at the repository root with `PYTHONPATH=src` — expected 486 passed, 1 warning.
- `npm.cmd run test` in `frontend/` — expected 716 passed in 42 files.
- `npm.cmd run typecheck` in `frontend/` — expected 0 errors.
- `npm.cmd run build` in `frontend/` — expected build success.
- `cargo check --message-format=short` in `frontend/src-tauri/` — expected clean.
- `py -3.12 scripts/check_slice_docs.py --all` — expected exit 0.
- `git diff --check` — expected no whitespace errors; `git diff --cached` — expected no key, secret, fixture, or absolute local path.

## New i18n keys
English and Indonesian files both add `settings.cloud.*`: `title`, `beta`, `enable`, `enableHint`, `baseUrl`, `baseUrlPlaceholder`, `modelId`, `modelIdPlaceholder`, `apiKey`, `apiKeyPlaceholder`, `keyStored`, `noKeyStored`, `saveProfile`, `profileSaved`, `profileSaveFailed`, `deleteKey`, `keyDeleted`, `keyDeleteFailed`, `testConnection`, `testingConnection`, `testFailed`, `model`, `vision`, `visionYes`, `visionNo`, `latency`, `estimatedCost`, and `keyRequired`.

## Obsidian update
Write `second-brain/01-Agent-Memory/Phase-S66/slice-T02-CLOUD-PROFILE.md` with the Profile schema, secret boundary, provider seam, capability-test contract, measured cost provenance, test evidence, gate results, and handoff notes. Update `second-brain/00-Current-State.md` with one changelog line and the new baseline, moving the oldest entry to `second-brain/01-Agent-Memory/Archive/state-history.md` if the changelog exceeds five entries. The vault is local-only and gitignored.

## Definition of done
- [ ] RED was observed failing for the provider/capability seam and each later vertical cycle was RED before GREEN.
- [ ] Settings shows a Beta Cloud section with the Cloud engine off by default.
- [ ] The key is stored by Windows Credential Manager, with the DPAPI encrypted-file fallback, and never reaches the Profile file, settings model, frontend state or storage, logs, crash dumps, or toasts.
- [ ] Only a key identifier and last four characters are visible.
- [ ] Disabling the Cloud engine does not delete the key; deleting the key is separate.
- [ ] The Profile carries the versioned T01 Recipe and measured `$0.019` thirty-page estimate.
- [ ] The connection test uses one image plus text and reports model, vision capability, latency, and cost; a text-only model is rejected before a document job.
- [ ] Every new string is in English and Indonesian; every new testable element has a `data-testid`.
- [ ] All five gates and the slice-document checker pass; new counts are recorded.
- [ ] `docs/slices/STATE.md`, the vault summary, `second-brain/00-Current-State.md`, and this document are updated.
- [ ] The work is committed with the GitHub noreply identity; no secret is committed.
- [ ] No screenshot is required because the Command Center and TopBar layout do not change; the owner may still inspect the Settings dialog manually.

## Handoff notes
- What now works: a user can save one Cloud Profile, store the key in the OS credential store, and prove model vision capability through a hermetic fake-backed connection test.
- The next slice may assume: the provider seam is stable; the fake supports vision, text-only, rejected-key, and timeout outcomes; no test calls the network.
- The next slice may assume: the Profile file contains the Recipe, measured cost estimate, toggle, endpoint, model id, and a secret-free descriptor only.
- Still open: routing, consent, cloud conversion, retry/parking, cancellation, and spend visibility are T03, T04, T05, T06, and T11.
- Operational risk: the owner must perform the live provider check with a real key outside the repository; automated CI has no key and must stay green.
