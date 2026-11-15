# T00 — A checker validates every slice document

## State snapshot
- Last commit: 45bdf97
- Baseline: frontend 710 tests, backend 432 tests
- Open blockers: none

## Goal
A maintainer can run one command and know that every slice document in `docs/slices/` carries the fourteen template sections, names the operating manual it was written against, lists the RED tests it promised, and lists the commands that prove it. The command exits non-zero and names exactly what is missing, so a malformed handoff is caught by a machine instead of by the next model.

## Non-goals
- No continuous integration workflow. The workflow that runs this checker is T13 (issue #9, D-53, D-56).
- No product code change. `frontend/` and `src/` are untouched.
- No new dependency. The Python standard library only.
- No change to the fourteen-section template, the decision log, or the ticket bodies. The script reads the template from the handoff guide.
- No rewriting of the existing design documents (`README.md`, `STATE.md`, `DECISIONS.md`, `specs/`, `tickets/`); they are not slice documents.

## Locked decisions
- D-44 — the fourteen-section slice template, including "Files NOT to touch" and "Handoff notes".
- D-48 — `scripts/check_slice_docs.py`, standard library only, written test-first, fails on a missing section, the read-`AGENTS.md` line, the RED test list, or the verification commands.
- D-52 — the definition of done for a handoff includes "the checker script passes".

## Baseline
- Frontend: 710 tests in 42 files, typecheck 0 errors, build success (2176 modules) — unchanged by this slice.
- Backend: 432 tests before, 447 after (the 15 new checker tests), 1 warning.
- Cargo: `cargo check --message-format=short` clean.
- Before: measured 2026-11-15 at commit `45bdf97`, on Windows.
- After: re-measured 2026-11-15 for T00, on Windows; only the backend count moved.

## Files to touch
- `docs/slices/T00-checker-script.md` — this document.
- `tests/test_check_slice_docs.py` — the RED tests for the checker.
- `scripts/check_slice_docs.py` — the checker itself.
- `docs/slices/HANDOFF-GUIDE.md` — the checker section gains the command, its `--all` and file modes, and one example invocation.
- `docs/slices/STATE.md` — the checker exists; the baseline is unchanged.
- `second-brain/01-Agent-Memory/Phase-S66/slice-T00-CHECKER-SCRIPT.md` — the vault summary.
- `second-brain/00-Current-State.md` — the changelog entry.

## Files NOT to touch
- `frontend/` — no product change; the checker is a documentation tool (slice NON-GOALS).
- `src/` — no backend product change; the checker is not shipped.
- `docs/slices/DECISIONS.md` — the decision log is frozen for this slice (D-43: change the log first, deliberately).
- `docs/slices/HANDOFF-GUIDE.md` template block — the fourteen sections are the single source of truth and the checker derives them from it; only the checker section is edited.
- `docs/slices/tickets/` — the issue bodies are immutable here.
- `docs/slices/specs/` — the specs are already published; T13 owns the workflow that cites them.
- `pyproject.toml` — no dependency change is authorized.

## RED tests to write first
- File: `tests/test_check_slice_docs.py` (new, 15 test functions).
- Expected backend count before: 432. After: 447.
- `test_template_extracts_the_fourteen_sections_from_the_guide` — the template comes from the guide, not a hardcoded list.
- `test_valid_document_passes` — a document built from the template reports no problems.
- `test_missing_section_is_named` — a dropped section is named in the report.
- `test_agents_md_reference_is_required` — the read-`AGENTS.md` rule (D-48).
- `test_red_tests_must_be_named` — the RED test rule (D-48).
- `test_red_tests_need_a_real_test_file_reference` — a bare sentence is not a RED test list.
- `test_verification_commands_must_be_listed` — the verification command rule (D-48).
- `test_handoff_notes_must_not_be_empty` — the handoff notes rule (D-48).
- `test_rewriting_the_guide_changes_the_result` — the guide is the single source of truth.
- `test_every_slice_document_in_the_repository_passes` — the repository's own documents are green.
- `test_collect_ignores_non_slice_files` — only `TNN-*.md` files are slice documents.
- `test_check_paths_rejects_a_missing_document` — a bad path is a failure, not a crash.
- `test_cli_exits_zero_for_a_valid_file` and `test_cli_exits_non_zero_for_a_broken_file` — the exit contract.
- `test_this_slice_document_carries_the_required_text` — this document passes the checker.
- RED is observed as `FileNotFoundError` (no `scripts/check_slice_docs.py`): 15 tests error at collection, then green after the minimal implementation.

## Implementation steps
1. Extract the fourteen headings from the fenced template block in `docs/slices/HANDOFF-GUIDE.md`; this is the only place the list lives.
2. Parse sections of a document by heading level, so a `##` section ends at the next `##` or `#`.
3. Implement the four contract rules of D-48 against the parsed sections.
4. Add `collect_slice_documents`, the `TNN-*.md` glob, so extra design documents never fail the build.
5. Add `check_paths` and `main` with `--all` (default) and explicit file arguments.
6. Refactor only after the targeted test is green; keep the rules in named functions.

## Verification commands
- Targeted: `py -3.12 -m pytest -q --tb=line tests/test_check_slice_docs.py` — expected 15 passed.
- Checker on this document: `py -3.12 scripts/check_slice_docs.py docs/slices/T00-checker-script.md` — expected exit 0.
- Checker on all slice documents: `py -3.12 scripts/check_slice_docs.py --all` — expected exit 0.
- Full backend suite: `$env:PYTHONPATH="src"; py -3.12 -m pytest -q --tb=line` at the repository root — expected 447 passed.
- Frontend: `npm.cmd run test`, `npm.cmd run typecheck`, `npm.cmd run build` in `frontend/` — expected 710 passed, 0 errors, build success.
- Rust: `cargo check --message-format=short` in `frontend/src-tauri/` — expected clean.

## New i18n keys
None. The checker prints English developer text and no user-visible UI string is added, so `frontend/src/locales/en.json` and `id.json` are untouched.

## Obsidian update
Write `second-brain/01-Agent-Memory/Phase-S66/slice-T00-CHECKER-SCRIPT.md` with the outcome, the RED evidence, the gate counts, and the handoff notes. Update the `## Recent Changelog` block of `second-brain/00-Current-State.md` with one line and move the oldest entry to `second-brain/01-Agent-Memory/Archive/state-history.md` if the block exceeds five entries.

## Definition of done
- [ ] RED observed failing for the right reason, with the failure shown.
- [ ] Targeted test green, then the five gates pass.
- [ ] New baseline counts recorded here and in `docs/slices/STATE.md`.
- [ ] `py -3.12 scripts/check_slice_docs.py --all` exits 0.
- [ ] A deliberately broken copy in a temporary directory exits non-zero; the copy is deleted.
- [ ] No new dependency, no secret, no absolute local path, no UI string change.
- [ ] The vault summary is written and `second-brain/00-Current-State.md` is updated.
- [ ] The work is committed with a GitHub noreply email.
- Not layout-visible: no screenshot is required.

## Handoff notes
- What now works: `scripts/check_slice_docs.py` validates any slice document against the fourteen sections read from `docs/slices/HANDOFF-GUIDE.md`, and fails with the missing items named.
- The next slice may assume: run `py -3.12 scripts/check_slice_docs.py --all` before committing; exit 0 means every `docs/slices/TNN-*.md` document is complete.
- The next slice may assume: the template list has one home — the fenced block under "The slice document template" in the guide. Editing that block changes the checker's rules; no script edit is needed.
- T13 (issue #9) may run `py -3.12 scripts/check_slice_docs.py --all` as its own job before the five gates.
- Known limitation: only `docs/slices/TNN-*.md` files are treated as slice documents, so `README.md`, `STATE.md`, `DECISIONS.md`, `specs/`, and `tickets/` are ignored by design.
- Still open: the checker does not verify that a section's prose is substantively true, only that it is present, named, and non-empty; judging quality stays a human decision.
- Decision change: none. D-44, D-48, and D-52 stand exactly as written.
