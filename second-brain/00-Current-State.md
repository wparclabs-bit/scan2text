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
- **2026-08-14 (S9.6):** Tauri bundle.resources config — added `"resources": ["../../dist/scan2text-backend"]` to bundle section in tauri.conf.json. Backend artifact discovered at dist/scan2text-backend/ (45 MB PyInstaller folder). GATE passed. RED→GREEN validation script created. Doc/config-only; no Rust source touched.
- **2026-08-13 (S9.5):** Tauri sidecar forensics (read-only) — mapped src-tauri structure (866 source lines, ~30 KB), confirmed BackendManager + RunEvent::Exit hooks already implemented, externalBin config absent, no Rust code changes. Scope report generated; recommends 2-slice split (config wiring + lifecycle completion). Doc-only; no source touched.
- **2026-08-13 (DOC-11):** AGENTS.md diet — slimmed stale Phase-6 content, relocated + fixed MCP block to section 3.11, archived Phase-6 visual detail. Backup in 00-Inbox/backups/; archive in 01-Agent-Memory/Archive/. Doc-only slice; no source touched.
- **2026-08-13 (S9.4b-4):** App.tsx wired — imported buildApiUrl, replaced 4 relative fetch URLs (settings, download/status+cache-buster, download/start, feedback/pending-count) with buildApiUrl() calls. Added 4 RED tests (fixed mock implementations for cross-call stubbing + navigator.onLine). 4 RED tests turned GREEN. S9.4b COMPLETE. Frontend: 610 green, 0 failures.
- **2026-08-13 (S9.4b-3):** Removed hardcoded `API_BASE` constants from api.ts and uploadService.ts; wired all fetch calls through buildApiUrl(). Deleted `const API_BASE = 'http://127.0.0.1:8000'` from both files. Added buildApiUrl imports. 5 RED tests turned GREEN. Frontend: 606 green, 0 failures.

For older history see second-brain/01-Agent-Memory/Archive/state-history.md
