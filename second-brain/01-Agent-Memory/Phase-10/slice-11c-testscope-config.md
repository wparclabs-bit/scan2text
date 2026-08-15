# S10-FIX11c: Scope vitest discovery to frontend/src

## What Changed
- Added `test.include: ['src/**/*.test.ts', 'src/**/*.test.tsx']` to `frontend/vite.test.config.ts`
- This prevents vitest default discovery from picking up spurious test files in `.kilo/worktrees/sprout-brush/frontend/src/`

## Key Decisions
- Used `test.include` (not `test.exclude`) for positive scoping — explicit about what to run
- Pattern matches both `.test.ts` and `.test.tsx` to cover all existing test files
- Config file is `vite.test.config.ts` (not `vitest.config.ts`), referenced explicitly in `package.json` test script

## Test Coverage
- Full suite: 38 test files, 619 tests, all green
- No worktree paths (`sprout-brush`) appear in test output
- typecheck: clean (zero errors)
- build: success (pre-existing chunk size warning only)

## Open Questions
- None. Housekeeping of `.kilo/worktrees/sprout-brush` deferred per NON-GOALS.
