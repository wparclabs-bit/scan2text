# Slice S11-FIX35-ProseCompact

**Date:** 2026-08-17
**Phase:** Phase 10
**Status:** COMPLETE

## What Changed

### BUG-35 Fix — Compact vertical rhythm in OCR preview
- **MarkdownPreview.tsx:10** — replaced dual redundant classes `prose-sm prose-base` with `prose-base prose-compact`
- **src/index.css** — added `.prose-compact` custom utility:
  - `line-height: 1.4` (was ~1.5–1.7 default from @tailwindcss/typography)
  - `p { margin-top: 0.25em; margin-bottom: 0.25em }` (was ~1em default)

### Root cause (from S11-DIAG forensics)
OCR output renders one line per paragraph (`\n\n`). Each `<p>` got ~1em top+bottom margin from the @tailwindcss/typography plugin, creating large gaps between single-line paragraphs. This inflated rendered height → tiny scrollbar thumb despite low content volume.

## Key Decisions

- `prose-sm` was redundant alongside `prose-base` (both set font-size; base wins). Kept `prose-base` as the explicit size override.
- `prose-compact` is a custom Tailwind class (not a built-in) — styles added directly in `index.css`.
- All existing classes on the `<article>` preserved verbatim: `dark:prose-invert max-w-none text-foreground prose-headings:font-display prose-a:text-primary hover:prose-a:text-primary/80 min-w-0 break-words`.

## Test Coverage

- **New test:** `MarkdownPreview > applies prose-compact and does NOT apply prose-sm to container` (asserts className contains `prose-compact`, does NOT contain `prose-sm`)
- All 634 existing tests continue to pass
- No test changes needed for CSS overrides (jsdom does not compute layout — CEO screenshot = layout acceptance per AGENTS.md 3.6)

## Gates

| Gate | Result |
|------|--------|
| Tests (RED) | 633 passed, 1 failed (new test) ✓ |
| Tests (GREEN) | 634 passed, 0 failed ✓ |
| Typecheck | exit 0 ✓ |
| Build | exit 0 ✓ |

## Open Questions

- Layout acceptance = CEO screenshot (jsdom does no layout math per AGENTS.md 3.6)
- Scrollbar thumb ratio improvement confirmed visually only
