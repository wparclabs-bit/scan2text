# S11-FIX28a — QueueRowSelect

## What Changed
- Folded prior partial work from aborted FIX28 attempt into this slice.
- `QueuePanel.tsx`: queue row `<div>` now has `tabIndex={0}`, `role="button"`, `aria-selected`, `onClick={() => setSelectedJobId(job.id)}`, `onKeyDown` for Enter/Space, `cursor-pointer`, `focus-visible:ring-2 focus-visible:ring-accent/50 outline-none`.
- Retry button: `e.stopPropagation()` added to prevent row selection when retrying a failed job. Fixed dead `try/catch` around async promise — replaced with `.finally()` for cleanup.
- `QueuePanel.integration.test.tsx`: +2 integration tests (row click selects preview content; retry button stopPropagation).

## Key Decisions
- Folded existing partial work cleanly rather than discarding it. The prior work was functionally correct except for the dead `try/catch`.
- No auto-select behavior change: completing a job still auto-selects per store logic in `setStatus`/`pollJob`.
- No theme tooltip work (deferred to FIX28b).

## Test Coverage
- `clicking a queue row selects that job and preview shows its markdown` — seeds two completed jobs with distinct markdown, clicks each row, asserts `selectedJobId` and preview text.
- `retry button click does NOT trigger row selection (stopPropagation)` — mocks `retryJob`, clicks retry on failed job, asserts `selectedJobId` remains null and `retryJob` was called.
- All 627 existing tests remain green.

## Open Questions
- None. FIX28b (theme tooltip) is separate.
