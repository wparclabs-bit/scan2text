# Slice 6.14d — Visual Hotfix (TopBar brand logo + BottomBar + viewport lock + queue regression)

Date: 2026-08-07
Status: done
Commit: 3134a49
PRD base: v1.5 + CEO overrides (PRD v1.7 delta pending, CTO to log)

## What Changed
- TopBar: height 34px. LEFT = logo chip + DEMO badge intact, NO literal text wordmark. CENTER = brand image text.png 153×34, alt="Scan2Text", static radial glow behind (CSS-only, zero CPU). RIGHT = theme/language/settings icon-only, translated tooltips. All vertically centered.
- BottomBar (was missing, now built): LEFT empty. CENTER = Worker Idle/Busy (derived from queue state) · RAM "—" (until backend /health) · version constant. RIGHT = icon-only Share, placeholder https://placeholder.local, translated tooltip, click = soft toast (EN "Sharing coming soon." / ID "Berbagi segera hadir."), no navigation.
- Viewport lock: h-screen shell; window/body does not scroll; only Queue + Preview scroll inside; BottomBar always visible.
- Queue rows: FR-04 restored — file type icon + name + size + status indicator (spinner uploading/processing, glossy green dot completed, red dot failed) + translated tooltips + thin fake progress bar.
- Dropzone: background image bacground-left-top-panel.jpg (exact filename) at 25% opacity, behind content, both themes, pointer-events none; bold ink text stays readable.
- Scrollbars: always-visible warm scrollbars kept (no regression).

## Key Decisions
- Brand wordmark is an IMAGE (text.png) with alt="Scan2Text"; tests assert the alt, not literal text.
- BottomBar worker status derived from queue state via `useScan2TextStore.getState().jobs` (no subscription, read-only snapshot).
- Dropzone bg image on a separate `aria-hidden` layer div with `pointer-events-none` so it doesn't interfere with interactions.
- Viewport lock via CSS `html, body { overflow: hidden }` rather than inline styles.
- Share button uses placeholder URL; toast.info for "coming soon" message; clipboard.writeText for copy.

## Test Coverage
- Before: 521 passing
- After: 527 passing (+6 new)
- New assertions: brand image alt="Scan2Text" + logo chip in real <App /> render; TopBar 34px; BottomBar share right icon-only + centered telemetry; viewport lock (h-screen); dropzone bg 0.25 opacity on aria-hidden layer; Worker Idle/Busy derivation; RAM shows em dash.

## Open Questions
- CTO logs PRD v1.7 delta.
- QA manual-test script (path TBD) → Phase 6 COMPLETE → Phase 7 grills.
- Debt: body font open; exe icon Phase 7; backend /health not built (RAM shows "—"); real share URL post-GitHub.
