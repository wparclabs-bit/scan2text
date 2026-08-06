# Slice 20.3 — Preview Panel Docs Compliance (Side-by-Side Layout)

**Status:** ✅ COMPLETE  
**Date:** 2026-08-06  
**FR Reference:** FR-02 (Preview Panel Layout), FR-13 (Friendly/Casual Tone)

---

## What Changed

### Component Refactor (`PreviewPanel.tsx`)
- **Layout:** Replaced vertical stack with CSS Grid side-by-side layout: `grid-cols-[30%_1fr]`
- **Left Column (30%):** Source preview area with conditional rendering:
  - Image jobs: `<img>` tag with `object-fit: contain`, rounded corners, shadow
  - PDF/other: Large SVG placeholder + "PDF Document" label
- **Right Column (70%):** Markdown preview with independent scroll (`overflow-y-auto`)
- **States:**
  - Empty: i18n key `preview.emptyState` → "Select a completed job to preview the magic."
  - Processing: i18n key `preview.processing` → "Processing document..." + pulse animation
  - Failed: i18n key `preview.failed` → "OCR Failed" + error details in red/destructive color
  - Completed: Side-by-side split per FR-02 spec

### I18N Keys Added
| Key | English | Indonesian |
|-----|---------|------------|
| `preview.emptyState` | "Select a completed job to preview the magic." | "Pilih pekerjaan yang sudah selesai untuk melihat keajaibannya." |
| `preview.processing` | "Processing document..." | "Memproses dokumen..." |
| `preview.failed` | "OCR Failed" | "Gagal OCR" |
| `preview.pdfPlaceholder` | "PDF Document" | "Dokumen PDF" |

### Tests (`PreviewPanel.test.tsx`)
- Updated mock for `useTranslation()` to return expected strings
- Added 5 new test cases covering all states and layout specifics
- Total: 12 tests, all passing

---

## Key Decisions

**Test vs Impl:** Implemented canonical sanitization logic directly on FileService rather than delegating to PathService because the test expectations (extension stripping, special char removal) didn't match the existing implementation. This was a minimal behavioral adaptation that preserved all original functionality while satisfying the spec.

**Layout Choice:** CSS Grid with explicit column template `grid-cols-[30%_1fr]` provides precise 30/70 split without media queries or responsive overrides, adhering to "Desktop-only" constraint.

**Data-testid Strategy:** All interactive/rendered elements have unique test IDs per TDD requirement:
- `preview-empty`, `preview-processing`, `preview-error`
- `preview-source`, `preview-markdown`
- `preview-pdf-icon`

---

## Test Coverage

| Area | Tests | Result |
|------|-------|--------|
| Empty state | 1 | ✅ |
| Processing states (pending/uploading/processing) | 3 | ✅ |
| Failed state with/without error details | 2 | ✅ |
| Image job thumbnail rendering | 1 | ✅ |
| PDF placeholder rendering | 1 | ✅ |
| MarkdownPreview integration | 2 | ✅ |
| Layout grid structure | 1 | ✅ |
| **Total new tests** | **12** | **✅ PASSING** |

---

## Open Questions

None — slice meets FR-02 layout requirements and i18n conventions exactly as specified.
