# S11-FIX28b — PreviewHeaderPosition

## What Changed
- Extracted header buttons (Copy Markdown + Open Folder) into a dedicated `PreviewHeader` function component in `PreviewPanel.tsx`
- Header is now **always rendered** at the top of the panel, regardless of job state (empty/processing/failed/completed) — satisfies PRD structural constancy 0 vs 10 jobs
- Renamed `data-testid="preview-action-header"` → `data-testid="preview-header"`
- Renamed `data-testid="preview-empty"` → `data-testid="preview-empty-state"`
- Empty state block now contains **only** the translated `preview.emptyState` message — zero buttons inside
- Removed duplicated header code from completed-state return branch
- Button styles unchanged: borderless, transparent bg, caramel hover, focus-visible ring

## Key Decisions
- `PreviewHeader` receives `job` prop (can be null in empty state) — copy handler safely uses optional chaining (`job?.resultMarkdown ?? ''`)
- Header background set to `transparent` (was using theme-aware bg color in old implementation) — matches CEO locked decision: "borderless transparent header buttons"
- Single source of truth for header markup eliminates future drift between states

## Test Coverage
- +5 new visual-contract tests in `PreviewPanel.test.tsx`:
  - `preview-header` container exists in empty state with both buttons inside
  - `preview-empty-state` container contains zero buttons
  - `preview-header` exists in processing/failed/completed states (structural constancy)
- Updated existing tests: `preview-action-header` → `preview-header`, `preview-empty` → `preview-empty-state`
- Fixed multi-render DOM pollution in structural constancy test (added `unmount()`)
- Frontend: 630 passed, 0 failures (baseline was 627)

## Open Questions
- None. FIX28c (theme tooltip on header buttons) is a separate slice.
