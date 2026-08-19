# S11-FIX65B: Test Mock Fix — setShowDownloader Mutates State

**Date:** 2026-08-19
**Slice:** S11-FIX65B — FIX the failing App.test.tsx mock so the FIX65 gate unblocks
**Status:** COMPLETE
**Files changed:** `frontend/src/App.test.tsx` (test-only; zero production edits)

---

## Root Cause

`src/App.test.tsx` (line 29 pre-fix) mocked `setShowDownloader` as a bare `vi.fn()` no-op:

```ts
const mockSetShowDownloader = vi.fn()
```

`App.tsx:48` correctly calls `setShowDownloader(true)` when the first health response has `files_present=false`, but the mock never mutated `_mockScan2TextStoreState`, so the `model-downloader-modal` assertion at line 342 failed (`document.querySelector('[data-testid="model-downloader-modal"]')` → `null`).

**Deeper finding:** a plain mutation (`vi.fn((val) => { _mockScan2TextStoreState.showDownloader = val })`) is NOT sufficient by itself. The mocked `useStore` hook was a pure selector with no subscription (`selector(store.getState())`), and `App.tsx` performs no `useState` update after `setShowDownloader(true)` in the `files_present=false` branch — so the component never re-renders and the modal is never mounted. The mock had to be made **reactive**, like the real Zustand store.

---

## Fix Applied (test mock only)

1. **Reactive mock store** (`vi.mock('./stores/scan2text.store')` in `App.test.tsx`):
   - `setShowDownloader` is now a `vi.fn` that mutates `_mockScan2TextStoreState.showDownloader` AND notifies subscribers.
   - A `listeners` Set + `subscribe(listener)` closure implement a minimal subscribe/notify mechanism.
   - The `useStore` hook is implemented with `React.useSyncExternalStore(subscribe, () => selector(store.getState()))`, so a state mutation re-renders consuming components exactly like the real Zustand store.
   - `React` is obtained via `await import('react')` inside the async vi.mock factory (top-level imports are not referenceable inside vi.mock factories due to hoisting).
2. **State reset in `beforeEach`:** added `_mockScan2TextStoreState = { jobs: {}, showDownloader: false }` — once the setter mutates state, `showDownloader=true` would otherwise leak into the next test (the `files_present=true` "does NOT show modal" test) and fail. This mirrors the existing `mockState` reset pattern for the preferences store.

---

## TDD Evidence

- **RED (pre-fix):** `npm run test -- src/App.test.tsx` → 30 passed, **1 failed** — `shows model-downloader-modal when first health response has files_present=false` (line 361: modal is `null`).
- **GREEN (post-fix):** `npm run test -- src/App.test.tsx` → **31 passed, 0 failed**.
- **Typecheck:** `npm run typecheck` (`tsc -b`) → **zero errors**.

---

## Verification

- Targeted test `src/App.test.tsx`: **31/31 passed** (full suite deferred to FIX65 GATE slice per AGENTS.md 9 clarification).
- Typecheck clean.
- Zero production code files modified (`git diff --stat` → only `frontend/src/App.test.tsx`).
- No `App.tsx` edits, no backend edits, no build, no Tauri/Rust changes.

---

## NON-GOALS confirmed

- No production source changes (App.tsx untouched).
- No backend changes.
- No full test suite run (targeted only).
- No `npm run build`.
