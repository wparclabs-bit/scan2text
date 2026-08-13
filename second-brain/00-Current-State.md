# Scan2Text Current State

<!-- MAINTENANCE PROTOCOL: Keep only the Baseline block + last 5 changelog entries here. When you add a new entry, move the oldest entry to second-brain/01-Agent-Memory/Archive/state-history.md. This protects the 45k token cap (AGENTS.md 3.2). -->

## Baseline
- Phase: Phase 7 (Real Backend) — FRONTEND API WIRING COMPLETE
- Date: 2026-08-13
- Baseline commit: ec9443d (Phase 6 closed)
- Backend tests: 211 passed, 1 pre-existing failure (test_health_contract — dummy models on disk)
- Frontend tests: 610 green, 0 failures. All 13 call sites across 6 files wired through buildApiUrl(). S9.4b COMPLETE.
- Rust tests: 10 passed
- PRD: v1.10 source of truth in second-brain/04-Product/
- Next: Tauri sidecar wiring.

## Recent Changelog (last 5)
- **2026-08-13 (S9.4b-4):** App.tsx wired — imported buildApiUrl, replaced 4 relative fetch URLs (settings, download/status+cache-buster, download/start, feedback/pending-count) with buildApiUrl() calls. Added 4 RED tests (fixed mock implementations for cross-call stubbing + navigator.onLine). 4 RED tests turned GREEN. S9.4b COMPLETE. Frontend: 610 green, 0 failures.
- **2026-08-13 (S9.4b-3):** Removed hardcoded `API_BASE` constants from api.ts and uploadService.ts; wired all fetch calls through buildApiUrl(). Deleted `const API_BASE = 'http://127.0.0.1:8000'` from both files. Added buildApiUrl imports. 5 RED tests turned GREEN. Frontend: 606 green, 0 failures.
- **2026-08-13 (S9.4b-2):** ModelDownloaderModal wired — imported buildApiUrl, replaced 3 hardcoded/relative fetch URLs (progress, cancel, start) with buildApiUrl() calls. Added 2 RED tests for cancel/start in PROD mode. 10 tests pass (3 new). Frontend: 601 green, 5 failures remaining (api.test.ts ×3, uploadService.test.ts ×2).
- **2026-08-13 (S9.4b-1):** FeedbackDialog + WelcomeModal already wired — forensics confirmed both files import and call buildApiUrl() from original commits (195d2e5, 8156378). 14 tests pass (7 per file). No source changes needed. 6 pre-existing failures remain in b-2/b-3/b-4 targets.
- **2026-08-13 (DOC-09):** Poison file cleanup — `00-Current-State.md` updated to reflect S9.4a COMPLETE and S9.4b NEXT; stale references to S9.3 port-cleanup limitations and "known limitation" removed; zombie summary `slice-9-3-tauri-backend-lifecycle.md` moved to Archive (Drop-based cleanup claim was incorrect — FIX-S9.3 used explicit exit hook, not Drop). Doc-only slice; no source touched.
- **2026-08-13 (DOC-05):** PRD-04 §19 Testing Strategy folded into PRD-03 as §19 (trimmed historical QA run records per CEO Option A); PRD-03 bumped to v1.13; PRD-04 dissolution step 1 of 4. Doc-only slice; no source touched. See `second-brain/01-Agent-Memory/Phase-7/slice-doc-05-prd-04-s19-to-prd-03.md`.


For older history see second-brain/01-Agent-Memory/Archive/state-history.md
