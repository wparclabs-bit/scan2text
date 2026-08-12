# Agents Manual Cleanup Archive — 2026-08-12

This archive captures content removed during the S9.2 role-split refactoring of AGENTS.md and AGENTS-CTO.md.
No unique engineering rules were deleted; only duplicated, stale, or out-of-scope material was moved here.

---

## Removed from AGENTS-CTO.md

### Section 6: Current State Snapshot (STALE)
**Source:** AGENTS-CTO.md original Section 6  
**Reason:** Contains outdated test counts (Backend: 134, Frontend: 565) and stale slice focus. Dynamic state belongs in `second-brain/00-Current-State.md`.  
**Replaced by:** Pointer to `second-brain/00-Current-State.md`.

Original content:
```
## 6. Current State Snapshot (Update After Every Slice)

**Phase:** 7 (Real Backend) — In Progress  
**Current Focus:** ADR-007 Implementation (Slices 8.2-8.7)  
**Last Completed Slice:** S3-Upgrade (HTML table converter + crop guardrails) - Awaiting Kilo execution

**Backend Status:**

- Engine: OvisOCR2 0.9B (locked in ADR-006)
- Tests: 134 baseline green
- Post-processor: Built (pending Kilo execution of S3-Upgrade)

**Frontend Status:**

- Shell: Command Center v1.7 (viewport-locked)
- Tests: 565 green
- Next: ADR-007 UI features (Welcome screen, Feedback button, Model downloader)

**Pending Slices:**

- S4: Live Fire Integration Testing (with synthetic mocking)
- S8.2-S8.7: ADR-007 implementation (CPU budget, feedback, downloader, welcome screen, logs)
```

### Section 7: Locked Decisions Register (DUPLICATED)
**Source:** AGENTS-CTO.md original Section 7  
**Reason:** Duplicates CEO locked decisions already owned by AGENTS.md Section 8 and PRD/ADRs. Cloud CTO references AGENTS.md for Kilo execution constraints; does not maintain its own register.  
**Replaced by:** Pointer to AGENTS.md Section 8 + PRD + ADRs.

Original content covered:
- Slice S3 Decisions (HTML Table Converter & Crop Guardrails) — 11 items
- ADR-006 Locked Decisions — engine, sampling, prompt, pipeline
- ADR-007 Locked Decisions — feedback, CPU, distribution, welcome, logs, cadence
- CEO Global Locked Decisions — local-first, palette, shell, batch cap, etc.

### Section 11: GitHub Portfolio Strategy (DEFERRED)
**Source:** AGENTS-CTO.md original Section 11  
**Reason:** Deferred until app is complete; not part of active Cloud CTO operating manual. Can be restored when relevant.  
**Moved to archive** for reference; not deleted.

---

## Compressed in AGENTS.md

### Lessons Learned — Historical Narratives Moved to Archive
**Source:** AGENTS.md original Section 12 + Phase 7 Lessons  
**Reason:** Long historical narratives about individual slice implementations (6.14a through 6.14z, Phase 6 progress details) bloat the manual and drift with each slice. Active engineering rules preserved as one-line entries; narrative context archived.

#### Preserved as One-Line Rules (remain in AGENTS.md):
- min-width:auto bites at EVERY grid/flex level -> minmax(0,fr) + min-w-0 on tracks, columns, AND panel roots
- Content-sized containers make sibling panels grow with unrelated content -> minmax(0,fr) + min-h-0 everywhere
- For kiosk shells use fixed inset-0 so the viewport is the only sizing authority
- min-height:auto is the vertical twin of min-width:auto
- ScrollArea viewport child is display:table -> neutralize with CSS override
- Radix hides native scrollbars by design -> mount <ScrollBar /> for visible affordance
- Radix scrollbar DOM uses data-orientation / data-state, NOT data-radix-scroll-area-scrollbar
- Forensics before edit for twice-failed items: trace import chain App.tsx -> Layout -> Panel
- Verify the ACTUAL live component before assuming a ghost
- Before deleting, grep ALL consumers incl. tests/debug scripts
- git show --stat HEAD / git log -5 to check whether previous slice touched source or only tests/docs
- jsdom does NO layout math: assert className/source, not computed pixels
- Brand wordmark is an IMAGE; tests assert alt="Scan2Text", not literal text
- Never hardcode D:\ paths in frontend; Vite relative imports
- Decorative bg layers: backgroundSize single value '100%' (never 'cover' or '100% 100%')
- Depth must be visible-subtle, not garish
- Path discovery before edit: app under frontend/; i18n frontend/src/locales/. "File not found" is a lookup task
- Absence tests keep removed features removed
- Drag-over highlight needs enter/leave counter + onDragOver preventDefault
- Per-locale icon inside translation string = i18n owns the whole message
- Non-technical users need non-technical feedback channels (GForm over GitHub Issues)
- Cap CPU so the PC stays usable
- Size-based log rotation beats calendar deletion
- Opt-in send, never silent upload — privacy is a product feature
- GitHub noreply commit email keeps identity swappable
- Always use py -3.12 for backend tests and commands, NEVER bare python
- Backend binds 127.0.0.1 only; local-first means localhost-first
- Error hints mislead; probe with minimal auditable scripts
- Golden outputs are references, not truth
- When the agent wanders, hand it verbatim file content; zero design freedom
- No run without a file: reproducible, or it didn't happen
- Disk is truth: list models/ with sizes before asserting engine state
- Engine swap = recipe swap: prompt, sampling, and geometry travel together
- Production defaults must match the spike recipe
- YAGNI: Ovis is the sole engine; external backup for disaster recovery only
- Strict adherence to Matt Pocock TDD skills: RED->GREEN->REFACTOR cycle enforced
- S2-S4 port success: verbatim prompt + temp 0.1 + full-page normalization is the locked Ovis recipe
- GFM stdlib converter prevents frontend HTML table breakage

#### Moved to Archive (narrative slice history):
- All Phase 6 progress items (slices 6.11 through 6.14z) with detailed test count deltas
- All Phase 7 narrative entries with implementation details
- SPIKE entries with PyInstaller spec file references
- S8.x and S9.x slice summaries with code-level detail

---

## Files in This Archive
- `agents-manual-cleanup-2026-08-12.md` (this file)

## Backups
- `second-brain/00-Inbox/backups/AGENTS.md-20260812-1637`
- `second-brain/00-Inbox/backups/AGENTS-CTO.md-20260812-1637`
