# Slice 19.4-patch: Zustand Selector Infinite Loop Fix

## Problem
Running `npm run dev` produced a blank white screen. Browser console showed:
- "The result of getSnapshot should be cached to avoid an infinite loop"
- "Uncaught Error: Maximum update depth exceeded"
- Error occurred in `<QueuePanel>` component

## Root Cause
`QueuePanel.tsx:9` used an unstable Zustand selector:
```ts
const jobs = useScan2TextStore((s) => Object.values(s.jobs))
```
`Object.values(s.jobs)` creates a **new array reference on every selector call**, even when the underlying `jobs` record hasn't changed. React's equality check sees a new reference, triggers a re-render, which calls the selector again, producing another new array — infinite loop.

## Fix
Changed to select the stable `jobs` Record reference and compute the sorted array inside `useMemo`:
```ts
const jobsRef = useScan2TextStore((s) => s.jobs)
const jobList = useMemo(() => {
  const values = Object.values(jobsRef)
  return values.sort((a, b) => a.createdAt - b.createdAt)
}, [jobsRef])
```

## Files Changed
- `frontend/src/components/layout/panels/QueuePanel.tsx` — fixed selector + useMemo
- `frontend/src/components/layout/panels/QueuePanel.test.tsx` — restored mocked unit tests
- `frontend/src/components/layout/panels/QueuePanel.integration.test.tsx` — new integration tests (real store, no infinite loop)

## Tests Added/Updated
- `QueuePanel.integration.test.tsx`: 2 new tests
  - "renders queue items with all major statuses without throwing" — renders with queued/processing/completed/failed jobs via real Zustand store
  - "re-renders stably after a store update does not throw" — verifies rerender after `setState` is safe
- Existing 7 mocked unit tests in `QueuePanel.test.tsx` restored to green

## Verification Results
- `npm run test`: 322/322 passing (was 320/320 baseline, +2 new)
- `npm run typecheck`: PASS
- `npm run build`: SUCCESS
- Audit: No other components use the unstable selector pattern (`Object.values()` inside Zustand selector)

## Open Questions
- None. The fix is minimal and targeted. DropZone.tsx has `Object.values(jobs).sort()` but it's computed in the component body (not a selector), so it's safe — just recomputes on each render.
