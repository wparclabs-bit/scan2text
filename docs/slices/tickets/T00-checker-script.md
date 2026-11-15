## Parent

Spec #5 — Handoff and operations.

## What to build

A command that validates every slice document against the agreed template and fails loudly when a document is incomplete, so that the handoff format cannot drift from one slice to the next. It uses only the Python standard library and is written test-first.

## Decisions

D-44 (fourteen-section template), D-48 (checker contract and standard-library-only rule), D-52 (definition of done for a handoff).

## Acceptance criteria

- [ ] The checker exits non-zero when a slice document is missing any template section, the line pointing to the operating manual, the named RED tests, the verification commands, or the handoff notes, and it names what is missing.
- [ ] The checker exits zero for a document that satisfies every rule.
- [ ] Its own test suite is written test-first, uses only the standard library, and passes.
- [ ] The handoff guide documents the command with one example invocation.

## Blocked by

None (can start immediately).
