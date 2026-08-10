# How a PM built an offline OCR desktop app with AI-assisted development

## The Problem

Office workers in low-connectivity environments need to convert scanned images and PDFs into editable text, but existing tools require internet access, accounts, or complicated installations. Scan2Text solves this by being fully offline, portable, and simple — a desktop app that turns documents into Markdown with zero setup friction.

## The Method

AI-Assisted Software Development (AIASD): PRD → ADR → micro-slices → TDD → human QA. Each slice is a self-contained contract executed test-first (RED→GREEN→REFACTOR), with every decision logged as an Architecture Decision Record. Human QA gates each phase before moving forward.

## Decisions That Mattered

- [ADR-001](../03-Architecture/ADRs/001-optimistic-ui.md): Optimistic UI for perceived responsiveness on slow OCR jobs.
- [ADR-002](../03-Architecture/ADRs/002-websockets-over-polling.md): HTTP polling over WebSockets for MVP simplicity (parked pending ADR supersession).
- [ADR-003](../03-Architecture/ADRs/ADR-003-platform-agnostic-file-upload.md): Platform-agnostic file upload contract.
- [ADR-004](../03-Architecture/ADRs/ADR-004-Second-Brain Vault Consolidation.md): Second Brain vault consolidation for agent memory hygiene.
- [ADR-005](../03-Architecture/ADRs/ADR-005-Consolidate the backend.md): Backend source-of-truth consolidation under src/scan2text.
- [ADR-006](../03-Architecture/ADRs/ADR-006-ovisocr2-engine-swap.md): Engine swap to OvisOCR2 0.9B — verbatim prompt, temp 0.1, full-page normalization.
- [ADR-007](../03-Architecture/ADRs/ADR-007-feedback-cpu-welcome-distribution-log-privacy.md): Feedback channel, CPU budget, welcome screen, GDrive distribution, log privacy.

## Lessons Learned

- Engine swap = recipe swap: prompt, sampling, and geometry travel together; you can't change the model without re-validating the whole pipeline.
- Disk is truth: before asserting which engine lives where, list models/ with sizes; renames and deletes change the decision state.
- Opt-in send, never silent upload: privacy is a product feature, not an afterthought.
- Size-based rotation beats calendar deletion: a hard byte cap makes disk exhaustion impossible regardless of usage pattern.
- Fractions decide, content never resizes panels: minmax(0,fr) + min-h-0 on every link in the shrink chain, or the viewport lock breaks at short window heights.

## What I Would Do Differently

Start with the ADRs earlier — the engine swap spike (S2) would have been faster if the recipe was locked in writing before coding. Also: lock the Python interpreter by evidence (the bench command), not by memory; system default Python may be too new for native wheels.

## How To Read This Repo

For hiring managers: start here (JOURNEY.md), then read the ADRs in order to understand the key decisions, then look at the tests to see how quality is enforced, then skim the PRD files for scope. The second-brain/ vault is the single source of truth for project state.
