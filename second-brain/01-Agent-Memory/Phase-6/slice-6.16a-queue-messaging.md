## Slice 6.16a — Queue Row Single-Spinner Contract + Messaging Correctness

### What Changed
- **Queue row:** Removed the `<Spinner>` + progress bar rendered under the filename/size when a job is processing/uploading. The single status indicator now lives exclusively in the fixed 14px right slot (grey pending / #FACC15 spinner processing / glossy green completed / glossy red failed).
- **Queue empty state:** Replaced `queue.empty` ("No files in queue") with new key `queue.emptyFriendly` ("Nothing here yet. Drop something tasty!" / "Belum ada apa-apa di sini. Jatuhkan sesuatu yang enak!"). Container updated to `flex flex-col items-center justify-center text-center` for centered layout.
- **Preview empty state:** Added `items-center justify-center text-center` to the empty-state card container for centered layout.
- **Toast copy:** Trimmed `errors.allInvalid` from two-sentence ("No files were added. All selected…") to single sentence ("All selected files are unsupported or too large.") in both en.json and id.json.
- **Tests:** +2 net (552 → 554). New assertions: single-spinner contract, no-progress-bar, empty-state centering, toast copy without old prefix.

### Key Decisions
- **CEO decision 2026-08-08:** Fake progress bar removed from MVP entirely; deferred to v2/v3 on user feedback. This is an approved delta — not re-added.
- **Single status indicator contract:** The right 14px slot is the ONLY place a spinner appears in a queue row. No spinner or progress element under name/size.
- **Friendly empty-state copy:** New `queue.emptyFriendly` key added alongside existing `queue.empty` (retained for backward compat / tests that assert the old key). ID translation pending CEO review.
- **Centering via className:** Asserted via `toHaveClass` (jsdom does no layout math); CEO screenshot remains the layout acceptance test.

### Test Coverage
- 554/554 passing (33 files). Typecheck zero errors.
- New RED→GREEN tests: processing row single-spinner contract, uploading row single-spinner contract, no-progress-bar assertion, queue empty-state friendly copy + centering, preview empty-state centering, all-invalid toast copy (both locales via test-setup).
- Existing tests preserved; duplicate gradient tests at lines 277–312 retained (no scope change there).

### Open Questions
- ID translation for `queue.emptyFriendly` ("Belum ada apa-apa di sini. Jatuhkan sesuatu yang enak!") pending CEO review.
- Phase 6 COMPLETE marker awaits CEO execution of manual QA script.
