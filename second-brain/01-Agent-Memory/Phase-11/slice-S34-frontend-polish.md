# Slice S34-FRONTEND-POLISH

**Date:** 2026-08-24
**Phase:** S34-FRONTEND-POLISH
**Status:** COMPLETE → READY FOR CEO MANUAL VERIFICATION
**Baseline:** S37-GATE-REBUILD-VERIFY (COMPLETE) — 666 frontend tests passed, typecheck clean

## Objective
Implement three locked UI polish items from Phase-11 QA in the frontend with ONE RED/GREEN TDD cycle and targeted tests only.

## QA Gaps Addressed
- QA 5.3.1: Welcome modal unreadable in light mode
- QA 4.8: long-running hint toast missing i18n key
- QA 4.4 / 6.1: FILE_TOO_COMPLEX red-dot tooltip needs locked copy

## Changes Made

### New Test File
- `frontend/src/__tests__/s34-frontend-polish.test.tsx` — 9 assertions covering all three polish items

### Locale Keys Added (both en.json and id.json)
- `queue.longDocHint` EN: "Still processing — please be patient."
- `queue.longDocHint` ID: "Masih diproses — mohon bersabar."
- `errors.fileTooComplexLocked` EN: "File too large or complex. Limits: 20 MB per file · 50 pages per PDF. Split bigger PDFs and retry."
- `errors.fileTooComplexLocked` ID: "File terlalu besar atau kompleks. Batas: 20 MB per file · 50 halaman per PDF. Pecah PDF besar lalu coba lagi."
- `welcome.bullet1` through `welcome.bullet4` — derived from existing body text, rendered in both EN and ID

### Component Changes
- **WelcomeModal.tsx**: Added `DialogOverlay` with `bg-black/50`; replaced `<p>` body with `<ul>` of 4 bullets rendered twice (EN then ID); added `text-left` className
- **QueuePanel.tsx:126**: Changed tooltip key from `errors.fileTooComplexRejected` to `errors.fileTooComplexLocked`

### Existing Usage Found
- `queue.longDocHint` was already used at `scan2text.store.ts:613` via `i18n.t('queue.longDocHint')` — only the locale keys were missing
- `FILE_TOO_COMPLEX` tooltip wiring was already present in QueuePanel.tsx — only the key reference needed updating

## Quality Gates
- **Targeted test**: 9 passed, 0 failed
- **Typecheck**: 0 errors
- **i18n keys verified**: `longDocHint` present in both en.json and id.json
- **Full suite**: Deferred to S35 GATE (per slice constraints)

## Non-Goals (Not Touching)
- Zero backend changes
- Zero Tauri/Rust changes
- No shell rebuild
- No 2-minute timer logic changes
- No welcome dismissal logic changes
- No layout fraction changes

## CEO Manual Verification Required
- Welcome modal: bullet lists visible and readable in both light and dark mode
- Welcome modal: 50% black backdrop (not the previous 80%)
- Queue row with FILE_TOO_COMPLEX error: red-dot tooltip shows locked copy
- App toast after 2 min processing: shows "Still processing — please be patient."

## Commit
Changes scoped to `frontend/` and `second-brain/` only.
