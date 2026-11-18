# T14 - A timing test stops depending on how fast the machine is

Read `AGENTS.md` first. It owns the house rules. This document cites `docs/slices/DECISIONS.md`.

## State snapshot
- Last commit: `d07018d` (T07 handoff notes), branch `main`
- Baseline: frontend 764 tests in 53 files, backend 537 tests (1 warning), typecheck 0 errors, build success, cargo check clean (2026-11-17, Windows)
- Open blockers: none

## Goal
The frontend suite passes or fails on the code, never on how busy the runner is. One test asserts that a ten millisecond delay consumed at least ten milliseconds of wall-clock time; on a loaded runner it measured nine, and the workflow reported a red build for a defect that does not exist in the product. The delay helper keeps its behaviour, the test drives the clock instead of the machine, and every other test that measures wall-clock time or waits on a real timer is made deterministic too.

## Non-goals
- No production behaviour change; `frontend/src/lib/api.ts` keeps the delay helper exactly as it is.
- No change to the delay helper's semantics, its signature, or its callers.
- No change to the cloud engine, the failure taxonomy, the consent gate, or the text-layer reader.
- No backend change, no Rust shell change, no command-center layout change.
- No dependency installation and no manifest change.
- No i18n change; no user-visible string is added.
- No new test file outside the existing frontend test layout; the sweep edits existing test files in place.

## Locked decisions
- D-46 - the five gates mean the same thing everywhere, so a gate must not report a defect the product does not have.
- D-52 - the definition of done for a handoff: the gates are green and the recorded counts are the measured counts.
- D-48 - the slice-document checker validates every slice document before a commit.
- D-44 - the slice document is written before the code, and names the exact files and tests.
- The operating manual's testing rule: fake timers are used for anything that waits.

## Baseline
- Frontend: 764 tests in 53 files; typecheck 0 errors; build success; cargo check clean.
- Backend: 537 tests, 1 warning (repo root, `PYTHONPATH=src`).
- The frontend suite is the only part of this slice that changes; the backend count stays 537.
- The failing pattern is in `frontend/src/lib/api.test.ts`: the `defaultDelay` test measures `Date.now()` across a real `setTimeout` and asserts `elapsed >= 10`.

## Files to touch
- `frontend/src/lib/api.test.ts` - the target: the `defaultDelay` test drives fake timers instead of measuring wall-clock time.
- `frontend/src/App.test.tsx` - twelve fixed 50 ms sleeps replaced by waits on the observable condition.
- `frontend/src/components/layout/BottomStatusBar.test.tsx` - five fixed 50 ms sleeps replaced by waits on the rendered telemetry.
- `frontend/src/hooks/useBackendBootFailedListener.test.ts` - one zero-delay sleep replaced by a wait on the toast call.
- `frontend/src/stores/scan2text.store.test.ts` - two zero-delay sleeps replaced by a wait on the cleanup call; the `Date.now()` default-`createdAt` assertion moved onto a fixed fake clock.
- `docs/slices/T14-deterministic-timing.md` - this document.
- `docs/slices/STATE.md`, `docs/slices/README.md` - the new baseline and the new ticket row.
- `docs/slices/tickets/T14-deterministic-timing.md` - the local copy of issue #20, added to the tracker index.
- `second-brain/01-Agent-Memory/Phase-S66/slice-T14-DETERMINISTIC-TIMING.md` (private vault, not committed).
- `second-brain/00-Current-State.md` (private vault, not committed).

## Files NOT to touch
- `frontend/src/lib/api.ts` - the production delay helper keeps its behaviour exactly; only the test changes.
- `frontend/src/components/`, `frontend/src/stores/`, `frontend/src/hooks/` product sources - no production behaviour changes in this slice.
- `src/scan2text/`, `tests/` - no backend change; the backend suite is a gate, not a target.
- `frontend/src-tauri/` - no Rust shell change; `cargo check` is a gate only.
- `src/locales/en.json`, `src/locales/id.json` - no user-visible string is added.
- `frontend/package.json`, `frontend/package-lock.json` - no dependency is added.
- `docs/slices/DECISIONS.md`, `docs/slices/HANDOFF-GUIDE.md`, `scripts/check_slice_docs.py` - the decision log, the template, and the checker are inputs, not targets.

## RED tests to write first
File: `frontend/src/lib/api.test.ts`. The existing test `defaultDelay > resolves after the given number of milliseconds` is the machine-dependent one; it is replaced by two fake-timer tests.

Expected frontend count: 764 before, 765 after (one test replaced by two); 53 files before and after.

Named tests:
- `defaultDelay > does not resolve before the timer advances`
- `defaultDelay > resolves after the timer advances by the delay`

RED evidence, before any test file changes:
- A temporary probe (not committed) repeats the old assertion 2000 times while the machine is loaded and counts the iterations where the measured wall-clock elapsed time is below the requested 10 ms.
- The same probe records the gap between the monotonic clock that drives the timer and the wall clock that the assertion reads, which is the mechanism of the CI failure.

## Implementation steps
1. Write this slice document; run `py -3.12 scripts/check_slice_docs.py docs/slices/T14-deterministic-timing.md`; confirm exit 0.
2. Write the temporary probe; run it unloaded and under CPU load; record the observed counts and the smallest measured elapsed time.
3. Confirm the RED on the target file: the old assertion is shown to be able to read below the requested delay.
4. Rewrite the `defaultDelay` test with `vi.useFakeTimers()`: the promise must not resolve while the clock is still short of the delay, and it must resolve once the clock advances past it.
5. Run only `frontend/src/lib/api.test.ts`; confirm green.
6. Sweep the rest of the frontend suite for the same pattern and repair each finding: a fixed sleep becomes a wait on the condition the test actually asserts, and a wall-clock comparison moves onto a fixed fake clock.
7. Run each swept test file on its own; confirm green.
8. Run the full frontend suite three times in a row; confirm all three runs pass.
9. Run the five gates and the slice-document checker; record the measured counts.
10. Update `docs/slices/STATE.md`, `docs/slices/README.md`, the vault summary, and `second-brain/00-Current-State.md`; commit with the GitHub noreply email; push.

## Verification commands
- npm.cmd run test -- src/lib/api.test.ts in frontend/ (targeted RED then GREEN)
- npm.cmd run test in frontend/ (three consecutive runs)
- py -3.12 -m pytest -q --tb=line at the repo root with PYTHONPATH=src
- npm.cmd run typecheck in frontend/
- npm.cmd run build in frontend/
- cargo check --message-format=short in frontend/src-tauri/
- py -3.12 scripts/check_slice_docs.py --all at the repo root

## New i18n keys
None. No user-visible string is added; `en.json` and `id.json` are untouched.

## Obsidian update
`second-brain/01-Agent-Memory/Phase-S66/slice-T14-DETERMINISTIC-TIMING.md` (the folder that holds the Cloud engine slice summaries). It records: the machine-dependent assertion and the probe evidence, every swept file and the reason for its change, the three consecutive green suite runs, the five gate results with counts, and the fact that no product behaviour changed. `second-brain/00-Current-State.md` records the new baseline and moves the oldest changelog entry to the archive.

## Definition of done
- [x] RED observed, for the right reason, before the test was changed.
- [x] The delay test drives fake timers: it proves the promise does not resolve before the timer advances, and resolves after it advances.
- [x] `frontend/src/lib/api.ts` is unchanged; the delay helper behaves exactly as before.
- [x] Every frontend test that measured wall-clock time or waited on a real timer is swept and made deterministic; each changed file is listed.
- [x] The full frontend suite passes three consecutive runs in a row.
- [x] The five gates pass and the new counts are recorded in `docs/slices/STATE.md`.
- [x] No new string, so no locale change.
- [x] No new testable DOM element, so no `data-testid` obligation.
- [x] No secret, no key, no absolute local path, no internal jargon in the committed diff.
- [x] The slice snapshot and these handoff notes are updated.
- [x] `docs/slices/STATE.md` and `docs/slices/README.md` are updated.
- [x] The Obsidian summary is written.
- [x] `scripts/check_slice_docs.py` passes for this document and for every other document.
- [x] The work is committed with the GitHub noreply email and pushed.

## Handoff notes
What now works that did not before:
- The `defaultDelay` test in `frontend/src/lib/api.test.ts` no longer reads the wall clock. It installs fake timers, proves the promise is still pending while the fake clock is short of the delay, advances the clock past the delay, and proves the promise resolves. The production helper `defaultDelay` in `frontend/src/lib/api.ts` is byte-for-byte unchanged.
- The rest of the frontend suite has no fixed real-time sleep left. The twelve sleeps in `frontend/src/App.test.tsx` and the five in `frontend/src/components/layout/BottomStatusBar.test.tsx` now wait on the condition the test asserts; the one zero-delay sleep in `frontend/src/hooks/useBackendBootFailedListener.test.ts` and the two in `frontend/src/stores/scan2text.store.test.ts` wait on the call the test asserts; the `createdAt` default assertion in the store test reads a fixed fake clock.

What the next slice may assume without re-verifying:
- The frontend suite is deterministic with respect to machine load: no test asserts on elapsed wall-clock time, and no test depends on a real timer firing within a fixed budget.
- The frontend count is 765 tests in 53 files; the backend count is unchanged at 537 with one warning.
- `vi.waitFor` is the established pattern in this repository for waiting on a condition; the suite already used it before this slice.

What is still open or risky:
- The probe evidence is a local observation of the mechanism; the definitive proof is the green GitHub run on the pushed commit.
- The sweep covered every test file under `frontend/src` that Vitest collects (`src/**/*.test.ts`, `src/**/*.test.tsx`). A future test that waits on a real timer must be written with fake timers or a condition wait from the start.
- The backend suite and the Rust shell are untouched by this slice; their gates still run on every change.

Verification record:
- Commits: `ecbd6be` (the slice: tests, slice document, ticket, index) and `c8e9a83` (the state refresh).
- GitHub Actions run `44235293955` on `main` at `c8e9a83` is **green**: Documentation check, Frontend checks, Backend checks, and Rust check all succeeded; the Draft release job was skipped because the push carried no tag.
