# Slice 8.2 — Doc-only lock of ADR-007 and PRD deltas

Date: 2026-08-10
Phase: 7
Baseline: 73b3ba1

## What Changed

- Created expanded ADR-007 at `second-brain/03-Architecture/ADRs/ADR-007-feedback-cpu-welcome-distribution-log-privacy.md` with 6 decisions: feedback channel, CPU budget, first-run expectations screen, GDrive distribution + in-app model downloader, log privacy + size-based rotation, monthly release cadence.
- Updated PRD 01 (01-product-and-scope.md) to v1.10: change log row, §7 Must-Have/Won't-Have appends, §12 Locked appends.
- Updated PRD 02 (02-functional-requirements.md) to v1.10: FR-01 two-step wizard acceptance, FR-09 hide_welcome_notice + cpu_threads update, FR-11 example cases append, FR-16/FR-17 retained from 8.1.
- Updated PRD 03 (03-non-functional-and-architecture.md) to v1.11: NFR-02/NFR-03 appends, §15 AppSettings hide_welcome_notice, §17 GDrive distribution rewrite, §18 log rotation + no-file-names rewrite.
- Updated PRD 04 (04-testing-and-engineering-rules.md) to v1.10: §22 still-open slice list, testing notes append.
- Created docs/JOURNEY.md skeleton (public portfolio layer).
- Updated AGENTS.md §8 (CEO locked decisions) and §12 (lessons learned).
- Updated second-brain/00-Current-State.md with 8.2 entry.

## Key Decisions

- ADR-007 expanded from 4 to 6 decisions to capture all CEO grill answers in one canonical doc.
- Log privacy: fields = extension + byte count + page count + duration + error/warning code + model version + timestamp; NO file names, NO content.
- Rotation: size-based maxBytes 1 MB, backupCount 1 (app.log + app.log.1).
- Welcome expectations screen: plain notice, not legal T&C; shown every launch until dismissed via hide_welcome_notice flag.
- Distribution: binaries on Google Drive, version.json on GitHub.

## Test Coverage

Doc-only slice — no source or test changes. Testing notes added to PRD 04 for future slices: feedback queue save/move unit tests, downloader fake-stream tests, welcome dismissal persistence test, log rotation config test.

## Open Questions

- FEEDBACK_FORM_URL placeholder until CEO provides the actual form URL.
- GDrive download_url values until CEO provides the links.
- Slices 8.3–8.7 implementation order TBD.
