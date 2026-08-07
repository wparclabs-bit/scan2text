# Scan2Text — Phase 6 Manual QA Script
Purpose: Human-executed acceptance test for the Command Center v1.7 shell BEFORE Phase 6 is marked COMPLETE.
Executor: CEO (human eyes + mouse + screenshots). Kilo authors only; Kilo does NOT run this.
Source of truth: PRD v1.7 files 01-04. Layout-critical acceptance = CEO screenshot (jsdom does no layout math).
How to use: Work top to bottom. Mark [x] for PASS, or leave [ ] and note FAIL with a screenshot. Record results in the table at the bottom. If ANY check fails, STOP, register the issue (what failed + how to reproduce + commit), and return to CTO. Do NOT hand-fix.

## 0. Baseline Verification (run these first)
Prove you are testing the approved build before eyeballing anything.
- [ ] 0.1 From frontend dir run: npm run test → record passing count. Expected: 552 passing, 0 failing (or the baseline recorded in 00-Current-State.md). Actual: ____
- [ ] 0.2 From repo root run: git log --oneline -3 → record top 3 hashes. Top should be fc81685 (6.15a) or later. Actual: ____
- [ ] 0.3 Confirm AGENTS.md maps the QA home: Select-String -Path AGENTS.md -Pattern '02-QA'. Expected: match found. Actual: ____
- [ ] 0.4 From frontend dir run: npm run dev ; open the local URL. App loads with no console errors. Actual: ____

## 1. Shell & Viewport Lock
- [ ] 1.1 App is pinned to the viewport edges (fixed inset-0). No gap, no page scrollbar.
- [ ] 1.2 NO window/body scroll at any size. Scrolling the background moves nothing.
- [ ] 1.3 Resize narrow and short. BottomBar stays visible the whole time. No layout break.
- [ ] 1.4 Wide window (2560px or maximize): holds 34/60 split + ~2% gutter. No stretching artifacts.
- [ ] 1.5 Very short window: TopBar (34px) + BottomBar both visible; main shrinks but never disappears.

## 2. TopBar (34px)
- [ ] 2.1 Height 34px; logo, brand image, and buttons vertically centered.
- [ ] 2.2 LEFT: logo chip + DEMO badge present. No literal text wordmark on the left.
- [ ] 2.3 CENTER: brand image text.png 153x34 alt="Scan2Text" with a subtle static radial glow. Not too bright.
- [ ] 2.4 RIGHT: theme, language, settings — icon-only, each with a translated tooltip on hover.

## 3. Main Grid & Panels
- [ ] 3.1 Main split is ~34% left / ~60% right with ~2% gutters.
- [ ] 3.2 Left column: Dropzone top (~38%), Queue bottom (~62%).
- [ ] 3.3 Dropzone size stays CONSTANT as jobs are added/removed (content never resizes the panel).
- [ ] 3.4 All cards show visible-subtle depth (gradient + highlight + soft shadow + warm glow). No flat cards, no borders, no purple.

## 4. Dropzone
- [ ] 4.1 Dashed upload area fills the card between a bold header and a bold footer.
- [ ] 4.2 Background image visible at ~15% opacity, centered, not stretched.
- [ ] 4.3 Header + footer text are bold ink #1F150C, readable in both themes.
- [ ] 4.4 Footer includes: "PNG · JPG · WEBP · PDF — max 50MB per file · max 10 files per batch" (translated).
- [ ] 4.5 NO scrollbar in the Dropzone.
- [ ] 4.6 Drag a file over it → glowing/highlighted state. Click → file picker opens.

## 5. Queue
- [ ] 5.1 Empty state shows the "Nothing here yet. Drop something tasty!" message (translated).
- [ ] 5.2 Drop a valid image/PDF → a row appears: icon + name + size + status slot.
- [ ] 5.3 Status slot is a fixed ~14px dot-only area (no visible text): grey (pending), yellow spinner (processing), glossy green (completed), glossy red (failed).
- [ ] 5.4 Hover the status dot → translated tooltip.
- [ ] 5.5 While processing, a thin fake progress bar animates (0→90% then jumps to 100%).
- [ ] 5.6 Long filenames truncate with an ellipsis; the status dot stays visible at the row's right edge.
- [ ] 5.7 With several rows, a warm always-visible scrollbar appears on the Queue.
- [ ] 5.8 Retry button is NOT shown on completed jobs; IS shown on failed jobs.

## 6. Preview (right panel)
- [ ] 6.1 Empty state shows the "Select a completed job to preview the magic." message (translated).
- [ ] 6.2 When a job completes, the right panel auto-selects and shows its rendered Markdown.
- [ ] 6.3 Markdown renders as formatted prose (headings/lists/tables styled), not plain text.
- [ ] 6.4 Header has two real borderless buttons: Copy Markdown + Open Folder (transparent bg, caramel hover, translated labels).
- [ ] 6.5 Preview has an internal warm always-visible scrollbar when content overflows.

## 7. Batch Cap & Validation
- [ ] 7.1 Drop 11+ valid files → exactly 10 queued; extras skipped with a warning toast + logged.
- [ ] 7.2 Drop an unsupported file type → error toast; not added to queue.
- [ ] 7.3 Drop a file > 50MB → error toast; not added to queue.
- [ ] 7.4 Mixed batch (valid + unsupported) → valid files process; unsupported skipped without stopping the batch.

## 8. BottomBar
- [ ] 8.1 Pinned at the bottom, always visible, vertically centered.
- [ ] 8.2 LEFT: empty.
- [ ] 8.3 CENTER: Worker Idle/Busy · RAM "—" · version. Centered via balanced grid.
- [ ] 8.4 RIGHT: icon-only Share button with translated tooltip.
- [ ] 8.5 Click Share → soft translated toast ("Sharing coming soon."); NO navigation, no new tab.

## 9. Theme & Language Persistence
- [ ] 9.1 Toggle theme → instant apply; dark is default; all components re-theme.
- [ ] 9.2 Toggle language EN ↔ ID → all UI strings (buttons, tooltips, toasts, empty states) switch; brand image stays "Scan2Text".
- [ ] 9.3 Restart the app → theme + language persist (localStorage).

## Result Recording
Fill this in, then screenshot the completed script.
- Executor: ____
- Date: ____
- Commit under test: ____
- Test count (from 0.1): ____
- Overall: PASS / FAIL
- Checks passed: __ of __
- Failures (if any) — issue registration:
  - Check #: ____ | What failed: ____ | How to reproduce: ____ | Screenshot: ____

RULE: If ANY check fails, do NOT hand-fix. Register the issue above and return to CTO. A fail opens a new slice (6.16x) with forensics-first.
