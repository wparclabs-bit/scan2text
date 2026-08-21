# Slice S35 — Fix Stale WelcomeModal Test

**Date:** 2026-08-24
**Status:** COMPLETE
**Parent Phase:** S35-GATE-SHELL (unblocked)

## Problem
`WelcomeModal.test.tsx` had a stale test ("renders welcome body with 20MB limit copy") that used `screen.getByText(/.../)`. The component was updated to render dual-language bullet lists (EN + ID), producing two matching elements for each string. jsdom's `getByText` throws "Found multiple matches" — a known gotcha per AGENTS.md 2.5.

## Diagnosis
- **Component (`WelcomeModal.tsx`):** Correct. Renders 8 `<li>` items — 4 EN bullets + 4 ID bullets.
- **Test:** Stale. Used `screen.getByText()` which cannot disambiguate duplicate text across languages.
- **Precedent:** S34 test (`s34-frontend-polish.test.tsx:66`) correctly uses `modal.textContent` via `document.querySelector('[data-testid="welcome-modal"]')`.

## Fix
Replaced three `screen.getByText(/.../)` assertions with `container.textContent`-style checks against the modal element queried by `data-testid`:
```ts
const modal = document.querySelector('[data-testid="welcome-modal"]') as HTMLElement | null
expect(modal).toBeInTheDocument()
expect(modal!.textContent).toContain('Turn your scanned documents')
expect(modal!.textContent).toContain('20MB')
expect(modal!.textContent).toContain('50 pages')
```

## Evidence
- **RED:** `npx vitest run --config vite.test.config.ts src/components/layout/WelcomeModal.test.tsx` → 1 failed ("Found multiple elements with the text: /Turn your scanned documents...")
- **GREEN:** Same command → 7 passed, 0 failed (1.28s)

## Scope
- Only `frontend/src/components/layout/WelcomeModal.test.tsx` changed.
- Zero source file modifications.

## Next
S35-GATE-SHELL can now proceed — the frontend test gate is unblocked.
