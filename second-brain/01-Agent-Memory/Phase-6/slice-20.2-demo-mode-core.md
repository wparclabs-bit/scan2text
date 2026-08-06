# Slice 20.2: Demo Mode Core

## What Changed
- Added `IS_DEMO_MODE` flag (exported from `src/lib/demoMode.ts`) to toggle between real API and mock behavior.
- `uploadFile()` in demo mode waits ~500ms, returns `{ task_id: 'demo-' + Date.now() }`, and stores demo task state internally.
- `getTaskStatus()` in demo mode simulates OCR processing: returns `"processing"` initially, then `"completed"` with rich Markdown after ~2 seconds.
- PDF files get rich Markdown output (H1, H2, paragraphs, bulleted list, Markdown table). Image files get simpler Markdown (H1, H2, paragraphs, list) — no tables.
- TopBar renders a visible amber "DEMO" badge when `IS_DEMO_MODE` is true, using i18n key `demo.badge`.
- Added `demo.badge` i18n keys: `"DEMO"` (en) and `"MODE DEMO"` (id).

## Key Decisions
- **Demo mode isolation:** Created separate `demoMode.ts` module with mutable `IS_DEMO_MODE` and `setDemoMode()` so tests can override without module mocking complexity.
- **In-memory demo task store:** Uses a `Map<string, DemoTaskState>` to track simulated task states by taskId.
- **Badge styling:** Amber/yellow pill (`bg-amber-500/20 text-amber-500 border border-amber-500/50`) with `data-testid="demo-badge"`.
- **No task lists in demo Markdown:** Per spec, demo output uses headings, paragraphs, bullets, and tables only — no `- [ ]` checkbox lists.

## Test Coverage
- **api.test.ts:** 21 tests — existing non-demo behavior preserved via `setDemoMode(false)` in beforeEach.
- **api.demo.test.ts:** 7 new tests — upload returns demo task_id, ~500ms delay, PDF gets table, image has no table, processing→completed transition, unknown task returns processing.
- **TopBar.test.tsx:** 2 new tests — badge renders when IS_DEMO_MODE=true, hidden when false.
- Total test count: 348 → 357 (+9 tests).

## Open Questions
- None. Demo mode is fully functional for prototype demonstration.

# Slice 20.2: Demo Mode Core (Mock OCR + Visible Badge)

## Goal
Implement Demo Mode so the app can simulate OCR processing without a real backend, enabling real-person UX testing.

## Files Changed
- `src/lib/demoMode.ts` (Created: `IS_DEMO_MODE` flag, `setDemoMode()`, in-memory task store)
- `src/lib/api.ts` (Modified: Intercepts `uploadFile` and `getTaskStatus` when demo mode is active)
- `src/components/layout/TopBar.tsx` (Modified: Added amber "DEMO" badge)
- `src/locales/en.json` & `src/locales/id.json` (Added `demo.badge` keys)
- `src/lib/api.demo.test.ts` (Created: 7 new demo-specific tests)
- `src/components/layout/TopBar.test.tsx` (Modified: Added badge rendering tests)

## Behavior Changes
1. **Mock Upload:** `uploadFile()` waits ~500ms and returns `demo-{timestamp}` task ID.
2. **Mock Processing:** Status polling returns "processing" initially, then "completed" after ~2 seconds.
3. **Rich Output:** PDFs get Markdown with tables. Images get simpler Markdown (no tables). No `- [ ]` task lists.
4. **Visual Indicator:** TopBar shows an amber "DEMO" pill badge when active.

## Verification Results
- `npm run test`: 357/357 passing ✅
- `npm run typecheck`: PASS ✅
- `npm run build`: SUCCESS ✅
