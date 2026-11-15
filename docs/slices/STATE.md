# Scan2Text — Work State

## Where the work stands

- **Date:** 2026-11-15
- **Phase:** CLOUD-ENGINE-DESIGN (design closed, documentation written, first slice executed)
- **Status:** Design complete. 55 decisions recorded. T00 (the slice-document checker) is implemented and green. T01 (the provider spike) is executed and recorded: the hosted provider was measured on 2026-11-15, two D-38 thresholds failed, and the plan changes are named in the record. T13 (the CI workflow) is implemented and green locally; the workflow has never run on GitHub, so the owner must push to see it. No product code written.
- **Next action:** T02 starts on top of the T01 record and must reuse the measured model and recipe; T07 is independent. T13 is done (#9): push the T13 commit, open the repository's Actions tab for the `CI` run, then push a probe `v*` tag to prove the draft-release job. The owner owes one amendment to D-15 and D-38 (see Open items).

## Baseline

Measured on 2026-11-15 at commit `45bdf97`, on Windows.

| Gate | Result |
|---|---|
| Frontend tests | 710 passed, 42 files |
| Frontend typecheck | 0 errors |
| Frontend build | success, 2176 modules |
| Backend tests | 447 passed, 1 warning (432 before T00, +15 checker tests) |
| Cargo check | clean |

T00 added one backend test file and no product code, so the frontend, typecheck, build, and cargo baselines are unchanged; the backend count rose from 432 to 447.

T01 re-ran all five gates on 2026-11-15; every count is unchanged because T01 added only documentation. The slice-document checker was also run and passed.

T13 re-ran all five gates on 2026-11-15 at commit `fe2695d`. Frontend tests, typecheck, build, and cargo check are unchanged from the table above. The backend suite now collects **462 tests and all 462 pass, 1 warning**: T13 adds 15 workflow tests (`tests/test_ci_workflow.py`) and repairs a pre-existing failure. At `fe2695d` the suite collected 447 tests but reported 446 passed and 1 failed, because `tests/test_check_slice_docs.py` froze the collected set at `{T00-checker-script.md}` and had failed since T01 added a slice document. The assertion now checks that T00 is collected and that every collected document passes.

| Gate (T13) | Result |
|---|---|
| Frontend tests | 710 passed, 42 files (unchanged) |
| Frontend typecheck | 0 errors (unchanged) |
| Frontend build | success (unchanged) |
| Backend tests | 462 passed, 1 warning |
| Cargo check | clean (unchanged) |
| Slice-document checker | exit 0, 3 documents |

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
| T02 | Save a cloud profile and prove the model works | T01 | #10 |
| T03 | The first cloud job asks consent | T02 | #11 |
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
