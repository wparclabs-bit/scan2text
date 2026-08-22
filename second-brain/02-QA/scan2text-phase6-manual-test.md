# Scan2Text — Phase 6 Manual QA Script
Purpose: Human-executed acceptance test for the Command Center v1.7 shell BEFORE Phase 6 is marked COMPLETE.
Executor: CEO (human eyes + mouse + screenshots). Kilo authors only; Kilo does NOT run this.
Source of truth: PRD v1.7 files 01-04. Layout-critical acceptance = CEO screenshot (jsdom does no layout math).
How to use: Work top to bottom. Mark [x] for PASS, or leave [ ] and note FAIL with a screenshot. Record results in the table at the bottom. If ANY check fails, STOP, register the issue (what failed + how to reproduce + commit), and return to CTO. Do NOT hand-fix.

## 0. Baseline Verification (run these first)
Prove you are testing the approved build before eyeballing anything.
- [x] 0.1 From frontend dir run: npm run test → record passing count. Expected: 552 passing, 0 failing (or the baseline recorded in 00-Current-State.md). Actual: ____
- [ ] 0.2 From repo root run: git log --oneline -3 → record top 3 hashes. Top should be fc81685 (6.15a) or later. Actual: ae5fc3a
- [x] 0.3 Confirm AGENTS.md maps the QA home: Select-String -Path AGENTS.md -Pattern '02-QA'. Expected: match found. Actual: second-brain/02-QA/____
- [x] 0.4 From frontend dir run: npm run dev ; open the local URL. App loads with no console errors. Actual: ____

## 1. Shell & Viewport Lock
- [x] 1.1 App is pinned to the viewport edges (fixed inset-0). No gap, no page scrollbar.
- [x] 1.2 NO window/body scroll at any size. Scrolling the background moves nothing.
- [x] 1.3 Resize narrow and short. BottomBar stays visible the whole time. No layout break.
- [x] 1.4 Wide window (2560px or maximize): holds 34/60 split + ~2% gutter. No stretching artifacts.
- [x] 1.5 Very short window: TopBar (34px) + BottomBar both visible; main shrinks but never disappears. Bottom Bar not visible (CEO-accepted edge 2026-08-08: at pathological window heights TopBar may crowd BottomBar; normal short windows verified OK)

## 2. TopBar (34px)
- [x] 2.1 Height 34px; logo, brand image, and buttons vertically centered.
- [x] 2.2 LEFT: logo chip + DEMO badge present. No literal text wordmark on the left.
- [ ] 2.3 CENTER: brand image text.png 153x34 alt="Scan2Text" with a subtle static radial glow. Not too bright. (subtle static radial glow not visible to eyes)
- [x] 2.4 RIGHT: theme, language, settings — icon-only, each with a translated tooltip on hover.

## 3. Main Grid & Panels
- [x] 3.1 Main split is ~34% left / ~60% right with ~2% gutters.
- [x] 3.2 Left column: Dropzone top (~38%), Queue bottom (~62%).
- [x] 3.3 Dropzone size stays CONSTANT as jobs are added/removed (content never resizes the panel).
- [x] 3.4 All cards show visible-subtle depth (gradient + highlight + soft shadow + warm glow). No flat cards, no borders, no purple.

## 4. Dropzone
- [x] 4.1 Dashed upload area fills the card between a bold header and a bold footer.
- [x] 4.2 Background image visible at ~15% opacity, centered, not stretched.
- [x] 4.3 Header + footer text are bold ink #1F150C, readable in both themes.
- [x] 4.4 Footer includes: "PNG · JPG · WEBP · PDF — max 50MB per file · max 10 files per batch" (translated).
- [x] 4.5 NO scrollbar in the Dropzone.
- [ ] 4.6 Drag a file over it → glowing/highlighted state. Click → file picker opens. (not glowing/highlighted not working)

## 5. Queue
- [ ] 5.1 Empty state shows the "Nothing here yet. Drop something tasty!" message (translated). (nope Only : No files in queue" and should be in center of box)
- [x] 5.2 Drop a valid image/PDF → a row appears: icon + name + size + status slot.
- [x] 5.3 Status slot is a fixed ~14px dot-only area (no visible text): grey (pending), yellow spinner (processing), glossy green (completed), glossy red (failed). No spinner or progress bar under the name/size.
- [x] 5.4 Hover the status dot → translated tooltip.
- [x] 5.5 SUPERSEDED 2026-08-08 (CEO decision): no fake progress bar in MVP; single status indicator lives in the right 14px slot. Revisit v2/v3 on user feedback.
- [x] 5.6 Long filenames truncate with an ellipsis; the status dot stays visible at the row's right edge.
- [x] 5.7 With several rows, a warm always-visible scrollbar appears on the Queue.
- [x] 5.8 Retry button is NOT shown on completed jobs; IS shown on failed jobs.

## 6. Preview (right panel)
- [ ] 6.1 Empty state shows the "Select a completed job to preview the magic." message (translated) Yes, but should be in the center of the Box
- [x] 6.2 When a job completes, the right panel auto-selects and shows its rendered Markdown.
- [x] 6.3 Markdown renders as formatted prose (headings/lists/tables styled), not plain text.
- [x] 6.4 Header has two real borderless buttons: Copy Markdown + Open Folder (transparent bg, caramel hover, translated labels).
- [x] 6.5 Preview has an internal warm always-visible scrollbar when content overflows.

## 7. Batch Cap & Validation
- [x] 7.1 Drop 11+ valid files → exactly 10 queued; extras skipped with a warning toast + logged.
- [ ] 7.2 Drop an unsupported file type → error toast; not added to queue. ( message still wrong, remove the red lines)
- [ ] 7.3 Drop a file > 50MB → error toast; not added to queue.(same like 7.2)
- [x] 7.4 Mixed batch (valid + unsupported) → valid files process; unsupported skipped without stopping the batch.

## 8. BottomBar
- [x] 8.1 Pinned at the bottom, always visible, vertically centered.
- [x] 8.2 LEFT: empty.
- [x] 8.3 CENTER: Worker Idle/Busy · RAM "—" · version. Centered via balanced grid.
- [x] 8.4 RIGHT: icon-only Share button with translated tooltip.
- [x] 8.5 Click Share → soft translated toast ("Sharing coming soon."); NO navigation, no new tab.

## 9. Theme & Language Persistence
- [x] 9.1 Toggle theme → instant apply; dark is default; all components re-theme.
- [x] 9.2 Toggle language EN ↔ ID → all UI strings (buttons, tooltips, toasts, empty states) switch; brand image stays "Scan2Text".
- [x] 9.3 Restart the app → theme + language persist (localStorage).

## Result Recording
Fill this in, then screenshot the completed script.
- Executor: Wing CTO
- Date: 8/8/2026____
- Commit under test: ____
- Test count (from 0.1): 48
- Overall: ~~PASS~~ / FAIL
- Checks passed: 37__ of __48
- Failures (if any) 11— issue registration:
  - Check #: ____ | What failed: ____ | How to reproduce: ____ | Screenshot: ____

RULE: If ANY check fails, do NOT hand-fix. Register the issue above and return to CTO. A fail opens a new slice (6.16x) with forensics-first.

## RE-RUN 2026-08-08 (post-6.16c, commit 272addf)

All previously failed checks now PASS:
- 1.5 Very short window — PASS (CEO-accepted edge: pathological heights may crowd; normal short windows OK)
- 2.3 Brand image + radial glow — PASS
- 4.6 Drag-over highlight — PASS
- 5.1 Empty state copy + centering — PASS
- 5.3 Status dot-only slot — PASS
- 5.5 SUPERSEDED (no fake progress bar) — confirmed by CEO
- 6.1 Preview empty state + centering — PASS
- 7.2 Unsupported type toast — PASS
- 7.3 Over-50MB toast — PASS

Baseline: 565/565 tests passing (33 files).
Overall: PASS
Executor: CEO
