# Slice 6.15b — Phase 6 Manual QA Script

## What Changed
- Authored `second-brain/02-QA/scan2text-phase6-manual-test.md`: a human-executed acceptance test covering all 9 sections of the Command Center v1.7 shell (Shell & Viewport Lock, TopBar, Main Grid & Panels, Dropzone, Queue, Preview, Batch Cap & Validation, BottomBar, Theme & Language Persistence).
- Updated `second-brain/00-Current-State.md` NEXT field to point to CEO running the QA script.
- Created this slice summary in `second-brain/01-Agent-Memory/Phase-6/slice-6.15b-qa-script.md`.

## Key Decisions
- QA script is doc-only: Kilo authors it; CEO executes it with human eyes + mouse + screenshots. No UI automation tools used.
- Layout-critical checks (sections 1–3, 6.5) explicitly call out CEO screenshot as the acceptance criterion since jsdom does no layout math.
- Result Recording table at the bottom enforces issue registration on any failure — no hand-fixing; failures open a new slice (6.16x) with forensics-first.
- Baseline Verification section (0.x) runs first to prove the approved build before eyeballing anything.

## Test Coverage
- Automated tests remain at 552 passing (no source changes in this slice).
- Manual QA script covers 46 check items across 9 sections plus 4 baseline verification steps = 50 total checks.
- Each check maps to a specific AGENTS.md / PRD v1.7 requirement.

## Open Questions
- PRD v1.7 files 01-04 are uncommitted (`?? second-brain/04-Product/`). They are read-only for this slice per non-goals; commit decision deferred to CEO.
- After CEO runs the QA script and marks PASS, Phase 6 is complete and work proceeds to Phase 7.
