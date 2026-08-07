# Slice 6.12f — Overflow Hygiene

## What Changed

- `CommandCenterLayout.tsx`: each of the three grid child `<div>` wrappers gains `min-w-0 overflow-hidden` so CSS grid columns cannot be expanded by unbreakable content.
- `MarkdownPreview.tsx`: the `<article>` container gains `min-w-0 break-words` so long tokens inside rendered Markdown wrap instead of pushing the right panel.
- `QueuePanel.test.tsx`: new regression test asserting a 60-character spaceless filename renders with the `truncate` class on the name element.
- `CommandCenterLayout.test.tsx`: new file with regression test asserting all three grid child wrappers carry `min-w-0` and `overflow-hidden`.

## Key Decisions

- QueuePanel was already correct (`truncate` + `min-w-0` on line 60–61); no code change needed there.
- PreviewPanel was already correct (`min-w-0 box-border overflow-hidden` on all state cards); no code change needed there.
- Only CommandCenterLayout and MarkdownPreview required edits.

## Test Coverage

- 442 tests passing (baseline 440, +2 new).
- New: `each grid child wrapper carries min-w-0 and overflow-hidden` (CommandCenterLayout.test.tsx)
- New: `applies truncate class to filename element for long spaceless names` (QueuePanel.test.tsx)

## Open Questions

None. Next slice is 6.13 (Identity Slice).
