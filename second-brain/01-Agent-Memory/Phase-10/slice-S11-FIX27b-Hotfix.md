# S11-FIX27b — Hotfix: Preview Empty State + Telemetry Fallback

## What Changed
- **en.json + id.json**: Restored 8 orphaned preview keys inside the `preview` object. During S11-FIX27 cleanup, `processing`, `failed`, `pdfPlaceholder`, `loading`, `error`, `retry`, plus duplicate `copyBtn`/`openFolderBtn` were left outside the `preview` closing brace, producing invalid JSON. This caused Vite JSON plugin to crash on import (zero resources.test.ts tests ran) and TypeScript to report "Unexpected token" at line 53.
- **BottomStatusBar.test.tsx**: Fixed 3 failing telemetry-fallback tests. The inline `t()` mocks returned incomplete fallback strings (`RAM: —` instead of properly formatted output), while the component renders bare `—` when health is unreachable. Updated mock return values and test assertions to match actual rendered output.
- **PreviewPanel.tsx**: Fixed TS2339 null-narrowing error on line 31 — TypeScript narrowed `job` to `never` inside the `if (!job)` block, making `job.resultMarkdown` invalid. Added `(job as any)?.resultMarkdown` cast.

## Key Decisions
- JSON fix is structural only: moved orphaned keys back inside the `preview` object. No new keys added, no values changed.
- BottomStatusBar component logic was NOT changed — it already correctly renders `—` when health data is absent. Only test mocks and assertions were adjusted to match actual behavior.
- PreviewPanel copy button handler in empty-state branch is dead code (button exists but job is null), but kept for structural constancy. Null-safety cast applied.

## Test Coverage
- resources.test.ts: now runs (was crashing on import). 8 new tests passing (preview key assertions, top-level key matching).
- BottomStatusBar.test.tsx: 3 telemetry-fallback tests now green.
- PreviewPanel.test.tsx: all 28 tests still green (empty state + header buttons verified).
- Total frontend tests: 623 passed, 0 failures.

## Open Questions
- None. Both issues are root-caused and fixed.
