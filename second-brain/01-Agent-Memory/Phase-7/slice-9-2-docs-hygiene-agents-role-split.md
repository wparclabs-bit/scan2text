# Slice S9.2 — Docs Hygiene: AGENTS Role-Split Cleanup

**Date:** 2026-08-12  
**Phase:** Phase 7  
**Type:** Doc-only (no source code changes)

## What Changed

- **AGENTS.md** refactored from 157 lines to a clean Kilo-only operating manual:
  - Replaced bare `python` backend command with `py -3.12 -m pytest -q`
  - Added Section 3.10 PYTHONPATH rule (`$env:PYTHONPATH="src"` when running backend from repo root)
  - Added `/tdd` skill requirement in Section 3.1
  - Added Section 3.3 compact output rule (protects 90k token safety cap)
  - Added Section 3.5 dependency permission rule (CEO approval required before installing deps)
  - Added Section 10 final status states (COMPLETE / READY FOR CEO MANUAL VERIFICATION / BLOCKED)
  - Compressed Lessons Learned (Section 12) into short active rules; removed historical narrative slice history
  - Added cross-reference to AGENTS-CTO.md in header

- **AGENTS-CTO.md** refactored from 299 lines to a clean Cloud CTO-only behavior manual:
  - Added scope statement: this file is for Cloud CTO only, not Kilo
  - Removed stale Section 6 (Current State Snapshot with old test counts 134/565) — replaced with pointer to `second-brain/00-Current-State.md`
  - Removed duplicated Section 7 (Locked Decisions Register) — replaced with pointers to AGENTS.md Section 8, PRD, and ADRs
  - Removed deferred Section 11 (GitHub Portfolio Strategy)
  - Added Section 7 Kilo Slice Prompt Preflight Checklist
  - Added Section 9 Issue-mode rule (diagnosis first, slice second)
  - Added Section 10 Status States (COMPLETE / READY FOR CEO MANUAL VERIFICATION / BLOCKED)
  - Added Section 11 Dependency Installation Rule
  - Added Section 12 Doc Update Rule
  - Added Python 3.12 lock reminder in Section 15

- **Backups** created at `second-brain/00-Inbox/backups/`:
  - `AGENTS.md-20260812-1637`
  - `AGENTS-CTO.md-20260812-1637`

- **Archive** created at `second-brain/01-Agent-Memory/Archive/agents-manual-cleanup-2026-08-12.md` capturing all removed stale/duplicated content with source headings and removal reasons.

## Key Decisions

1. **Role split is strict:** AGENTS.md = Kilo lawbook; AGENTS-CTO.md = Cloud CTO behavior manual. No overlap in dynamic state.
2. **No duplicate locked decisions:** Cloud CTO references AGENTS.md + PRD + ADRs instead of maintaining its own register.
3. **Stale state removed, not hidden:** Old test counts and slice focus deleted from AGENTS-CTO.md; pointer to 00-Current-State.md added instead.
4. **Lessons compressed, not deleted:** All unique engineering lessons preserved as one-line rules in AGENTS.md; narrative history moved to archive.
5. **Doc-only boundary respected:** Zero frontend/backend source files touched.

## Files Moved to Archive

- `second-brain/01-Agent-Memory/Archive/agents-manual-cleanup-2026-08-12.md` — contains removed stale Section 6 (Current State Snapshot), duplicated Section 7 (Locked Decisions Register), deferred Section 11 (GitHub Portfolio Strategy) from AGENTS-CTO.md, and compressed historical narratives from AGENTS.md.

## Verification Results

| Check | Result |
|---|---|
| AGENTS.md: no bare `python` backend command | PASS (empty match) |
| AGENTS.md: contains `py -3.12` | PASS (4 matches: lines 19, 48, 107, 173) |
| AGENTS.md: contains `/tdd` | PASS (line 23) |
| AGENTS.md: contains `READY FOR CEO MANUAL VERIFICATION` | PASS (line 118) |
| AGENTS-CTO.md: no stale test counts (`Backend tests: 134`, `Frontend tests: 565`) | PASS (empty match) |
| AGENTS-CTO.md: contains Preflight Checklist | PASS (line 179) |
| AGENTS-CTO.md: references `second-brain/00-Current-State.md` | PASS (5 matches: lines 93, 102, 184, 201, 239) |
| AGENTS-CTO.md: contains "Cloud CTO only" statement | PASS (line 13) |
| Backups exist | PASS (2 files in `backups/`) |
| Archive file exists | PASS |
| No source code touched | PASS (doc-only slice) |

## Open Questions

- None. Slice is doc-only hygiene; no product or architecture decisions changed.
