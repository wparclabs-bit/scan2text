# DOC-11 — AGENTS.md Diet

## What Changed
- **Backup:** `second-brain/00-Inbox/backups/AGENTS-pre-diet-2026-08-13.md`
- **Archive:** `second-brain/01-Agent-Memory/Archive/agents-diet-2026-08-13.md` (verbatim copy of removed content)
- **Section 4 trim:** Removed "Demo Mode (Phase 6):" paragraph and "Fake progress: 0 -> 90% over 30s eased" paragraph. Kept shell, layout, Tailwind, backend contract, validation, naming.
- **Section 7 replacement:** Replaced stale Phase-6 status with generic pointer to `00-Current-State.md`.
- **MCP block:** Removed orphaned MCP block from section 13 (contained violating playwright instruction). Added new section 3.11 with CEO-approved text: Code Diagnostics (typescript-lsp/python-lsp), Live Docs (context7), and explicit note that UI automation is CEO-only per 3.8.
- **Section 13 Misc trim:** Removed four Phase-6-visual lines (brand wordmark image, decorative bg layers, depth visible-subtle, drag-over highlight counter). Kept all other Misc product principles.
- **Line count:** 166 → 154 (12 lines removed).

## Key Decisions
- CEO Decision 1 Option A: keep MCP but fix it → section 3.11, removed playwright instruction (violates AGENTS.md 3.8).
- CEO Decision 2: MCP servers installed → confirmed in 3.11 text.
- ADR-008: Tauri supersedes pywebview → pywebview reference removed from archived MCP block only; not present in new AGENTS.md.
- Content copied first, source trimmed last → nothing lost; all removed content preserved in archive.

## Test Coverage
- Doc-only slice; no source code touched. No tests affected.
- Verification: `pywebview` = 0 hits, `UI & Browser Inspection` = 0 hits, `Demo Mode (Phase 6)` = 0 hits, `3.11 MCP` = 1 hit, `Phase 7 NEXT` = 0 hits.

## Open Questions
- None.
