# T13 — CI runs the five gates on every change

Read `AGENTS.md` first. It owns the house rules. This document cites `docs/slices/DECISIONS.md`.

## State snapshot
- Last commit: `fe2695d` (Cloud engine design artefacts, specs, tickets, T01 amendment)
- Baseline: frontend 710 tests in 42 files, backend 447 tests (1 warning), typecheck 0 errors, build 2176 modules, cargo check clean (2026-11-15, Windows)
- Open blockers: none. T00 (the checker) is implemented, green, and committed.

## Goal
Every push and every pull request is verified on a Windows runner by the same five gates the operating manual names, plus the slice-document checker, so a failing test, type error, broken build, malformed slice document, or non-compiling shell is caught before review. A tag builds the frozen artifact and attaches it to a draft release that a human publishes. The workflow carries no secret and no provider key: the Cloud provider seam runs through its fake implementation.

## Non-goals
- No product code, and no change to `frontend/` or `src/`.
- No change to the operating manual's gate list.
- No Linux or macOS runner (D-56).
- No automatic publication; the release stays a draft (D-58).
- No secret management, because no secret is needed (D-53, D-23).
- No new dependency in any manifest; CI installs existing dependencies only.
- No branch-protection setting; the workflow is visible, requiring it is an owner setting.

## Locked decisions
- D-53 — CI runs the five gates plus the checker on every push and pull request, with no secret and no key present.
- D-56 — the runner is `windows-latest` only, the platform the application ships.
- D-57 — the backend job installs the test dependency subset only; `llama-cpp-python` is excluded with a comment, because the adapter imports it lazily inside the worker.
- D-58 — a tag builds the frozen artifact and attaches it to a draft release; a human publishes.
- D-46 — the five gates are targeted test, full suite, typecheck, build, and cargo check.
- D-41 — `pyproject.toml` holds the product version; the release job reads it, never a hard-coded value.
- D-23 — the provider client is a seam with a fake implementation, so no test touches the network.

## Baseline
- Frontend: 710 tests in 42 files; typecheck 0 errors; build success, 2176 modules.
- Backend: 447 tests, 1 warning (repo root, `PYTHONPATH=src`).
- Cargo check: clean.
- The slice changes no frontend or product source, so the frontend, typecheck, build, and cargo baselines stay identical. The backend suite gains the new order test file, so its count rises.

## Files to touch
- `.github/workflows/ci.yml` (new) — the whole workflow.
- `tests/test_ci_workflow.py` (new) — the RED test for the workflow and the packaging-script root fix.
- `tests/test_check_slice_docs.py` — repair a pre-existing failure: the assertion froze the collected slice-document set at `{T00-checker-script.md}` and had failed since T01 added a document. The backend gate cannot be green without it.
- `frontend/src/lib/naming.test.ts` — the first GitHub run exposed a timezone assumption: the test started from UTC midnight and expected `07:00`, which only holds in UTC+7. Repaired to build the Date from local components.
- `tests/test_status_semantics.py` — the same run exposed two races: the tests read `_task_store[task_id]` before the fire-and-forget background job finished. Repaired to poll `/status/{task_id}` until the task is terminal.
- `scripts/build-backend.ps1` — replace the hard-coded local repository root with `$PSScriptRoot` so the release job can build the frozen backend on a runner.
- `packaging/scan2text-backend.spec` — restore the `pathex=[]` placeholder so the build script injects the source path at build time and the committed spec stays machine-independent.
- `docs/slices/T13-ci-workflow.md` (this file).
- `docs/slices/STATE.md`, `docs/slices/README.md`.
- `second-brain/01-Agent-Memory/Phase-S66/slice-T13-CI-WORKFLOW.md` (private vault, not committed).

## Files NOT to touch
- `frontend/` and `src/` — no product code in this slice; they are only ever executed.
- `frontend/package.json`, `frontend/package-lock.json`, `pyproject.toml` dependencies — no dependency change is authorised.
- `src/locales/en.json`, `src/locales/id.json` — the workflow has no user-visible string.
- `docs/slices/HANDOFF-GUIDE.md` — it owns the gate list and the template; this slice obeys it.
- `scripts/check_slice_docs.py` — already green; the workflow only calls it.

## RED tests to write first
File: `tests/test_ci_workflow.py`. Standard library only, because the backend job installs the test subset and no YAML parser. Structural assertions only; the file never asserts on formatting.

Expected backend count: 447 before, 462 after (15 tests).

Named tests:
- `test_workflow_file_exists`
- `test_workflow_triggers_on_push_and_pull_request`
- `test_every_job_runs_on_a_windows_runner`
- `test_workflow_declares_the_five_named_jobs`
- `test_documentation_check_is_declared_before_the_slower_jobs`
- `test_slow_jobs_need_the_documentation_check`
- `test_documentation_job_runs_the_slice_document_checker`
- `test_frontend_job_runs_tests_typecheck_and_build`
- `test_backend_job_runs_the_python_suite_with_the_source_path`
- `test_backend_job_installs_only_the_test_dependency_subset`
- `test_release_job_builds_a_draft_release_from_the_packaging_manifest`
- `test_workflow_caches_frontend_and_python_on_the_lock_files`
- `test_workflow_carries_no_secret_and_no_provider_key`
- `test_no_gate_continues_on_error`
- `test_build_backend_script_derives_its_root_from_its_own_location`

All fifteen fail while `.github/workflows/ci.yml` is absent; the build-script test fails while the script and the packaging spec hard-code a local absolute path.

## Implementation steps
1. Write the RED test and run only it; confirm every test fails for the right reason.
2. Add `.github/workflows/ci.yml`: `on: push` and `pull_request`, `windows-latest`, Python `3.12`, Node `24.20.0`.
3. Job `documentation`: checkout, lock Python, run `py -3.12 scripts/check_slice_docs.py --all`.
4. Job `frontend`: checkout, lock Node, cached `npm ci`, then `npm.cmd run test`, `npm.cmd run typecheck`, `npm.cmd run build`; upload `frontend/dist`.
5. Job `backend`: checkout, lock Python, install the eleven test packages with a comment that the local-inference runtime is excluded on purpose, then run the suite with `PYTHONPATH=src`.
6. Job `rust`: checkout, lock Rust, download the built frontend (Tauri's codegen reads `frontendDist`), then `cargo check --message-format=short`.
7. Job `release`: only on a `v*` tag, after all four gate jobs; read the version from `pyproject.toml`; install the release build dependencies; build the frozen backend and the desktop shell; assemble the portable ZIP; create the release with `--draft`.
8. Replace the hard-coded root in `scripts/build-backend.ps1` with `Split-Path $PSScriptRoot -Parent`, and restore `pathex=[]` in `packaging/scan2text-backend.spec`.
9. Re-run only the targeted test; confirm green. Then run the five gates.

## Verification commands
- py -3.12 -m pytest -q --tb=line tests/test_ci_workflow.py with PYTHONPATH=src (targeted RED then GREEN)
- py -3.12 scripts/check_slice_docs.py --all (exit 0)
- py -3.12 -m pytest -q --tb=line with PYTHONPATH=src at the repo root
- npm.cmd run test in frontend/
- npm.cmd run typecheck in frontend/
- npm.cmd run build in frontend/
- cargo check --message-format=short in frontend/src-tauri/

## New i18n keys
None. The workflow has no user-visible string, so `en.json` and `id.json` are untouched.

## Obsidian update
`second-brain/01-Agent-Memory/Phase-S66/slice-T13-CI-WORKFLOW.md` (the folder that holds the T00 and T01 summaries). It records: what the workflow runs, the runner and toolchain versions, the excluded runtime and why, the cache keys, the release job's version source, the local verification evidence, and what the owner must do to see a green run. It also records that `scripts/build-backend.ps1` had a hard-coded root and now derives it from its own location.

## Definition of done
- [x] RED observed failing, for the right reason, before implementation.
- [x] `tests/test_ci_workflow.py` green.
- [x] Five gates pass and the new counts are recorded in `STATE.md`.
- [x] No new string, so no locale change.
- [x] No new testable DOM element, so no `data-testid` obligation.
- [x] No secret, no key, no absolute local path, no internal jargon in the committed diff.
- [x] The slice snapshot and these handoff notes are updated.
- [x] `docs/slices/STATE.md` and `docs/slices/README.md` are updated.
- [x] The Obsidian summary is written.
- [x] `scripts/check_slice_docs.py` passes for this document.
- [x] The work is committed with the GitHub noreply email.

## Handoff notes
What now works that did not before:
- `.github/workflows/ci.yml` runs the slice-document checker first, then the frontend tests, typecheck, and build, the backend suite, and `cargo check`, on `windows-latest`, on every push and pull request. Any gate error fails the run; nothing continues on error.
- A `v*` tag additionally runs the `release` job, which reads the version from `pyproject.toml`, builds the frozen artifact, and creates a **draft** release. Nothing publishes automatically.
- `scripts/build-backend.ps1` derives its root from `$PSScriptRoot` instead of a hard-coded local path, and `packaging/scan2text-backend.spec` is back to the `pathex=[]` placeholder the script fills in, so the frozen backend can be built on a machine that is not the owner's.

What the next slice may assume without re-verifying:
- The five gates still run locally exactly as before; CI adds no new gate and changes none.
- `tests/test_ci_workflow.py` is hermetic, standard-library only, and asserts structure, not formatting.
- The backend suite collects 462 tests and all of them pass. This slice also repaired `tests/test_check_slice_docs.py`, whose assertion froze the slice-document set at `{T00-checker-script.md}`; the suite was 446 passed and 1 failed at `fe2695d`, so the recorded "447 tests, 1 warning" baseline hid one red test. CI would have caught it; now it does.
- The workflow contains no `secrets.` reference and no provider key. The only credential is the automatic `github.token`, granted `contents: write` on the release job alone, and it is not a stored secret.

What is still open or risky:
- **The first run was red, and that was the point.** The push of `844c103` ran the workflow on GitHub for the first time: the documentation job passed, and the frontend and backend jobs failed on three machine-dependent tests that no local gate could catch — one UTC+7 assumption in `frontend/src/lib/naming.test.ts`, and two races in `tests/test_status_semantics.py` that read the task store before the background job finished. Both were repaired and the run was repeated; the Rust and release jobs were skipped in the red run because they `need` the failed gates.
- **A green run on GitHub needs a push.** The workflow file is new and has never executed on a runner. The owner must push this commit (or open a pull request) and read the Actions tab for the run. The first tag push is what proves the `release` job, because it is the only job that cannot run on a pull request.
- The `release` job installs the full runtime (including `llama-cpp-python`) because the frozen build genuinely needs it; this is the one deliberate, documented exception to the "test subset only" rule, which applies to the `backend` job. A first tag run may be slow, and a source build of `llama-cpp-python` is the most likely failure point. If it fails, move that install to a prebuilt CPU wheel index rather than weakening the gate.
- The `rust` job downloads the `frontend/dist` artifact produced by the `frontend` job, because Tauri's codegen resolves `frontendDist` at macro-expansion time; a fresh checkout has no `dist`. Keep that dependency if the jobs are ever reordered.
- The release job packages the portable ZIP with the same steps as `scripts/package-portable.ps1`, inline, because that script copies `models/` and writes a local debug path that a runner does not have. Folding CI packaging back into the script is a follow-up ticket, not this slice.
- Instruction to the owner for the first green run: open the repository's **Actions** tab, select the `CI` workflow, open the run for this commit, and confirm five green jobs; then push a `v0.1.0`-style test tag to exercise the draft release, and delete it if it is only a probe.
