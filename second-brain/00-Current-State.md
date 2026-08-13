# Scan2Text Current State

<!-- MAINTENANCE PROTOCOL: Keep only the Baseline block + last 5 changelog entries here. When you add a new entry, move the oldest entry to second-brain/01-Agent-Memory/Archive/state-history.md. This protects the 45k token cap (AGENTS.md 3.2). -->

## Baseline
- Phase: Phase 7 (Real Backend) — FRONTEND API WIRING
- Date: 2026-08-13
- Baseline commit: ec9443d (Phase 6 closed)
- Backend tests: 211 passed, 1 pre-existing failure (test_health_contract — dummy models on disk)
- Frontend tests: 596 green
- Rust tests: 10 passed
- PRD: v1.10 source of truth in second-brain/04-Product/
- Next: S9.4b — Frontend production API wiring (call-site migration to buildApiUrl).

## Recent Changelog (last 5)
- **2026-08-13 (DOC-09):** Poison file cleanup — `00-Current-State.md` updated to reflect S9.4a COMPLETE and S9.4b NEXT; stale references to S9.3 port-cleanup limitations and "known limitation" removed; zombie summary `slice-9-3-tauri-backend-lifecycle.md` moved to Archive (Drop-based cleanup claim was incorrect — FIX-S9.3 used explicit exit hook, not Drop). Doc-only slice; no source touched.
- **2026-08-13 (DOC-05):** PRD-04 §19 Testing Strategy folded into PRD-03 as §19 (trimmed historical QA run records per CEO Option A); PRD-03 bumped to v1.13; PRD-04 dissolution step 1 of 4. Doc-only slice; no source touched. See `second-brain/01-Agent-Memory/Phase-7/slice-doc-05-prd-04-s19-to-prd-03.md`.
- **2026-08-13 (DOC-04):** PRD-01 aligned with ADR-008 — Tauri v2 desktop shell & packaging line added to §12; version drift fixed (header 1.9 → 1.11 to match existing 1.10 changelog entry); PRD-01 bumped to v1.11. Doc-only slice; no source touched. See `second-brain/01-Agent-Memory/Phase-7/slice-doc-04-prd-01-tauri-alignment.md`.
- **2026-08-13 (DOC-03):** AGENTS.md + AGENTS-CTO.md updated: token safety cap reduced from 90k to 45k per slice, input target from 70k to 35k (CEO locked decision). Doc-only slice; no source touched.
- **2026-08-13 (DOC-02):** PRD-03 aligned with ADR-008 — pywebview fully replaced by Tauri v2; runtime folder structure updated to reflect Tauri shell + scan2text-backend artifact + external models/; tech stack updated; stale /api/health "until built" note removed; PRD-03 bumped to v1.12. Doc-only slice; no source touched. See `second-brain/01-Agent-Memory/Phase-7/slice-doc-02-prd-03-tauri-alignment.md`.

For older history see second-brain/01-Agent-Memory/Archive/state-history.md
