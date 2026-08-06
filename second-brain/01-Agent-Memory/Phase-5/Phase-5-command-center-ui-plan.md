# Phase 5 - Command Center UI Plan

Date: 2026-08-06
Phase: Phase 5 - UI and State Integration
Status: IN PROGRESS
Version: 1.0

## Change Log

| Version | Date       | Changes |
|---------|------------|---------|
| 1.0     | 2026-08-06 | Initial Phase 5 plan. Consolidates all locked decisions from Slices 13-17 and UI design sessions. |

---

## 1. Product Vision

Scan2Text is a local-first, offline, portable OCR tool.
Users drop images/PDFs and get clean Markdown output.
The UI is a "Command Center" — a pro-grade local web dashboard.

**The Vibe:** Minimalist, dark-mode ready, high-contrast (like Linear or Vercel).
**Target:** Non-technical users. Desktop-first.
**PRD Reference:** v1.3 documents (01 through 04).

---

## 2. Locked Architecture Decisions

### 2.1 Backend
- Python FastAPI
- `POST /process` → upload file, returns `{ task_id }`
- `GET /status/{task_id}` → get task status
- No `/api/jobs` routes (replaced by simpler contract in Phase 4)
- `uploads/` folder for persistent file storage
- `llama-cpp-python` for model inference
- GLM-OCR 0.9B model (`vlm.gguf` + `mmproj.gguf`)
- CPU-only inference (no GPU)
- PDF handling: likely needs PDF-to-image conversion before VLM (UNVERIFIED)

### 2.2 Frontend
- Vite + React + TypeScript + Tailwind + shadcn
- Zustand for state management (memory-only, NO localStorage/sessionStorage for job state)
- react-markdown + remark-gfm for Markdown rendering (GFM support)
- react-i18next for internationalization (English + Indonesian)
- NO React Router for MVP (single-page dashboard, state-based panel switching)
- Dark mode DEFAULT with toggle to light mode
- Desktop-only for MVP

### 2.3 Transport
- HTTP Polling for task status (WebSockets deferred from Sprint 1 ADR-002)
- `DEFAULT_POLL_OPTIONS`: 15 attempts × 2000ms = 30 seconds
- If polling exceeds 30s: show background processing message

### 2.4 Model & Inference
- **VLM Model:** GLM-OCR 0.9B (`vlm.gguf` + `mmproj.gguf`)
- **Runner:** `llama-cpp-python`
- **Hardware:** CPU-only (GPU intentionally excluded for portability)
- **PDF Handling:** Likely requires PDF-to-image conversion before VLM inference. UNVERIFIED.

---

## 3. Command Center UI Layout

### 3.1 Full Dashboard

┌─────────────────────────────────────────────────────────────────────────┐ │ 📝 Scan2Text [🌙/☀️] [🌐 EN/ID] [⚙️]│ ├────────────────────┬──────────────────────────┬─────────────────────────┤ │ │ │ │ │ LEFT PANEL │ CENTER PANEL │ RIGHT PANEL │ │ (Drop Zone) │ (The Queue) │ (Live Preview) │ │ Width: 20% │ Width: 35% │ Width: 45% │ │ │ │ │ │ ┌──────────────┐ │ ┌────────────────────┐ │ ┌─────────┬─────────┐ │ │ │ │ │ │ File │ Status │ │ │ │ │ │ │ │ ✨ DROP │ │ ├────────┼───────────┤ │ │ Original│ Rendered│ │ │ │ FILES │ │ │ report │ ⏳ OCR │ │ │ Image │ Markdown│ │ │ │ HERE │ │ │ notes │ ✅ Done │ │ │ │ │ │ │ │ │ │ │ scan │ ❌ Fail │ │ │ (left) │ (right) │ │ │ │ │ │ │ invoice│ ⏳ Pend │ │ │ 30% │ 70% │ │ │ │ │ │ ├────────┼───────────┤ │ │ │ │ │ │ │ │ │ │ ▓▓▓░░ │ 67% │ │ │ │ │ │ │ └──────────────┘ │ └────────────────────┘ │ └─────────┴─────────┘ │ │ │ │ │ ├────────────────────┴──────────────────────────┴─────────────────────────┤ │ BOTTOM BAR: Worker: 🟢 Busy │ RAM: 4.2GB │ GPU: N/A (CPU) │ v0.1 │ └─────────────────────────────────────────────────────────────────────────┘


### 3.2 Panel Specifications

| Panel | Width | Content |
|-------|-------|---------|
| Top Bar | Full width | App title, theme toggle, language toggle, settings icon |
| Left Panel | 20% | Drop Zone (large, glowing drag-and-drop area) |
| Center Panel | 35% | Queue table (file name, status, progress bar) |
| Right Panel | 45% | Live Preview (image thumbnail 30% + Markdown 70%) |
| Bottom Bar | Full width | Worker status, RAM usage, version |

- Panel widths are **fixed** (not resizable).
- Desktop-only for MVP. No responsive/mobile layout.

### 3.3 Right Panel — Completed Job (Side-by-Side)

When a completed job is selected (or auto-select triggers):

┌─────────────────────────────────────────────────┐ │ 📄 notes.png ✅ Completed │ ├──────────────────┬──────────────────────────────┤ │ │ │ │ │ # Meeting Notes │ │ [Original │ │ │ Image] │ ## Attendees │ │ │ - John │ │ scan_001.png │ - Sarah │ │ │ │ │ (30% width) │ ## Action Items │ │ │ 1. Follow up budget │ │ │ 2. Schedule meeting │ │ │ │ │ │ (70% width) │ └──────────────────┴──────────────────────────────┘


- Image on LEFT (30%). Markdown on RIGHT (70%). Side-by-side for easy comparison.
- For **image files**: show original image via object URL (`URL.createObjectURL(file)`).
- For **PDF files**: show a PDF icon/placeholder thumbnail (no actual PDF rendering in MVP).
- Image is memory-only (lost on page refresh). Acceptable for MVP.

### 3.4 Right Panel — Non-Completed Jobs

| Job Status    | Right Panel Shows                          |
|---------------|--------------------------------------------|
| Pending       | "Waiting to start..."                      |
| Processing    | Spinner + "Extracting text..."             |
| Failed        | Error message in red                       |
| Background    | 30s timeout message + "Check the Queue"    |
| Completed     | Image (left 30%) + Rendered Markdown (right 70%) |

### 3.5 Empty States

| Panel | Empty State |
|-------|-------------|
| Left Panel | Always shows Drop Zone (no empty state needed) |
| Center Panel | 📭 **"Nothing here yet. Drop something tasty!"** |
| Right Panel | ✨ **"Select a completed job to preview the magic."** |

Empty states use bold text + fun icon. Easy to read, not sad.

---

## 4. Queue Behavior

### 4.1 Status Values

| Status | Icon | Description |
|--------|------|-------------|
| pending | ⏳ | Waiting to start |
| uploading | ⬆️ | File being uploaded to backend |
| processing | 🔍 | OCR in progress |
| completed | ✅ | OCR done, result available |
| failed | ❌ | OCR failed |
| background | 🔄 | Polling timed out, will auto re-poll |

### 4.2 Progress Bar (Fake Progress)

- Animates from **0% to 90%** over 30 seconds (eased: starts fast, slows near 90%).
- Jumps to **100%** when job completes.
- Turns **red and stops** when job fails.
- **Pauses at ~90%** with subtle pulse when job goes to background.
- This is a frontend-only animation. No backend progress data needed.

### 4.3 Queue Order

- **FIFO** (First In, First Out). No sorting.
- Files appear in the order they were dropped.
- Store uses `jobOrder: string[]` array to track insertion order.

### 4.4 Auto-Select

- When a job completes OCR, the right panel **automatically** switches to show its result.
- The completed job is highlighted in the queue.
- User can still click other jobs to view them.

### 4.5 Background Processing

- If polling exceeds 30 seconds (15 attempts × 2000ms), job status changes to `background`.
- Background jobs are **automatically re-polled every 60 seconds**.
- **Maximum 10 re-polls** (10 minutes total). After that, mark as timeout.
- Background message: *"Still processing in the background. Large files can take a few minutes. Check the Queue for completion."*

### 4.6 Queue Actions

- **Completed/Failed jobs:** [✕] Remove button.
- **In-progress jobs:** [Cancel] button (future — Slice 25, requires backend cancel endpoint).

---

## 5. Internationalization (i18n)

### 5.1 Approach
- **Library:** react-i18next
- **Languages:** English (`en`), Indonesian (`id`)
- **Default:** Auto-detect browser language, fallback to English
- **Toggle:** Top bar button next to theme toggle. Shows current language code (e.g., "EN" or "ID").
- **Persistence:** Language preference saved to localStorage.

### 5.2 Scope
- All UI strings are translation keys (no hardcoded text).
- Known backend errors are mapped to translated messages.
- Unknown errors show as-is (English).
- Initial translations drafted by AI, reviewed and adjusted by CEO.

### 5.3 Translation Files
- `en.json` — English translations
- `id.json` — Indonesian translations
- Fun/casual tone maintained in both languages.

---

## 6. Theme

- **Default:** Dark mode.
- **Available:** Dark, Light.
- **Toggle:** Top bar button. Shows 🌙 in dark mode, ☀️ in light mode.
- **Persistence:** Theme preference saved to localStorage.
- **Design language:** Minimalist, high-contrast, inspired by Linear/Vercel.
- Theme change applies immediately without page reload.
- All UI components must support both themes.

---

## 7. File Validation

- **Accepted types:** PNG, JPG, JPEG, WEBP, PDF
- **Max size:** 50MB per file
- **Validation location:** DropZone (before upload)
- **Invalid type or oversized:** Show error toast (shadcn toast), do NOT upload.
- **Toast component:** shadcn toast (to be added in Slice 19).

---

## 8. Store Changes Needed for Phase 5

### 8.1 ScanJob Interface Updates
- Add `imageUrl: string | null` (object URL from File, for right panel image display)
- Add `jobOrder: string[]` to store (tracks FIFO insertion order)
- Add `selectedJobId: string | null` (tracks which job is shown in right panel)

### 8.2 New Store Actions Needed
- `selectJob(jobId)` — set the selected job for right panel display
- `cancelJob(jobId)` — cancel an in-progress job (calls backend cancel endpoint, Slice 25)
- `removeJob(jobId)` — remove a completed/failed job from the queue (already exists)

### 8.3 Auto-Select Logic
- In `pollJob`: when status becomes "completed", auto-set `selectedJobId` to that job.

---

## 9. Backend Changes Needed

### 9.1 New Endpoints
- `GET /health` → returns worker state (idle/busy), RAM usage, model loaded state. Used by bottom bar.
- `POST /cancel/{task_id}` → cancels an in-progress OCR task. (Slice 25, future)

### 9.2 Image Serving
- Frontend uses object URLs (`URL.createObjectURL(file)`) stored in Zustand.
- No backend image-serving endpoint needed for MVP.
- Image URLs are memory-only (lost on page refresh) — acceptable for MVP.

### 9.3 PDF Handling
- VLM likely requires PDF pages converted to images before inference.
- Raw PDF bytes may not be directly supported by GLM-OCR.
- **UNVERIFIED.** Needs a backend spike/slice to confirm.

---

## 10. Slice Plan

### Completed Slices

| Slice | Feature | Status |
|-------|---------|--------|
| 13 | Frontend Baseline Verification | ✅ COMPLETE |
| 13.2 | DropZone Test Stabilization | ✅ COMPLETE |
| 14 | Memory-Only Zustand Store Skeleton | ✅ COMPLETE |
| 15 | Upload Action Wiring (startUpload) | ✅ COMPLETE |
| 16 | Polling Action Wiring (pollJob) | ✅ COMPLETE |
| 17 | DropZone UI Wiring to New Store | ✅ COMPLETE |

### Pending Slices

| Slice | Feature | Complexity |
|-------|---------|------------|
| 18 | Layout skeleton: 3-panel CSS grid + bottom bar + dark mode + theme toggle + i18n setup | Medium |
| 19 | Left Panel: Wire DropZone into left panel + shadcn toast + file validation | Medium |
| 20 | Center Panel: Queue table with live status from Zustand store + fake progress | Medium |
| 21 | Right Panel: Image thumbnail (left 30%) + Markdown (right 70%) with react-markdown | Medium |
| 22 | Bottom Bar: Backend worker/RAM endpoint + frontend display | Medium |
| 23 | Edit mode for Markdown | FUTURE |
| 24 | Save edits to backend | FUTURE |
| 25 | Queue cancel (backend cancel endpoint + frontend) | FUTURE |

### Slice 18 Breakdown (Layout Skeleton)

Slice 18 includes:
- Install react-i18next + i18next-browser-languagedetector
- Create `en.json` and `id.json` translation files (initial draft)
- Set up i18n configuration with auto-detect + fallback English
- Create 3-panel CSS grid layout (20/35/45 fixed widths)
- Create bottom status bar (placeholder content)
- Create top bar with app title
- Implement dark mode default + theme toggle
- Implement language toggle
- Persist theme + language to localStorage
- Empty state placeholders for center and right panels

---

## 11. Test Count History

| After Slice | Test Count | Notes |
|-------------|------------|-------|
| Slice 13 | 56 total | 54 pass, 2 fail (pre-existing) |
| Slice 13.2 | 56/56 | Fixed Vitest hoisting bug |
| Slice 14 | 74/74 | Added store skeleton tests |
| Slice 15 | 85/85 | Added startUpload tests |
| Slice 16 | 97/97 | Added pollJob tests |
| Slice 17 | 95/95 | Removed 2 old Sprint 1 tests (WebSocket/assignTaskId) |

**Current baseline: 95/95 passing.**

---

## 12. Open Items / Unverified

1. **PDF-to-image conversion:** VLM likely needs rendered pixels, not raw PDF bytes. Must verify before PDF support is considered working.
2. **VLM smoke test:** GLM-OCR + mmproj.gguf via llama-cpp-python not yet tested.
3. **Worker status endpoint:** `GET /health` needs to be built.
4. **Cancel endpoint:** `POST /cancel/{task_id}` needs to be built (Slice 25).
5. **Queue cancel backend logic:** How to interrupt llama-cpp-python inference mid-run.
6. **Indonesian translation review:** CEO to review and adjust AI-drafted translations.

---

## 13. Parked Ideas (Not Blocking)

These are optional nice-to-haves for later. They block nothing:

1. **Copy-to-clipboard button** for the Markdown result — pairs naturally with Edit mode (Slice 23).
2. **Retry button** for timed-out jobs — if a job hits the 10-re-poll limit, let the user retry it.

---

## 14. Sprint 1 Reconciliation

Sprint 1 locked WebSockets (ADR-002) for real-time progress.
Phase 4 pivoted to HTTP Polling for MVP simplicity.

**Resolution:** Polling is the MVP transport. WebSockets are deferred to Phase 2/3.
The old Sprint 1 WebSocket code (`useProgressSocket`, backend WebSocket broadcasting) remains in the codebase but is not used by the new Phase 5 store. It will be cleaned up after the core Command Center UI is working.

---

## 15. Document References

| Document                | Path                                                            | Version |
| ----------------------- | --------------------------------------------------------------- | ------- |
| Product & Scope         | `second-brain/03-Sprints/01-product-and-scope.md`               | 1.3     |
| Functional Requirements | `second-brain/03-Sprints/02-functional-requirements.md`         | 1.3     |
| Architecture            | `second-brain/03-Sprints/03-non-functional-and-architecture.md` | 1.3     |
| Testing & Rules         | `second-brain/03-Sprints/04-testing-and-engineering-rules.md`   | 1.3     |
| Current State           | `second-brain/00-Current-State.md`                              | Latest  |
| Phase 5 Plan            | This document                                                   | 1.0     |
