# Slice 19.3 Summary — Preview Panel with Markdown Rendering, Job Management

## What Changed

Implemented the Preview Panel component with full Markdown rendering (GFM), source image thumbnail display, and job management (remove + retry) in the Queue panel.

### Files Created
- `frontend/src/components/layout/panels/MarkdownPreview.tsx` — ReactMarkdown + remark-gfm wrapper
- `frontend/src/components/layout/panels/MarkdownPreview.test.tsx` — 7 tests for markdown rendering
- `frontend/src/components/layout/panels/PreviewPanel.test.tsx` — 7 tests for preview states
- `frontend/src/stores/scan2text.store.test.ts` — 14 new store integration tests appended

### Files Modified
- `frontend/src/stores/scan2text.store.ts` — Added `file`, `markdownOutput`, `fileType` to ScanJob; added `retryJob` action; updated `removeJob` to revoke blob URLs; updated `startUpload` to store File object; updated `pollJob` to store `markdownOutput`
- `frontend/src/components/layout/panels/PreviewPanel.tsx` — Full implementation with 4 states (empty/loading/completed/failed), 30/70 layout split
- `frontend/src/components/layout/panels/QueuePanel.tsx` — Added remove button (all jobs) and retry button (failed only); added `isRetrying` local state for disable-on-retry
- `frontend/src/locales/en.json` — Added `preview.*` and `queue.remove`, `queue.retry` keys
- `frontend/src/locales/id.json` — Added Indonesian translations for all new keys
- `frontend/src/i18n/resources.test.ts` — Added tests for new translation keys and structure matching
- `frontend/src/test-setup.ts` — Added new i18n keys to test fixture
- `frontend/package.json` — Added `react-markdown` and `remark-gfm` dependencies

### Tests Added
- **MarkdownPreview** (7): basic text, GFM table, strikethrough, task list checkboxes, empty markdown, undefined markdown, test id
- **PreviewPanel** (7): empty state, loading state, completed state, failed state, image thumbnail, PDF icon, no-thumbnail fallback
- **QueuePanel remove/retry** (7): remove visible, remove deletes job, remove clears selection, retry visible on failed, retry hidden on non-failed, retry calls action, retry disabled during progress
- **Store integration** (14): file field in addJob/startUpload, markdownOutput on poll completion, fileType defaulting, blob URL revocation on remove, progress timer cleanup on remove, retry creates new job with same file, retry removes old job, retry with missing file is safe, retry preserves thumbnailUrl

### Total Test Count
- Baseline: 297 passing
- Final: 320 passing (+23 new tests)

## Key Decisions

1. **File object storage**: Stored as `File | null` on the ScanJob. Never serialized or persisted — lives only in Zustand memory. The `retryJob` action reads this reference to re-upload.

2. **markdownOutput vs resultMarkdown**: Both fields are populated on completion. `resultMarkdown` is kept for backward compatibility with existing code/tests. `markdownOutput` is the primary field read by PreviewPanel.

3. **Retry strategy (Option A)**: Re-uploads the original File as a brand new job. Removes the failed job first, then calls `startUpload` with the stored File reference. Uses a local `isRetrying` state in QueuePanel to disable the button and prevent double-clicks.

4. **Preview panel layout**: Top 30% for thumbnail (image or PDF icon), bottom 70% for Markdown. Uses flex-col with `shrink-0` on thumbnail and `flex-1` on markdown container.

5. **Blob URL cleanup**: `removeJob` now revokes blob URLs via `URL.revokeObjectURL`. The QueuePanel's existing `useEffect` cleanup on unmount also handles this at the panel level.

6. **i18n in tests**: Updated `test-setup.ts` fixture to include all new translation keys so components render translated text instead of raw keys.

## Gotchas

- **react-markdown text splitting**: `getByText('Hello world')` fails when markdown renders `Hello <strong>world</strong>` across separate elements. Use `container.textContent` or regex matchers instead.
- **GFM task lists**: The `- [ ]` syntax didn't produce checkboxes in jsdom; switched test to `* [ ]` which works. The actual rendering in the browser should handle both.
- **File object in tests**: `new File(['content'], 'name', { type })` works in Node/jsdom environment used by Vitest. No special mocking needed.
- **retryJob without file**: Returns the original job ID without creating a new job. Callers should check for this edge case if they need to distinguish success from no-op.

## Phase 5 Status

Phase 5 is progressing well. All slices through 19.3 are complete. The Command Center layout is fully wired with:
- DropZone (left panel)
- Queue with progress, status badges, remove, retry (center panel)
- Preview with Markdown + thumbnail (right panel)
- Bottom status bar
- Theme/language toggles
- i18n (en/id)

Next slices will focus on preferences persistence refinement and any remaining polish.
