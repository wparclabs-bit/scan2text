# S11-DOC-Targeted-Test-Rule

## What Changed
- AGENTS.md Section 3.6: Added new bullet point enforcing targeted test execution during TDD phases.
- `second-brain/00-Current-State.md`: Changelog entry added.

## Key Decisions
- Rule: During RED and GREEN phases of `/tdd`, run ONLY the target test file. Full `npm run test` suite is reserved for the final VERIFICATION gate only.
- Rationale: Kilo context was bloating because the full suite (639 tests) dumps thousands of tokens into the context window during RED/GREEN phases.
- This is a doc-only slice — no code, no tests, no config changes.

## Test Coverage
N/A — doc-only change.

## Open Questions
None.
