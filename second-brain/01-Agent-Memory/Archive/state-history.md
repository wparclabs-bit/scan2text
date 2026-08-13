## 2026-08-13 (S9.4b-4): App.tsx wired — imported buildApiUrl, replaced 4 relative fetch URLs (settings, download/status+cache-buster, download/start, feedback/pending-count) with buildApiUrl() calls. Added 4 RED tests (fixed mock implementations for cross-call stubbing + navigator.onLine). 4 RED tests turned GREEN. S9.4b COMPLETE. Frontend: 610 green, 0 failures.

## 2026-08-13 (S9.4b-3): Removed hardcoded `API_BASE` constants from api.ts and uploadService.ts; wired all fetch calls through buildApiUrl(). 5 RED tests turned GREEN. Frontend: 606 green, 0 failures.

## 2026-08-13 (S9.4b-2): ModelDownloaderModal wired — imported buildApiUrl, replaced 3 hardcoded/relative fetch URLs (progress, cancel, start) with buildApiUrl() calls. Added 2 RED tests for cancel/start in PROD mode. 10 tests pass (3 new). Frontend: 601 green, 5 failures remaining (api.test.ts ×3, uploadService.test.ts ×2).

## 2026-08-13 (S9.4b-1): FeedbackDialog + WelcomeModal already wired — forensics confirmed both files import and call buildApiUrl() from original commits (195d2e5, 8156378). 14 tests pass (7 per file). No source changes needed. 6 pre-existing failures remain in b-2/b-3/b-4 targets.

# DOC-05: PRD-04 §19 Testing Strategy → PRD-03 §19

## What Changed
- Copied PRD-04 §19 "Testing Strategy" (second-brain/04-Product/04-testing-and-engineering-rules.md) into PRD-03 (second-brain/04-Product/03-non-functional-and-architecture.md) as new §19, placed after §18 Logging Requirements.
- Trimmed per CEO Option A: removed the entire "QA Artifact" subsection (historical execution record); removed the historical execution line from "OCR Accuracy Validation" subsection.
- All other §19 content preserved verbatim: Test Pyramid, Unit Tests, Integration Tests (backend + frontend), Frontend v1.7 visual-contract, Manual/E2E Tests, QA Manual Test Script Artifact requirement, OCR Accuracy Validation requirement line.
- PRD-03 version bumped from 1.12 to 1.13 with changelog entry.
- PRD-04 source left intact (deletion deferred to DOC-08).

## Key Decisions
- CEO approved Option A: fold §19 into PRD-03, trim historical QA run records, keep testing requirements.
- DOC-only slice — no source code touched.
- Dissolution sequence: DOC-05 (§19→PRD-03), DOC-06 (§21/22/23→PRD-01), DOC-07 (§20→AGENTS.md), DOC-08 (delete PRD-04 + fix refs).

## Open Questions
- None. DOC-06 is the next dissolution step.
