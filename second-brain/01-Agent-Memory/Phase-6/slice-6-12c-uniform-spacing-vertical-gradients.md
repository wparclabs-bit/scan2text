# Slice 6.12c — Uniform Spacing, Vertical Gradients, DropZone Dedupe, Full-Height Cards

**Date:** 2026-08-07
**Phase:** 6 (Prototype & Demo Mode)
**Baseline:** 414/414 tests → **Final: 419/419 tests** (+5 new)

---

## What Changed

| File | Change |
|------|--------|
| `src/index.css` | All surface gradients changed from `135deg` diagonal to `to bottom` vertical. Right panel dark surface lightened two steps. |
| `src/components/dropzone/FileDropZone.tsx` | Removed text `<p>` paragraph; added upload SVG icon. Now icon-only inside dashed area. |
| `src/components/layout/panels/PreviewPanel.tsx` | All four states (empty/processing/failed/completed) now use `flex-1 surface-right ... min-w-0 box-border` full-height card layout. No more `max-w-md` centered cards. |
| `src/components/layout/panels/QueuePanel.tsx` | Empty and populated card wrappers gain `min-w-0 box-border`. |
| `src/components/layout/panels/DropZonePanel.tsx` | Card gains `min-w-0 box-border`. |
| `src/components/dropzone/FileDropZone.test.tsx` | +1 test: icon-only assertion. |
| `src/components/layout/panels/PreviewPanel.test.tsx` | +3 tests: flex-1 card for empty/processing/failed states. |
| `src/components/layout/panels/QueuePanel.test.tsx` | +1 test: min-w-0 box-border on card wrapper. |

---

## Key Decisions

1. **Vertical gradients over diagonal:** CEO wanted top-to-bottom sheen matching shadcn stat-card sample. Changed all `linear-gradient(135deg, ...)` to `linear-gradient(to bottom, ...)`. Lighter stop at 0% (top), base surface at 100% (bottom).

2. **Right panel lightening:** Current dark right was `#111114 → #0a0a0c` (too dark, nearly black). New: `#202024 → #18181b`. Left and center surfaces unchanged per locked rule.

3. **Drop text dedupe:** FileDropZone inner area now has only an upload SVG icon — zero text paragraphs. The big bold heading in DropZonePanel (`dropzone.clickLabel`) is the single text instance describing the drop action. Hint paragraph at card bottom retained (informational, not drop-action text).

4. **Full-height empty cards:** PreviewPanel empty/processing/failed states previously rendered `max-w-md w-full` centered cards that didn't fill the panel. Now all states use `flex-1` card that stretches to match left/center panel bottom edge.

5. **Uniform alignment:** All three panel cards use `flex-1 min-w-0 box-border overflow-hidden flex flex-col` ensuring pixel-perfect bottom alignment regardless of content height.

---

## Surface Hex Table (Dark Mode)

| Panel | Top (lighter stop) | Bottom (base surface) |
|-------|-------------------|----------------------|
| Left (Drop Zone) | `#2e2e34` | `#27272a` |
| Center (Queue) | `#1e1e22` | `#18181b` |
| Right (Preview) | `#202024` | `#18181b` |
| Action Header | `#1e1e22` | `#18181b` |

## Surface Hex Table (Light Mode)

| Panel | Top (lighter stop) | Bottom (base surface) |
|-------|-------------------|----------------------|
| Left (Drop Zone) | `#e4e4e7` | `#d4d4d8` |
| Center (Queue) | `#d4d4d8` | `#c4c4cc` |
| Right (Preview) | `#c4c4cc` | `#b4b4be` |
| Action Header | `#f0f0f3` | `#e4e4e7` |

---

## Test Coverage

- **419 total tests** (414 baseline + 5 new)
- All passing, typecheck zero errors, build green
- New tests cover: icon-only dropzone, full-height flex-1 cards for all preview states, min-w-0 box-border on queue card

---

## Open Questions

- None. Slice complete.

---

## Next

Slice 6.13 — Share button (bottom bar right, popup + shortened link + copy).
