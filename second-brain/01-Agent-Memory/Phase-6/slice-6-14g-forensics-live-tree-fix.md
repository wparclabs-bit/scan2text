# Slice 6.14g — Forensics-First Live-Tree Fix

**Date:** 2026-08-07
**Phase:** 6 (Prototype & Demo Mode)
**Status:** DONE

## What Changed

| File | Action | Reason |
|------|--------|--------|
| `frontend/src/components/layout/panels/DropZonePanel.tsx` | Modified | Hint text: added `font-bold text-[#1F150C] shrink-0` |
| `frontend/src/components/DropZone.tsx` | Deleted | Ghost — not imported by app tree |
| `frontend/src/components/DropZone.test.tsx` | Deleted | Ghost test for orphaned component |
| `frontend/src/debug-drop.test.tsx` | Deleted | Ghost debug harness importing deleted ghost |
| `AGENTS.md` | Modified | Added 6.14g lessons learned |
| `second-brain/00-Current-State.md` | Modified | Updated slice status + test count |

## Key Decisions

1. **Forensics before edits**: Traced import chain App.tsx → CommandCenterLayout → QueuePanel/DropZonePanel to prove LIVE components. Confirmed previous status-slot/flex-1/bold-text code already landed in LIVE files (QueuePanel.tsx, DropZonePanel.tsx). No source port needed.

2. **Ghost deletion**: Found 3 orphaned files:
   - `DropZone.tsx` — old component, only imported by its own test
   - `DropZone.test.tsx` — tests the ghost component
   - `debug-drop.test.tsx` — debug harness importing the ghost
   All deleted in one atomic sweep to prevent TS build failures.

3. **Single source fix**: Only defect was DropZonePanel hint text missing `font-bold text-[#1F150C] shrink-0`. Fixed in one line.

## Test Coverage

- **Before:** 558 tests (35 files)
- **After:** 549 tests (33 files)
- **Delta:** -9 tests (all from deleted ghost files)
- **Typecheck:** PASS
- **Build:** PASS

## Open Questions

None.
