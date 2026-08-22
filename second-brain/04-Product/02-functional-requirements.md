
---

# Scan2Text — Architecture & Quality (Living Spec)

| | |
|---|---|
| Version | 2.0 |
| Date | 2026-08-20 |
| Status | Release Candidate — pending CEO review |
| Audience | CTO + Kilo + engineers — the HOW, contracts, quality |
| Supersedes | `03-non-functional-and-architecture.md` v1.15 + `04-testing-and-engineering-rules.md` v1.10 + product-level parts of old 01/02 |
| Companion docs | `01-product-and-requirements.md` (product intent, guardrails limits, success metrics) · `Archive/product-history.md` |

> **Reading rule:** measurable contracts live ONCE here. Guardrail *limits* (20MB/50 pages/10 files) are owned by 01 §6; FRs below reference them. Execution rules (CSS law, palette mirror, slice discipline) live in `AGENTS.md`; this doc never duplicates them. ADRs live in `second-brain/03-Architecture/ADRs/`.

## 1. Non-Functional Requirements
- **NFR-01 Offline-First:** fully offline after initial download; no processing requires internet; update check optional, non-blocking.
- **NFR-02 Privacy:** content stays local; no telemetry/analytics/cloud upload; logs contain no file names, no content, no OCR text; feedback never auto-sent.
- **NFR-03 Performance:** accuracy over speed; long-running ops show progress; UI never freezes; CPU-only; decorative UI static (zero-CPU); internal scroll never page-scrolls; auto threads = 60% logical cores (floor 1).
- **NFR-04 Accuracy:** ~95% visible text on approved samples, judged by human review; best-effort lists/tables; known model defects in ADR-006 register.
- **NFR-05 Reliability:** one bad file never crashes app; one failed item never stops valid items unless fatal; unsupported skipped + logged; graceful recovery from missing settings; **clean exit: closing the shell terminates the entire backend process tree within 5s and frees port 47351**.
- **NFR-06 Portability:** folder/zip distribution (~1.5 GB with models); no installer.
- **NFR-07 Compatibility:** Windows 10/11 x86_64; min 8 GB RAM (16 rec); ≥5 GB disk; desktop-only.
- **NFR-08 Shell Stability:** viewport-locked shell; no window/body scroll; BottomBar always visible; fraction-sized panels; scrollbars as affordances (Queue + Preview); depth on all cards; 1vh TopBar gutter; pathological short windows = accepted edge. CSS law in `AGENTS.md` §5.

## 2. Technical Architecture
- **Style:** local-first modular monolith. No cloud, no external DB, no microservices.
- **Runtime:** Tauri v2 shell (Rust, source `frontend/src-tauri/`, ADR-008) bundles built React frontend; spawns PyInstaller folder artifact `backend/scan2text-backend.exe` as child; backend binds **127.0.0.1:47351**.
- **Lifecycle (locked intent, FIX77):** Tauri owns spawn AND kill — on exit, whole backend process tree killed (`taskkill /F /IM scan2text-backend.exe /T`, hidden window, port-wait ≤5s); at boot, stale holder of 47351 killed before spawn (self-heal). Single running instance assumed.
- **Communication:** HTTP polling (WebSockets deferred). `POST /process` → `{task_id}`; `GET /status/{task_id}` 15×2000ms = 30s, then background re-poll 60s × 10.

## 3. Approved Tech Stack
- **Backend:** Python 3.12 (`py -3.12` locked); FastAPI; Pydantic; llama-cpp-python; OvisOCR2 0.9B (`vlm.gguf` Q8_0 + `mmproj.gguf` f16, ADR-006); pypdfium2; JSON settings; rotating logs.
- **Frontend:** Vite + React + TS; Tailwind v3 + shadcn/ui; Zustand (memory-only jobs); react-markdown + remark-gfm; react-i18next (en+id); Tauri v2; PyInstaller (backend artifact only).
- **Key decisions:** no router; dark default + light toggle; jobs never persist; validation per 01 §6; palette/depth/typography tokens in FR-14.

## 4. Runtime & Repo Structure
```
Scan2Text/
├── Scan2Text.exe            # Tauri shell
├── backend/                 # PyInstaller folder artifact
│   ├── scan2text-backend.exe
│   └── _internal/
├── models/                  # EXTERNAL, runtime download
├── output/  ├── settings/settings.json  ├── feedback/pending|sent/  └── logs/app.log
```
```
scan2text/
├── src/scan2text/           # api/ routes/ adapters/ services/ models/
├── tests/
├── frontend/
│   ├── src/ (components/ stores/ lib/ i18n/ hooks/)
│   ├── src-tauri/           # Rust shell (backend_process.rs, lib.rs)
│   └── Images/
└── second-brain/ (00..05)
```

## 5. Local Application Contract
| Endpoint | Purpose |
|---|---|
| `POST /process` | multipart → `{task_id}` |
| `GET /status/{task_id}` | six statuses + `result_markdown` on completion |
| `GET /api/health` | worker, RAM%, CPU%, model loaded (canonical; no bare `/health`) |
| `GET/PUT /api/settings` | AppSettings read/patch (incl. theme, language) |
| `GET /api/feedback/pending-count` | launch reminder trigger |
Future: `POST /cancel/{task_id}`; `POST /api/output/open`. Share = frontend-only placeholder. Loopback CORS `*` safe (127.0.0.1-only, ADR-008 addendum). `/api/jobs` legacy, unused.

## 6. Core Data Contracts
`AppSettings`: output_dir, max_pdf_pages, cpu_threads (0=auto), check_updates_on_startup, language ("auto"|"en"|"id"), theme ("dark"|"light"), hide_welcome_notice.
`JobStatus`: pending/uploading/processing/completed/failed/background.
`OCRJob` (backend): id, file_name, file_path, file_size, status, created_at, updated_at, output_path, error_code, error_message.
`ScanJob` (frontend): id, fileName, fileSize, taskId, status, isBackground, createdAt, resultMarkdown, error.
`OCRResult`, `ProgressEvent` (future WS), `UpdateInfo` (current/latest/download_url/notes/model_version).

## 7. Global Error Envelope
```json
{ "error": { "code": "MODEL_NOT_FOUND", "message": "…", "details": {} } }
```
Codes: MODEL_NOT_FOUND · MODEL_LOAD_FAILED · UNSUPPORTED_TYPE · FILE_TOO_LARGE · PDF_TOO_MANY_PAGES · FILE_TOO_COMPLEX · OCR_FAILED · OUTPUT_NOT_WRITABLE · INVALID_SETTINGS · DOWNLOAD_FAILED · SIZE_MISMATCH · **PARTIAL_FAILURE (log-only, never user-facing status)**. No raw stack traces; i18n-mapped messages; unknown codes shown as-is English.

## 8. Update Mechanism & Logging
- **Update:** GitHub `version.json`; binaries on GDrive; launch-only if enabled; non-blocking; silent offline; manual download, no self-update; monthly cadence.
- **Logging:** `logs/app.log`, 1 MB rotation ×1. Events: start, settings, model load, job start/complete/skip/fail, output saved, update result, batch-cap skips. Fields: extension + bytes + pages + duration + code + model version + timestamp. Never names/content/OCR text.

## 9. Functional Requirements (FR-01…FR-17)
**FR-01 First-Run:** two-step wizard (notice → folder picker); notice re-shown until `hide_welcome_notice`; re-openable from Settings; creates folders + defaults; no admin rights.

**FR-02 Layout (Command Center):** shell per NFR-08 + AGENTS.md §5. TopBar 34px: LEFT logo chip only (DEMO removed); CENTER brand image 153×34 `alt="Scan2Text"` + static glow; RIGHT icon-only toggles. Dropzone: dashed fill, bg `bacground-left-top-panel.jpg` 15%, bold ink header/footer, footer "PNG · JPG · WEBP · PDF — max 20MB per file · max 10 files per batch", no ScrollArea, drag glow + click-browse. Queue: warm always-visible scrollbar, static rays, row = icon + truncated name + size + 14px dot-only slot + tooltip + retry; empty states EN "📭 Nothing here yet. Drop something tasty!" / ID "🙈 Masih belum ada file tuh! Coba upload di atas!". Preview: full-width read-only Markdown; borderless Copy Markdown/Open Folder (caramel hover); empty ✨ "Select a completed job to preview the magic."; auto-select. BottomBar: LEFT empty; CENTER Worker·RAM·CPU%·version from `/api/health`; RIGHT icon-only Share.

**FR-03 File Input:** types + dnd + picker; pre-upload validation per 01 §6 (20MB/type/cap-10) with toasts; **PDF Inspector (backend, pre-render): >20MB or >50 pages → FILE_TOO_COMPLEX, pixels never rendered**; all-unsupported → non-blocking warning + log.

**FR-04 Queue:** FIFO; six statuses; dot colors (grey `#A8A29E`/`#78716C`; spinner `#FACC15`; green/red glossy radial gradients); translated tooltips; retry; background >30s → 60s×10; one failure never stops batch; **partial success: ≥1 succeeded → completed; failed only when zero succeeded; PARTIAL_FAILURE logged only**; **2-min long-running hint toast, repeats every 2 min**; no fake progress bar (v2/v3).

**FR-05 Model Loading:** on demand with progress; stays loaded; missing/corrupt → actionable error; offline after first download; OvisOCR2 0.9B, temp 0.1.

**FR-06 OCR & PDF Resilience:** separate processing, never merged; PDF per-page rasterized; one `.md` per PDF with page separators; **per-page resilience: failed page skipped + privacy-log; `.md` from successful pages in order; PDF fails only if ALL pages fail**; pypdfium2.

**FR-07 Removed** (no in-app editing).

**FR-08 Output:** one `.md` per input; auto-save; `{original_stem}_{HHmm}_{yyyyMMdd}.md`; collisions `_2`,`_3`; never overwrite/merge; chart crops → `<stem>_files/images/` only when present; best-effort GFM; UI shows saved path.

**FR-09 Settings:** fields per §6; persist `settings.json`; **theme/language semantics: localStorage written immediately on toggle + debounced (~800ms) mirror to settings.json; boot hydrates localStorage first; if absent, falls back to settings.json (theme class + i18n applied)**; graceful recovery.

**FR-10 Update Check:** per §8.

**FR-11 Error Handling:** per §7 + skip/log non-blocking + i18n keys + `FILE_TOO_COMPLEX` → "File too large or complex to process. Please try a smaller file."

**FR-12 Portable Runtime:** user-writable folder; no admin; no hardcoded machine paths; external output dir allowed.

**FR-13 i18n:** react-i18next; en+id; auto-detect, English fallback; all strings keys; brand image alt exempt; persistence per FR-09.

**FR-14 Theme & Visual Tokens:** dark default, instant; DARK bg `#080502`, Dropzone `#E1DCC9` (ink `#1F150C`), Queue `#412D15` (cream `#F2EBDD`), Preview `#1F150C`, accent `#E3A55F`; LIGHT bg `#F9F8F6`, `#EFE9E3`/`#D9CFC7`/`#C9B59C`, accent `#92400E`; green/red dots retained; depth = visible-subtle gradation, no borders/flat/purple; warm scrollbars Queue+Preview only; Quantico display + swap-friendly body (one CSS variable); static rays.

**FR-15 Share Placeholder:** icon-only RIGHT; `https://placeholder.local`; click = toast ("Sharing coming soon." / "Berbagi segera hadir."), no nav; swapped post-GitHub.

**FR-16 Feedback:** next to Share; online → Google Form; offline → dialog saved to `feedback/pending/`; launch reminder moves to `sent/`; no silent upload; i18n.

**FR-17 Model Auto-Download:** trigger missing GGUFs; `.part` + atomic rename; size verify; progress + cancel; translated errors; proceeds after success; URL from `version.json`.

## 10. Testing Strategy
Pyramid 70/20/10 (integration/unit/manual). AIASD behavior testing; TDD RED→GREEN mandatory.
- **Unit:** naming + collisions; sanitization; settings validation; version compare; error mapping; guardrails (20MB, 50 pages, cap 10); type whitelist; i18n keys; size formatting.
- **Integration (backend, FakeOCR):** one .md per input, never merge; skip unsupported + log; **reject >50 pages / >20MB pre-render**; missing output folder; settings persistence; /process → /status progression; /api/health telemetry; status-slot contract + absence test (NO fake progress bar).
- **Integration (frontend):** store addJob/updateJob/pollJob; FIFO; auto-select; background re-poll; cap-12→10 jobs + toast; markdown render; i18n; theme+language persistence incl. settings.json fallback; visual-contract renders (brand alt, 34px TopBar, fixed shell, BottomBar grid, Dropzone no-ScrollArea, borderless preview buttons, Radix tray override, 0-vs-10 structural constancy).
- **Manual/E2E:** against real model; `second-brain/02-QA/` scripts CEO-executed; accuracy = CEO human review vs originals.
- No concrete test counts in this doc (counts live in `00-Current-State.md`).

## 11. Definition of Done
Portable launch, no admin; Command Center renders per contract; coffee & paper depth; cap-10 enforced; dot-only slots + tooltips + retry; borderless preview buttons; i18n complete except brand alt; preferences persist (restart + PC-move); offline OCR image+PDF; collision-safe naming; errors translated, non-blocking; Share/Feedback placeholders; automated gates green; QA script run; CEO screenshot acceptance; PRD v2.0 docs committed as source of truth.

## 12. Version Notes
v2.0 (2026-08-20): 20MB/50-pages unified; DEMO purged; partial-success + per-page resilience + persistence semantics + 2-min hint + clean-exit NFR + lifecycle kill-tree + `frontend/src-tauri/` + feedback endpoint added; fake-progress stale lines purged (absence test kept); engineering rules de-duplicated to AGENTS.md. Supersedes 03 v1.15 + 04 v1.10. History: `Archive/product-history.md`.

---

--

## 13. Update Mechanism

- Source: GitHub-hosted version.json; binaries (app zip + models) hosted on Google Drive; download_url points to GDrive. First run: in-app model downloader (progress + cancel + size verify) or manual zip replacement (ADR-007).
- Flow: launch → if enabled + online, fetch → if newer, notify in top bar → user downloads zip manually → replaces app files preserving settings/, output/, logs/.
- Manual process; no self-updating executable.

---

## 14. Logging Requirements

- Location: logs/app.log; size-based rotation: maxBytes 1 MB, backupCount 1.
- Log: app start, settings loaded, model load started/completed, job started/completed/skipped/failed, output saved, update check result, batch-cap skips (extension + byte count + page count only; no file names; no content).
- Fields: extension + byte count + page count + duration + error/warning code + model version + timestamp.
- Never log extracted OCR text or full document contents by default.

---

## 15. Testing Strategy

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
- reject oversized PDF (>50 pages) and file (>50MB)
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