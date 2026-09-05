All rulings locked. Here is the full **01-PRD v2.0** in GFM, ready for your review.

---

# Scan2Text — Product Requirements (Living Spec)

| | |
|---|---|
| Version | 2.1 |
| Date | 2026-08-22 |
| Status | Release GO — v1.0.0 approved with one known issue deferred to app v1.1 |
| Product Owner | Product Lead · Technical Owner: CTO |
| Audience | Product Lead + human reviewers — the WHAT and WHY |
| Supersedes | `01-product-and-scope.md` v1.13 + `02-functional-requirements.md` v1.12 (product-level parts) |
| Companion docs | `02-architecture-and-quality.md` (FRs, NFRs, contracts, testing) · `Archive/product-history.md` (sanitized history) |

> **Reading rule:** this doc owns product identity, scope, guardrails, success metrics, user stories and flow. Engineering contracts (FR acceptance criteria, NFR numbers, palettes, layout CSS, endpoints) live ONCE in the companion doc. On conflict, product intent = this doc; measurable contract = companion doc.

## 1. Product Identity & Vision
- Display name **Scan2Text** · package `scan2text` · executable `Scan2Text.exe`.
- Wordmark: center TopBar brand image (153×34, `alt="Scan2Text"`) with static glow. No literal text wordmark. **No DEMO badge** (removed at final product).
- Vision: a simple, portable, **offline** OCR appliance. Drop images/PDFs → process locally → get Markdown files → edit outside Scan2Text. **Not a document editor.**
- First product of a planned local-first family (ASR/summary = separate future products, out of scope).

## 2. Problem, Target User & Environment
- Problem: existing OCR tools need internet, installs, accounts; poor output; hard for non-technical users.
- Users: office workers, admin staff, operators, field workers, low-connectivity and non-technical Windows users.
- Environment: Windows 10/11, CPU-only machines OK, unstable or no internet, portable use without admin rights.

## 3. Technical Bounds & Constraints
- **Windows 10/11 x86_64 only.** No Linux, no macOS (future candidate).
- **CPU-only** inference; no GPU required or used.
- Min 8 GB RAM (16 recommended); ≥5 GB free disk; portable package: Thin (~81 MB, downloads models on first run) or Full (~1.1 GB, models included).
- No installer, no admin rights, runs from any user-writable folder.
- Fully offline after first model download; update check optional and non-blocking.
- Fixed-viewport desktop appliance; no mobile/responsive.
- Single running instance per machine.
- Markdown output only; editing happens in external tools.

## 4. MVP Scope — Must-Have
- Portable launch; drag-and-drop + click-to-browse; PNG/JPG/JPEG/WEBP/PDF.
- Local OCR (OvisOCR2 0.9B, CPU-only); model loads on demand; offline after first download.
- FIFO queue; batch cap 10 per drop; unsupported/invalid files skipped + logged, never blocking valid files.
- One Markdown per valid input; best-effort lists/tables; collision-safe naming; auto-saved.
- **Partial success:** a batch or PDF with ≥1 successful unit shows **completed (green)**; `failed` only when zero units succeed; a PDF produces one `.md` from its successful pages.
- **Long-running hint:** jobs over 2 minutes show a translated hint toast at the 2-minute mark, repeating every 2 minutes until done.
- Command Center UI: Dropzone top-left, Queue bottom-left, live Markdown preview right, pinned telemetry bar; viewport-locked (no page scroll, bar always visible).
- Dark default + light toggle; EN + ID auto-detect; all UI strings translated.
- **Preferences remembered:** theme + language survive restart (instant) and survive moving PCs (settings travel with the folder).
- Settings screen; portable folder structure; privacy-safe local logs.
- First-run: expectations notice + output folder wizard; model auto-downloader when models missing (progress, cancel, size verify).
- Feedback button (Google Form online; offline queue; never auto-sent); Share placeholder (toast only).

## 5. Future Release (Out of Scope)
- In-app editing · cloud processing · user accounts · mobile apps · real-time integrations · multi-user · advanced/perfect layout & table reconstruction · DOCX/XLSX export · self-updating installer · telemetry/analytics · paid licensing · GPU support · queue Remove button · side-by-side thumbnail compare · literal text wordmark · Dropzone scrollbar · live Share URL navigation (placeholder + toast until post-GitHub swap) · hover-only/invisible scrollbars · flat cards without depth · fake progress bar (v2/v3) · per-file progress indicator (v2/v3) · update notification in title bar · DEMO badge · legal T&C dialog · silent auto-send of feedback.
- **App v1.1 (deferred from v1.0.0):** FILE_TOO_COMPLEX queue red-dot tooltip — after backend rejection the hover tooltip shows generic "Failed" instead of the locked translated `FILE_TOO_COMPLEX` copy. Fix: map the `FILE_TOO_COMPLEX` error_code to its i18n string in the queue row tooltip path.

## 6. Guardrails
| Guardrail | Limit | Enforced by | User feedback |
|---|---|---|---|
| File size (all types) | 20 MB | Frontend, pre-queue | Error toast |
| PDF size | 20 MB | Backend Inspector, before rendering | "File too large or complex" |
| PDF pages | 50 | Backend Inspector, before rendering | "File too large or complex" |
| Batch | 10 files per drop | Frontend | Warning toast + logged |
| Types | PNG/JPG/JPEG/WEBP/PDF | Frontend | Error toast |

- One input → one `.md`. Never merge, never overwrite (collisions `_2`, `_3`, …).
- Naming: `{original_stem}_{HHmm}_{yyyyMMdd}.md`.
- Logs never contain file names or document content.

## 7. Success Metrics
- **Accuracy:** OCR output passes human review against originals (numeric target in 02 NFR-04).
- **Reliability:** one bad file never crashes the app or stops the batch; closing the app leaves zero leftover background processes.
- **Appliance feel:** UI never freezes; no page scroll at any window size; telemetry bar always visible.
- **Portability:** zipped folder works on another Windows PC with no install; preferences travel.
- **Privacy:** zero document content, zero telemetry leave the machine.
- **Simplicity:** first run to first Markdown without reading a manual.

## 8. User Stories
- As an office worker, I want to drop a scanned invoice and get editable text, so I don't retype it.
- As a field worker, I want full offline operation after first download, so bad internet never blocks me.
- As a non-technical user, I want one calm screen with clear status dots, so I always know what's happening.
- As an admin staff, I want to drop up to 10 files at once and have them process in order, so I can walk away.
- As a user with a huge PDF, I want an instant "too big" message, so I don't wait for nothing.
- As a privacy-conscious user, I want my documents to never leave my PC.
- As an Indonesian user, I want the UI in my language, automatically.
- As a night worker, I want a dark theme by default and my choice remembered forever.
- As a user with a failed file, I want the rest to keep going and a retry button for the failure.
- As a portable user, I want to carry the folder to another PC and keep my settings.

## 9. Core User Flow
1. Open `Scan2Text.exe`; first-run wizard (notice → output folder) if no settings.
2. App creates folders + defaults; no admin rights.
3. Drop files → validation (type, 20 MB, cap 10) → invalid rejected with toast, extras skipped + logged.
4. Files auto-process FIFO; model loads on demand.
5. One `.md` per valid input; preview auto-selects completed jobs.
6. User edits Markdown in external tools.

## 10. Version Notes
v2.1 (2026-08-22): v1.0.0 release GO by Product Lead with one known issue deferred to app v1.1 — FILE_TOO_COMPLEX queue red-dot tooltip shows generic "Failed" instead of locked translated copy. Doc-version scheme confirmed: PRD doc version independent from app version. App follow-up target is v1.1; PRD doc advances to v2.1.

v2.0 (2026-08-20): 20 MB/50 pages everywhere; DEMO removed; partial-success, 2-min hint, preference-travel added; FRs/NFRs moved to companion doc; backlog deleted to archive. Supersedes 01 v1.13 + 02 v1.12. History: `Archive/product-history.md`.

---