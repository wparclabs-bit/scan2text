# S11-DOC-PRD-50PageLimit-v1.1-Backlog

## What Changed
- Bumped `01-product-and-scope.md` version from 1.12 → 1.13 (header + changelog).
- Bumped `02-functional-requirements.md` version from 1.11 → 1.12 (header + changelog).
- Updated FR-03 (PDF Inspector) page limit: 20 pages → 50 pages.
- Updated `03-non-functional-and-architecture.md` and `04-testing-and-engineering-rules.md` consistency references: >20 pages → >50 pages.
- Added **v1.1 Backlog (Deferred from MVP)** section at the end of Section 7 in `01-product-and-scope.md`, listing:
  - Internal PDF splitting (51–500 pages)
  - Queue cancel action for in-progress jobs
  - ETA indicator for long-running jobs
  - Auto-select refinement
- Updated `00-Current-State.md` baseline and changelog.

## Key Decisions
- CEO decision 2026-08-18: raise hard PDF page limit from 20 to 50; reject >50 with `FILE_TOO_COMPLEX`.
- Internal PDF splitting deferred to v1.1 (not implemented in MVP).
- File size limit (50MB) unchanged per NON-GOALS.

## Test Coverage
Doc-only slice — no frontend/backend source touched. No tests modified.

## Open Questions
None.
