# S11-FIX39-ImgTag-Policy

**Date:** 2026-08-18
**Slice:** S11-FIX39
**Status:** COMPLETE → READY FOR CEO MANUAL VERIFICATION

## What Changed

CEO-locked Option B split policy enforced across backend guard + frontend preview:

1. **Backend** (`src/scan2text/services/output_service.py`): `_has_raw_text()` now strips HTML-like tags via `re.sub(r"<[^>]+>", "", text)` before calling `has_no_text()`. This prevents OCR hallucinated img-tag letters (`img`, `src`, `bbox`, `jpg`) from fooling the no-text detector. `has_no_text()` itself is unchanged.

2. **Frontend** (`frontend/src/components/layout/panels/MarkdownPreview.tsx`): Display string is sanitized with `markdown.replace(new RegExp('<img[^>]*\\/?>', 'gi'), '')` before passing to `react-markdown`. The raw `markdown` prop stays untouched — saved `.md` content preserves chart crops (FR-08).

3. **Saved `.md` content UNCHANGED** — tags remain in the file for FR-08 chart cropping.

## Key Decisions

- **Option B (CEO-locked):** Split policy — backend guard strips tags for detection; frontend preview strips tags for rendering; saved content untouched.
- **Regex in TSX:** oxc parser cannot handle `>` inside regex literals in `.tsx` files. Used `new RegExp('<img[^>]*\\/?>', 'gi')` constructor instead of `/ <img[^>]*/?>/gi` literal.
- **Null guard:** Added `markdown ? markdown.replace(...) : ''` to preserve existing undefined-handling behavior.
- **`has_no_text()` unchanged:** Pure detector stays as-is; stripping happens only in `_has_raw_text()`.

## Test Coverage

**Backend** (`tests/test_no_text_guard.py`):
- `test_img_tag_with_digits_only_returns_false` — img tag + digits → `_has_raw_text` returns False (no real text)
- `test_img_tag_with_real_text_returns_true` — img tag + real text → `_has_raw_text` returns True
- `test_img_tag_digits_ocr_writes_bilingual_notice` — integration: digits+tag OCR writes bilingual notice, no `<img` in output

**Frontend** (`frontend/src/components/layout/panels/MarkdownPreview.test.tsx`):
- `strips <img> tags from display so raw HTML is not visible` — asserts `textContent` does NOT contain `<img` or `src=` and DOES contain `O-SHOCK`

## Gates

| Gate | Result |
|------|--------|
| Backend full suite | 281 passed, 1 pre-existing failure |
| Frontend targeted | 12 passed (11 existing + 1 new) |
| Frontend full suite | 630 passed, 0 failures |
| Typecheck | exit 0 |
| Build | exit 0 |

## Open Questions

None.

## Files Changed

- `src/scan2text/services/output_service.py` — added `import re`, tag stripping in `_has_raw_text()`
- `tests/test_no_text_guard.py` — +3 tests in `TestTagStrippingGuard`
- `frontend/src/components/layout/panels/MarkdownPreview.tsx` — display-only img tag stripping
- `frontend/src/components/layout/panels/MarkdownPreview.test.tsx` — +1 test
