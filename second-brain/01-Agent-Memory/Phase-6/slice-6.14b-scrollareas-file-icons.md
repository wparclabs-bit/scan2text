# Slice 6.14b: ScrollAreas + File Type Icons

## What Changed

- Installed `@radix-ui/react-scroll-area` (new dependency)
- Created `src/components/ui/scroll-area.tsx` — shadcn-style ScrollArea component with ScrollBar sub-component
- Added warm-styled thin scrollbar CSS to `src/index.css` (4px width, caramel thumb dark #E3A55F / coffee light #92400E, zero CPU at idle)
- Wrapped QueuePanel job list in `<ScrollArea data-testid="queue-scroll-area">` with h-full/min-h-0 scroll chain
- Wrapped PreviewPanel Markdown article in `<ScrollArea data-testid="preview-scroll-area">` replacing manual overflow-y-auto div
- Wrapped DropZonePanel inner content in `<ScrollArea data-testid="dropzone-scroll-area">` for future-proofing
- Added regression test: clicking a completed job switches Markdown preview content
- Added 7 new tests across ScrollAreas.test.tsx and PreviewPanel.test.tsx

## Key Decisions

- `fileKind.ts` and queue icon rendering were already implemented in prior slices (verified: 8 unit cases, lucide-react FileImage/FileText with correct testids)
- ScrollArea uses Radix UI primitives directly (no extra wrapper libs)
- Scrollbar styling is pure CSS, no JS, applied via `.scrollbar` and `.thumb` class selectors that match Radix output
- Dropzone ScrollArea present but not strictly necessary for current content height (future-proof per spec)

## Test Coverage

- **Before:** 514 passing
- **After:** 521 passing (+7)
- New tests:
  - QueuePanel scroll area renders with data-testid
  - QueuePanel keeps card height fixed with 20 fake jobs, all items inside scroll area
  - QueuePanel scroll area contains job items
  - PreviewPanel scroll area renders for completed jobs
  - PreviewPanel scroll area absent when no job selected
  - DropZonePanel scroll area renders with data-testid
  - Regression: switching selectedJobId switches preview Markdown content

## Open Questions

- None
