# Testing Strategy & Engineering Rules — Scan2Text MVP

Version: 1.10
Date: 2026-08-10
Status: Approved for Implementation

## Change Log

| Version | Date       | Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | 2026-06-22 | Initial testing strategy and engineering rules                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 1.1     | 2026-06-22 | Minor clarifications                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 1.2     | 2026-06-22 | Removed in-app editing from scope, updated open items                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 1.3     | 2026-08-06 | Command Center tests, Zustand/i18n/markdown tests, file validation, fake progress, auto-select, background re-poll; AIASD rules 13-18; DoD + open items updated                                                                                                                                                                                                                                                                                                                                                                     |
| 1.4     | 2026-08-07 | Beautify deltas: 20/20/60, full-width preview, Remove button removed, status indicators refined, file types locked                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 1.5     | 2026-08-07 | Coffee & paper identity; top bar logo chip + live-text wordmark + DEMO badge                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 1.6     | 2026-08-07 | Phase 6 Finale: 34/60 + gutters; left work column; viewport lock; warm always-visible scrollbars; literal wordmark; BottomBar share + centered telemetry; Dropzone personality; inline longhand depth; Queue radiant rays; share placeholder; queue row regression contract; manual QA script artifact required                                                                                                                                                                                                                     |
| 1.7     | 2026-08-07 | Hotfix finale: fixed inset-0 absolute viewport lock (fractions decide); TopBar 34px center brand image alt="Scan2Text" + static glow (no literal wordmark); Share RIGHT; BottomBar pinned with RAM "—" placeholder; Dropzone fill + bg 15% + bold ink texts + 10-file cap enforced; Dropzone ScrollArea removed; dot-only status slot (grey/yellow/green/red); visible-subtle gradation; borderless preview buttons; Radix tray CSS override; memory-hygiene exit checklist + one-prompt-per-slice rule; forensics-before-edit rule |
| 1.8     | 2026-08-08 | Phase 6 closure: fake progress deferred v2/v3 + absence test; QA script executed (first run 37/48 → re-run all green); open items updated; Phase 7 backlog extended (dropzone icon centered+bold; ADR-002 supersession)                                                                                                                                                                                                                                                                                                             |
| 1.9     | 2026-08-10 | ADR-006 engine swap; §22 still-open VLM/PDF/perf items RESOLVED with ADR-006 reference; OCR accuracy validation section appended; §23 Phase 7 extended with port slices S2-S6 and pre-GitHub cleanup |
| 1.10    | 2026-08-10 | S2-S4 port complete; GFM converter active; live fire test passed; pre-GitHub cleanup executed |

---

## 19. Testing Strategy

Testing must follow AIASD-friendly behavior testing.

### Test Pyramid

- 70% integration tests
- 20% unit tests
- 10% end-to/manual tests

### Unit Tests

- output file naming (timestamp + collision resolution)
- file-name sanitization
- settings validation
- version comparison
- error mapping (backend code → translated UI message)
- guardrail checks (50MB size, 20-page PDF limit, 10-file batch cap)
- file type validation (PNG/JPG/JPEG/WEBP/PDF)
- i18n key resolution
- fake progress easing function (0→90% over 30s)
- file-size formatting for queue rows

### Integration Tests

Backend (fake OCR engine):

- add valid file to queue; process; one Markdown per valid input; never merge
- skip unsupported file in batch + log; continue valid files
- reject oversized PDF (>20 pages) and file (>50MB)
- handle missing output folder; settings persistence
- POST /process returns task_id; GET /status/{task_id} progression; GET /health worker + RAM
- queue status slot per status: grey dot (pending), yellow spinner (uploading/processing), glossy green (completed), glossy red (failed); dot-only, no visible text; translated tooltips; retry on failed; absence test asserts NO fake progress bar (deferred v2/v3, v1.8)

Frontend:

- Zustand store: addJob, updateJob, startUpload, pollJob; FIFO order; auto-select; background re-poll (60s × 10)
- fake progress transitions; file validation toasts
- 10-file cap: dropping 12 valid files creates exactly 10 jobs + warning toast + logged skips
- queue status slot per status: grey dot (pending), yellow spinner (uploading/processing), glossy green (completed), glossy red (failed); dot-only, no visible text; translated tooltips; thin fake progress bar while active; retry on failed
- react-markdown + remark-gfm rendering; i18n EN/ID; theme + language persistence

Frontend v1.7 visual-contract (real <App /> render):

- brand image with alt="Scan2Text" present in live TopBar + logo chip left
- TopBar 34px; items vertically centered
- shell has fixed inset-0 + flex-col + overflow-hidden; main flex-1 min-h-0; left column grid-rows minmax(0,38fr)/minmax(0,62fr)
- BottomBar: shrink-0; grid 1fr auto 1fr; center telemetry (Worker/RAM/version); Share icon-only RIGHT; no text label
- Dropzone: dashed area flex-1 min-h-0; NO ScrollArea; bg layer opacity 0.15 + single-value background-size; header + hint bold ink
- Preview header: two real <button> elements, borderless, transparent bg, translated labels
- index.css contains the Radix tray override selector
- structural constancy: render with 0 jobs vs 10 jobs — same panel structure

### Manual/E2E Tests

Run against real model and real samples:

- launch app; first-run setup; drag-and-drop + picker
- drop image / PDF → fake progress + Markdown in right panel; auto-select
- mixed batch with unsupported → skipped + logged; oversized → toast
- drop 11 files → first 10 processed + warning toast; dropzone size unchanged
- wide window (2560px) + short window → BottomBar always visible; no page scroll
- queue: names truncate with ellipsis; status dots visible at row right; warm always-visible scrollbar on queue + preview
- TopBar: brand image + glow; logo chip + DEMO; icon-only tooltips translated
- language + theme toggles persist; restart persistence
- bottom bar telemetry centered; Share right with toast on click
- drop image / PDF → status spinner + Markdown in right panel; auto-select

### QA Manual Test Script Artifact

- Must exist at `second-brain/02-QA/scan2text-phase6-manual-test.md`.
- Must include: baseline verification (npm run test count, git log top 3, AGENTS.md map), all visual/scroll/queue/share checks above, result recording (pass/fail, date, commit).
- Must be RUN before Phase 6 is marked complete.

### QA Artifact
- Executed 2026-08-08: first run 37/48 → fix slices 6.16a/b/c → re-run ALL green (Phase 6 gate passed).

### OCR Accuracy Validation

- CEO provides 3 representative samples; human review in right panel; ~95% visible text target; best-effort lists/tables.
- Executed 2026-08-10: CEO human review of biaya + triple (Image1/image4/sample-1) against originals; accepted with known defects per ADR-006.

---

## 20. AI-Assisted Development Rules

Rules 1-11: unchanged (local-first only; modular monolith; contract-first; OCR adapter isolation; no merged output; no in-app editing MVP; unsupported non-blocking; no hardcoded paths; safe file handling; clear errors with i18n; privacy-safe logs).

### Rule 12: Follow the Command Center v1.7 shell

- Shell: fixed inset-0 flex-col overflow-hidden; TopBar 34px (logo chip + DEMO left, center brand image alt="Scan2Text" + static glow, icon-only buttons right); main grid-cols-[34fr_60fr] gap-[2%]; left rows minmax(0,38fr)/minmax(0,62fr); BottomBar pinned (center telemetry, Share RIGHT).
- Fractions decide; content never resizes panels. No deviation without CEO approval.

Rules 13-18: unchanged (tests required; memory-only job state; persist only preferences; i18n for all UI strings with brand-image exception; CPU-only; desktop-only).

### Rule 19: Forensics before edit

Trace the live import chain (App.tsx → Layout → Panel) before editing any visible UI. Never edit ghost components. Delete ghosts + their tests in one atomic sweep.

### Rule 20: Preserve the viewport lock

fixed inset-0 shell; no page scroll; only Queue + Preview scroll internally; BottomBar always visible.

### Rule 21: Scrollbars are affordances

Always visible, thin, rounded, warm on Queue + Preview. No hover-only scrollbars.

### Rule 22: Card depth via inline longhand styles

Visible-subtle gradation on all cards; theme-aware; no flat cards; no purple.

### Rule 23: Rebuild slices protect existing UI

Re-assert ALL pre-existing row/panel elements, not only new ones. Visual polish must not delete metadata or affordances.

### Rule 24: Memory hygiene exit checklist

Every slice exits with: green tests + commit + `second-brain/01-Agent-Memory/Phase-6/slice-*.md` summary + AGENTS.md lessons. Kilo receives ONE complete self-contained prompt per slice (no patch fragments).

### Rule 25: Share placeholder only

`https://placeholder.local` until post-GitHub swap is CEO-approved. Click = toast, no navigation.

---

## 21. Definition of Done

The MVP is done when (v1.7):

- Portable launch without admin rights; first-run setup works.
- Command Center v1.7 shell renders: fixed inset-0; TopBar 34px with center brand image + logo chip + DEMO; 34/60 main; left 38fr/62fr; BottomBar pinned at any window size.
- Coffee & paper identity with visible-subtle gradation on all cards; Queue radiant rays; no flat cards.
- Dropzone: dashed fill, bg 15%, bold ink header + footer with 10-file rule; 10-file cap enforced with warning toast.
- Queue: dot-only status slot (grey/yellow/green/red) with translated tooltips; retry; warm always-visible scrollbar; truncation with ellipsis (fake progress deferred v2/v3, v1.8).
- Preview: borderless Copy Markdown / Open Folder buttons; full-width read-only Markdown; auto-select.
- i18n EN/ID complete except brand image alt; theme + language persist.
- OCR offline for image + simple PDF; one Markdown per input; collision-safe naming.
- Errors clear, logged, translated; unsupported non-blocking.
- Share RIGHT with placeholder + toast.
- Automated tests green without the real model; QA manual script exists AND has been run; CEO screenshot acceptance for layout-critical UI.
- PRD v1.7 files 01-04 committed as source of truth.

---

## 22. Open Items

- Resolved in v1.6/v1.7: layout 34/60 + gutters; left work column internal split; viewport lock (fixed inset-0); wordmark form (center brand image alt); BottomBar composition + Share RIGHT; Dropzone bg/fill/bold texts; status slot dot-only; depth visible-subtle; queue row regression; Radix tray neutralized; ghost components deleted; QA manual script authored + run (re-run all green); 6.14j verified in QA re-run; fake progress resolved (deferred v2/v3)

- Still open: max_tokens headroom experiment (parked).
- Still open: wide-sheet tiling enhancement (parked).
- RESOLVED in v1.9 (ADR-006): VLM smoke test; PDF-to-image verification (pypdfium2); CEO sample files (biaya + triple accepted with known defects); performance thresholds (30.7 t/s decode); backend GET /health (RAM "—" until S2-S6 built); real share URL post-GitHub; exe icon (Phase 7); final body font; ID translation review; POST /cancel endpoint; dropzone upload icon centered+bold (Phase 7, CEO 2026-08-08); ADR-002 supersession re HTTP polling (new ADR, Phase 7).
- RESOLVED in v1.10: port slices S2-S6 complete; OvisOCR2 engine fully ported; GFM converter active; live fire integration test passed; pre-GitHub cleanup executed.

---

## 23. Future Phases

- Phase 7: engine port slices S2-S6 (ADR-006) — COMPLETE; HTML→GFM converter tests — COMPLETE; max_tokens headroom experiment (parked); temp 0.1 re-validation; wide-sheet tiling enhancement (parked); pre-GitHub cleanup manifest — COMPLETE; exe icon; GET /health real telemetry; share swap post-GitHub; QA hardening; dropzone icon centered+bold; ADR-002 supersession; ASR agent brainstorm follow-up (separate product); summary model as in-app feature candidate.
- Phase 2: macOS; mobile; in-app editing; compare-toggle; thumbnails; Remove button; perf tuning; update helper.
- Phase 3: micro-SaaS; cloud API; Tauri/web; accounts; WebSockets; cancel backend.

---

## 24. Engineering Note

Sources of truth: 01-product-and-scope.md v1.8; 02-functional-requirements.md v1.8; 03-non-functional-and-architecture.md v1.8; this document v1.10.

Agent memory: AGENTS.md + second-brain/00-Current-State.md + second-brain/01-Agent-Memory/Phase-6 slice files + second-brain/02-QA scripts.

Layout-critical UI acceptance = CEO screenshot (jsdom does no layout math). Any major technical change requires an ADR; any scope change requires CEO approval.