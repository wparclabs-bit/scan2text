# Handoff Guide

How to execute a Scan2Text slice, and how to hand it to another model without losing anything.

## The pipeline

```
grill            ->  docs/slices/DECISIONS.md      (what was decided and why)
                    docs/slices/HANDOFF-GUIDE.md   (this file)
                    docs/slices/STATE.md           (where the work stands)
                    docs/slices/README.md          (the index)

to-spec          ->  three specs                   (one per area, decision IDs cited)

to-tickets       ->  twelve tickets                (vertical tracer bullets, blockers named)

ticket           ->  docs/slices/TNN-slug.md       (one slice document per ticket)

execute          ->  code, tests, docs, commit     (RED first, five gates, state refreshed)
```

Each step writes one artifact that the next step reads. Nothing is duplicated: the tracker holds status, the slice document holds execution detail, this log holds reasoning.

## Before you start

1. **Read `AGENTS.md` first.** It owns the house rules. This guide only summarises them.
2. Read the slice document end to end. It names the decision IDs it relies on.
3. Look up those IDs in `docs/slices/DECISIONS.md`. If a decision looks wrong, stop and change the log first, then change the slice.
4. Read `docs/slices/STATE.md` for the current baseline counts and open blockers.

## House rules, condensed

- Test first: write the RED test, run it, watch it fail for the right reason, then implement.
- PowerShell only for commands. Never bare `python`; use `py -3.12`.
- Every new user-visible string exists in both `src/locales/en.json` and `src/locales/id.json`.
- Every testable element carries `data-testid`.
- No dependency install without explicit approval in the slice document.
- Never paste a secret into code, a test, a log, a document, or a commit message.

## The five gates

Run them in this order. The last one may only run when the others pass.

1. **Targeted test** — the slice's own test file, during RED and GREEN.
2. **Full suite** — `npm run test` in `frontend/`, then `py -3.12 -m pytest -q --tb=line` at the repository root.
3. **Typecheck** — `npm run typecheck` in `frontend/`.
4. **Build** — `npm run build` in `frontend/`.
5. **Cargo check** — `cargo check --message-format=short` in `frontend/src-tauri/`.

Record the new baseline counts in the slice document's state snapshot and in `docs/slices/STATE.md`.

Continuous integration runs these same five gates on a Windows runner, plus the slice-document checker. No secret and no API key is ever present in CI.

## The slice document template

Every slice document uses these fourteen sections, in this order.

```markdown
# TNN — <title>

## State snapshot
- Last commit: <sha>
- Baseline: frontend <n> tests, backend <n> tests
- Open blockers: <none | list>

## Goal
One paragraph, from the user's point of view.

## Non-goals
Bullets. What this slice deliberately does not do.

## Locked decisions
- D-nn — one-line summary
- D-nn — one-line summary

## Baseline
Current counts and the last known good state.

## Files to touch
Exact paths.

## Files NOT to touch
Exact paths, with one line on why each is off limits.

## RED tests to write first
Exact test file paths and test names. Expected count before and after.

## Implementation steps
Ordered, small, each one green on its own.

## Verification commands
Command, then the expected result.

## New i18n keys
English and Indonesian keys, both listed.

## Obsidian update
Which summary file to write, and what it records.

## Definition of done
The checklist from the decision log, plus a screenshot if the change is layout-visible.

## Handoff notes
What the next slice may assume, and what is still open.
```

## Writing the slice document

- **Write for a model that has never seen this repository.** Assume no context beyond `AGENTS.md` and the decision log.
- **One line per fact.** No paragraphs of background.
- **Name exact files.** A slice that says "the settings service" instead of the path wastes a round trip.
- **Name exact tests.** "Tests cover the new status" is not a plan; the test name is.
- **State the counts.** "710 to 716" is checkable; "more tests" is not.
- **Keep it public-safe.** No internal jargon, no absolute local paths, no secrets, no personal data.
- **Do not repeat the reasoning.** Cite the decision ID and add the one line the executing model needs.

## Anti-patterns, from this repository's history

| Anti-pattern | What it looks like | What to do instead |
|---|---|---|
| Ghost edit | Editing a file that nothing imports any more | Trace the import chain first; list the file under "Files NOT to touch" if it is off limits |
| Silent behaviour change | A fallback quietly switches engines, models, or privacy posture | Every switch is explicit, visible, and reversible |
| "Works on my machine" | A test passes locally, fails in the frozen build | Run the real path: the frozen app or the dev boot, not only unit tests |
| Unapproved dependency | A new package appears because it was convenient | Ask first; record the approval in the slice document |
| Hidden i18n drift | A string added to English only | Both locale files, same commit |
| Undocumented secret | A key pasted into a test or a log | Credential Manager only; never in the repository |
| Silent fixture drift | A golden file edited to match a broken output | Fix the code, not the golden; the fixture is the contract |

## Before you commit

- [ ] RED was observed failing, for the right reason.
- [ ] The five gates pass, and the new counts are recorded.
- [ ] Every new string is in English and Indonesian.
- [ ] Every new testable element has a `data-testid`.
- [ ] No secret, no absolute local path, no internal jargon in the diff.
- [ ] The slice document's state snapshot and handoff notes are updated.
- [ ] `docs/slices/STATE.md` is updated.
- [ ] The Obsidian summary is written.
- [ ] `scripts/check_slice_docs.py` passes for this document.
- [ ] The work is committed.

## Handoff notes

The last section of a slice document is the only thing the next model reads first. Write it for someone who knows nothing:

- What now works that did not before.
- What the next slice may assume without re-verifying.
- What is still broken, deferred, or risky.
- Any decision that turned out differently than expected, and the new decision ID for it.

## The checker

`scripts/check_slice_docs.py` validates every slice document against the template above. The section list is read from the fenced template block, so that block is the single source of truth. Standard library only, written test-first (D-48).

Run it before each commit, over every `docs/slices/TNN-*.md` document:

```
py -3.12 scripts/check_slice_docs.py --all
```

It fails, naming what is missing, when a document is missing a section, missing the "read `AGENTS.md` first" line, missing its RED test list, missing its verification commands, or leaving its handoff notes empty.
`--all` is the default, so `py -3.12 scripts/check_slice_docs.py` is the same check.

One document, for example after editing a slice document:

```
py -3.12 scripts/check_slice_docs.py docs/slices/T00-checker-script.md
```

Exit codes: `0` all documents valid, `1` at least one document invalid, `2` the guide or a requested file could not be read. Only `docs/slices/TNN-*.md` files are treated as slice documents; `README.md`, `STATE.md`, `DECISIONS.md`, `specs/`, and `tickets/` are ignored by design.

