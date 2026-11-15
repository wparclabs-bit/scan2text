# Scan2Text — Work State

## Where the work stands

- **Date:** 2026-11-15
- **Phase:** CLOUD-ENGINE (design closed, first four slices executed)
- **Status:** Design complete. 55 decisions recorded. T00 (the slice-document checker) is implemented and green. T01 (the provider spike) is executed and recorded: the hosted provider was measured on 2026-11-15, two D-38 thresholds failed, and the plan changes are named in the record. T02 (the Cloud Profile) is executed: Settings holds a Beta, off-by-default Cloud engine section; the key is stored by Windows Credential Manager with a DPAPI encrypted-file fallback and never reaches settings, the frontend, storage, logs, or toasts; the connection test sends one image plus text through a hermetic fake and reports the model, vision capability, latency, and the T01-measured cost estimate. T03 (the consent gate) is executed: one backend module owns the 8 MB and 50 MB boundaries and exposes them at `GET /api/cloud/routing` and `POST /api/cloud/batch-route`; the Profile carries its region; the input cap is raised so a file above the local threshold reaches the routing decision; the first Cloud job of a session opens one consent modal naming provider, model, file count, total size, region, and the provider's recording, with Send, Cancel, and a whole-batch CPU override; a keyless or Cloud-disabled batch gets one escape toast. This slice sends nothing. T13 (the CI workflow) is pushed and **fully green on GitHub**, including the tag-triggered release job; it caught four machine-dependent defects on its first two runs, all repaired.
- **Next action:** T04 (a file over 8 MB becomes Markdown through the Cloud engine) starts on top of the T03 gate and the T02 provider seam; T07 is independent. T13 is done (#9) and the release job is proven (probe tag `v0.1.0-probe`, draft release and tag deleted after the check). The owner owes one amendment to D-15 and D-38 (see Open items), one manual live provider check with a real key, and one look at the consent modal with a real key.

## Baseline

Measured on 2026-11-15 at commit `2232800`, on Windows.

| Gate | Result |
|---|---|
| Frontend tests | 739 passed, 45 files (716 in 42 files before T03, +15 consent-gate, +5 routing-mirror, +3 copy/cap tests) |
| Frontend typecheck | 0 errors |
| Frontend build | success, 2178 modules (2176 before T02/T03) |
| Backend tests | 496 passed, 1 warning (486 before T03, +10 routing tests) |
| Cargo check | clean |
| Slice-document checker | exit 0, 5 documents |

Local environment note, measured 2026-11-15: the DSH sandbox cannot delete its own temporary tree, so the 13 backend tests that use the `tmp_path` fixture cannot run here and the frontend suite cannot run until Node is allowed to spawn its test workers. With the wider mode, the frontend reports 739 passed in 45 files and the backend reports 496 passed plus that one `tmp_path` environment error group. CI has a normal temporary directory and runs all 509 backend tests.

T03 added one backend module (`route_decision.py`) with its route preview endpoints, the `region` Profile value, two backend test files, one frontend store, one frontend dialog, one frontend routing mirror, and the raised input cap in `fileValidation.ts`, `FileDropZone.tsx`, and `pdf_service.py`. The Local engine, its Ovis recipe, the Command Center shell, and the TopBar are untouched.

T13 was pushed on 2026-11-15 and took three runs, which is exactly what continuous integration is for:
- Run `43698698370` (`844c103`): documentation green; frontend and backend red on three tests that only pass on this machine — a UTC+7 assumption in `frontend/src/lib/naming.test.ts`, and two races in `tests/test_status_semantics.py` that read the task store before the fire-and-forget background job finished. Rust and release were skipped behind the failed gates.
- Run `43699301634` (`b9b4866`): frontend green; backend and Rust red. The tests' patch generator was being collected by GC mid-test, so the real `QueueService` ran and reported `MODEL_NOT_FOUND`; and `tauri-build` validates the bundled `../../backend` resource, which a fresh checkout lacks.
- Run `43699851420` (`59f40ea`): **success** — documentation, frontend, backend, and Rust all green on a branch push; the release job is skipped there by design.
- Run `43700765222` (probe tag `v0.1.0-probe`): **success** — all four gate jobs plus the release job, which in 16 minutes built the frozen backend and the desktop shell, assembled the portable ZIP, and created a **draft** release named `Scan2Text v1.0.0` carrying `Scan2Text-v1.0.0-Portable.zip` (81 MB). The version came from `pyproject.toml`, so the release matches the manifest. Nothing was published. The draft release and the probe tag were deleted after the check.

## Artefacts

| File | Purpose |
|---|---|
| `docs/GLOSSARY.md` | Canonical vocabulary for the Cloud engine work |
| `docs/slices/DECISIONS.md` | Every decision, its ID, and its reasoning |
| `docs/slices/HANDOFF-GUIDE.md` | Execution contract for any model picking up a slice |
| `docs/slices/STATE.md` | This file: current state and open items |
| `docs/slices/README.md` | Index of the pipeline and the ticket list |
| `docs/slices/T00-checker-script.md` | The first slice document, produced from the template |
| `docs/slices/T01-provider-spike.md` | The measured provider record (T01): base64, tokens, latency, cost, threshold verdicts |
| `docs/slices/T02-cloud-profile.md` | The Cloud Profile slice (T02): secret boundary, provider seam, capability test, cost provenance |
| `docs/slices/T03-consent-gate.md` | The consent gate slice (T03): routing authority, API bounds, gate states, consent modal |
| `docs/slices/T13-ci-workflow.md` | The CI slice (T13): jobs, gates, runner, cache keys, release job |
| `.github/workflows/ci.yml` | Continuous integration: checker, frontend, backend, Rust, and a tag-triggered draft release |
| `scripts/check_slice_docs.py` | Validates slice documents; standard library only (D-48) |
| `tests/test_check_slice_docs.py` | The checker's test suite |
| `docs/slices/specs/` | The four specs, local copies of issues #2 to #5 |
| `docs/slices/tickets/` | The fourteen tickets, local copies of issues #6 to #19 |

## Planned work

Three specs, then twelve vertical tickets, then one slice document per ticket.

| Spec | Covers |
|---|---|
| Continuous integration and delivery | Five gates, the slice-document checker, the draft release artifact. **Published first.** |
| Published issues | #2 Continuous integration and delivery, #3 Cloud engine, #4 Document quality, #5 Handoff and operations. Local copies: `docs/slices/specs/S1-ci-cd.md` to `S4-handoff-operations.md`. |
| Cloud engine | Key storage, profiles, routing, consent, job lifecycle, interface |
| Document quality | Text layer, geometry tables, column segments, rich Markdown, front matter |
| Handoff and operations | Guide, checker script, ADRs, privacy notice, version alignment |

| Ticket | Title | Blocked by | Issue |
|---|---|---|---|
| T00 | A checker validates every slice document | none | #6 |
| T01 | Measure a real provider band | none | #7 |
| T07 | A digital PDF converts from its text layer without OCR | none | #8 |
| T13 | CI runs the five gates on every change | T00 | #9 |
| T02 | Save a cloud profile and prove the model works | T01 | #10 — **done, T02-cloud-profile.md** |
| T03 | The first cloud job asks consent | T02 | #11 — **done, T03-consent-gate.md** |
| T04 | A file over 8 MB becomes Markdown through the cloud engine | T03 | #12 |
| T05 | A provider failure parks the job with a reason and a retry | T04 | #13 |
| T06 | The user can cancel a long cloud job | T04 | #14 |
| T08 | A 45-column table is rebuilt from geometry | T07 | #15 |
| T09 | A scanned wide table is stitched from column segments | T08 | #16 |
| T10 | The fixture suite gates both paths | T04, T08 | #17 |
| T11 | Spend is visible | T04 | #18 |
| T12 | Handoff docs, ADRs, privacy, versioning | T04, T07, T10 | #19 |

## Open items

| ID | Item | Owner |
|---|---|---|
| D-53 | Continuous integration and delivery | implemented in T13 (#9): `.github/workflows/ci.yml` runs the checker and the five gates on a Windows runner and drafts a release on a `v*` tag. Green locally; the owner must push for the first GitHub run. |
| D-54 | Hosted provider licence for production use, and the privacy wording that depends on it | owner; the beta ships with the trial terms disclosed |
| D-55 | Merge the two files numbered ADR-007 in the private vault; write ADR-010 and ADR-011 | T12 (#19) |
| — | Fixture files need an explicit ignore exception before they can be committed | T10 (#17), needs approval |
| — | The published specs (#2 to #5) and tickets (#6 to #19) need the `ready-for-agent` label applied in the browser, because the token cannot set labels | owner |
| — | The GitHub token can **create** issues but cannot modify them (label, comment, close, delete all fail). All five triage labels now exist, created by the owner in the browser. Publish without `--label`; apply labels in the browser via multi-select. Recorded in `docs/agents/issue-tracker.md`. | resolved, constraint recorded |
| — | GitHub issue **#1** "setup probe - delete me" (leftover from the setup probe) is closed. The token cannot delete it, so it stays as a closed, harmless issue. | resolved |
| — | The NVIDIA API key for the spike must be supplied out of the repository | resolved at T01; supplied out of the repository, never committed |
| — | D-15 and D-38 amendment: scope the 20-second band latency to full-page bands and the 98% cell-accuracy threshold to model crops of 12 columns or fewer, with wide tables on the D-27 geometry path | owner, after T01 |
| — | Live provider check for the saved Cloud Profile (real key, base URL, model id, Test connection). CI has no key by design; the hermetic fake proves the path. | owner, after T02 |

## Known repository inconsistencies

Found during the design work. Each belongs to a ticket, not to a design decision.

| Item | Where | Belongs to |
|---|---|---|
| Health route is `/api/health`; `AGENTS.md` says `/health` | `AGENTS.md` section 5 | T12 |
| Three version numbers disagree: 0.1.0, 1.0.0, 1.1.0 | `pyproject.toml`, `frontend/package.json`, `frontend/src-tauri/tauri.conf.json`, backend health | T12 |
| Frontend job status enum has no `skipped`; the backend has it | `frontend/src/stores/scan2text.store.ts`, `src/scan2text/models/job.py` | T05 |
| `filePath` and `metaSize` are attached at runtime but absent from the job interface | `frontend/src/stores/scan2text.store.ts` | T04 |
| `origin` points at `wparclabs-bit/scan2text`; the release manifest points at `wPAILabs/scan2text` | `version.json` | T12 |
| `.gitignore` line 39 merges two rules: `*.log.txtbackend/` | `.gitignore` | T12 |
| The local model name is never shown in the interface; the health payload carries it | `frontend/src/App.tsx` | T12 |
| Resolved by T13: continuous integration exists; the five gates plus the checker run on a Windows runner | `.github/workflows/ci.yml` | D-53 (done) |
