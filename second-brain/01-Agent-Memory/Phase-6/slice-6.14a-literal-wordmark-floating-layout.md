# Slice 6.14a — Literal Wordmark + Floating 34/60 Layout

## What Changed

### CHANGE 1 — Wordmark literal
- `TopBar.tsx`: Replaced i18n indirection (`t('topbar.wordmarkScan')`, etc.) with literal spans "scan" + "2" + "text"
- Accent span retains `data-testid="topbar-wordmark-accent"` and `text-accent` class
- Color uses exact proven-visible token from right panel cream text: `#F2EBDD` (dark) / `#1F150C` (light)
- `font-display` + `tracking-wider` retained on wordmark container
- Brand proper noun exempt from i18n by CTO decision

### CHANGE 2 — Layout skeleton rebuild
- `CommandCenterLayout.tsx`: Workspace grid changed from `grid-cols-[2fr_2fr_6fr]` to `grid-cols-[34fr_60fr]` with `gap-[2%] p-[2%]`
- Left column: flex column, `gap-[2%]`; dropzone card `h-[38%] min-h-[240px]`, queue card `flex-1 min-h-0`
- Right column: preview card full height, `min-h-0`
- Overflow hygiene NEW CONTRACT: grid child wrappers keep `min-w-0` but DROP `overflow-hidden`; each CARD gets `overflow-hidden` + `min-w-0`
- `QueuePanel.tsx`: Added `overflow-hidden` to both empty-state and populated card wrappers
- `depthStyles.ts`: Outer shadows tuned to fit gutters: `0 8px 20px -8px rgba(0,0,0,0.55)` dark / `0 8px 20px -8px rgba(31,21,12,0.22)` light
- Radiant rays moved inside queue card container (bottom-left, single instance, static)
- Ambient glow stays workspace-level

## Key Decisions
- Grid ratio 34/60 supersedes previous 20/20/60 per CEO 2026-08-07 sketch
- 2% gutters allow depth shadows to escape into gaps (floating card effect)
- Card-level overflow-hidden preserves content clipping while allowing shadow bleed
- Literal wordmark avoids i18n overhead for brand proper noun

## Test Coverage
- `TopBar.test.tsx`: Added `wordmark literal text content is scan2text` + `accent span carries accent class`
- `CommandCenterLayout.test.tsx`: Updated grid overflow test (2 children, min-w-0 without overflow-hidden); added panel card overflow-hidden+min-w-0 assertion
- `App.test.tsx`: Updated grid-cols assertion from `[2fr_2fr_6fr]` to `[34fr_60fr]`
- `depthStyles.test.ts`: Updated dark shadow opacity from `rgba(0,0,0,0.6)` to `rgba(0,0,0,0.55)`

## Open Questions
- None
