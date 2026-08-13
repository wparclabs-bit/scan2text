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
