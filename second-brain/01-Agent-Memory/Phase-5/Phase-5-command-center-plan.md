# Phase 5 - Command Center UI Plan

Date: 2026-08-05
Phase: Phase 5 - UI and State Integration
Status: IN PROGRESS

## Product Vision

Scan2Text is a local-first, offline, portable OCR tool.
Users drop images/PDFs and get clean Markdown output.
The UI is a "Command Center" — a pro-grade local web dashboard.

The Vibe: Minimalist, dark-mode ready, high-contrast (like Linear or Vercel).
Target: Non-technical users. Desktop-first.

---

## Locked Architecture Decisions

### Backend
- Python FastAPI
- POST /process → upload file, returns { task_id }
- GET /status/{task_id} → get task status
- No /api/jobs routes yet
- uploads/ folder for persistent file storage
- llama-cpp-python for model inference
- GLM-OCR 0.9B model (vlm.gguf + mmproj.gguf)
- CPU-only inference (no GPU)
- PDF handling: likely needs PDF-to-image conversion before VLM (UNVERIFIED)

### Frontend
- Vite + React + TypeScript + Tailwind + shadcn
- Zustand for state management (memory-only, NO localStorage/sessionStorage)
- react-markdown for Markdown rendering
- NO React Router for MVP (single-page dashboard, state-based panel switching)
- Dark mode DEFAULT with toggle to light mode
- Desktop-only for MVP

### Polling vs WebSocket
- Sprint 1 locked WebSockets (ADR-002)
- Phase 4 pivoted to HTTP Polling for MVP simplicity
- RESOLUTION: Polling is the MVP transport. WebSockets deferred.
- DEFAULT_POLL_OPTIONS: 15 attempts x 2000ms = 30 seconds
- If polling exceeds 30s: show background processing message

---

## Command Center UI Layout

### Full Dashboard

┌─────────────────────────────────────────────────────────────────────────┐
│  📝 Scan2Text                                          [🌙/☀️ Toggle]   │
├────────────────────┬──────────────────────────┬─────────────────────────┤
│                    │                          │                         │
│   LEFT PANEL       │   CENTER PANEL           │   RIGHT PANEL           │
│   (Drop Zone)      │   (The Queue)            │   (Live Preview)        │
│   Width: 20%       │   Width: 35%             │   Width: 45%            │
│                    │                          │                         │
│  ┌──────────────┐  │  ┌────────────────────┐  │  ┌─────────┬─────────┐  │
│  │              │  │  │ File   │ Status    │  │  │         │         │  │
│  │   ✨ DROP    │  │  ├────────┼───────────┤  │  │ Original│ Rendered│  │
│  │   FILES      │  │  │ report │ ⏳ OCR    │  │  │ Image   │ Markdown│  │
│  │   HERE       │  │  │ notes  │ ✅ Done   │  │  │         │         │  │
│  │              │  │  │ scan   │ ❌ Fail   │  │  │ (left)  │ (right) │  │
│  │              │  │  │ invoice│ ⏳ Pend   │  │  │         │         │  │
│  │              │  │  ├────────┼───────────┤  │  │         │         │  │
│  │              │  │  │ ▓▓▓░░  │ 67%      │  │  │         │         │  │
│  └──────────────┘  │  └────────────────────┘  │  └─────────┴─────────┘  │
│                    │                          │                         │
├────────────────────┴──────────────────────────┴─────────────────────────┤
│  BOTTOM BAR: Worker: 🟢 Busy │ RAM: 4.2GB │ GPU: N/A (CPU) │ v0.1     │
└─────────────────────────────────────────────────────────────────────────┘

### Right Panel — Completed Job (Side-by-Side)

When user clicks a completed job (or auto-select triggers):

┌─────────────────────────────────────────────────┐
│  📄 notes.png                    ✅ Completed    │
├────────────────────────┬────────────────────────┤
│                        │                        │
│                        │  # Meeting Notes       │
│   [Original Image]     │                        │
│                        │  ## Attendees          │
│   scan_001.png         │  - John                │
│                        │  - Sarah               │
│                        │                        │
│                        │  ## Action Items       │
│                        │  1. Follow up budget   │
│                        │  2. Schedule meeting   │
│                        │                        │
└────────────────────────┴────────────────────────┘

Image on LEFT. Markdown on RIGHT. Side-by-side for easy comparison.

### Right Panel — Non-Completed Jobs

| Job Status    | Right Panel Shows                          |
|---------------|--------------------------------------------|
| Pending       | "Waiting to start..."                      |
| Processing    | Spinner + "Extracting text..."             |
| Failed        | Error message in red                       |
| Background    | 30s timeout message + "Check the Queue"    |
| Completed     | Image (left) + Rendered Markdown (right)   |

### Queue Status States

│ report.pdf   │ ⏳ Pending...     │ ░░░░░░░░░░ │
│ notes.png    │ 🔍 OCR Running   │ ▓▓▓▓▓░░░░░ │
│ scan.jpg     │ ✅ Done          │ ▓▓▓▓▓▓▓▓▓▓ │ [View] [✕]
│ invoice.pdf  │ ❌ Failed        │ ░░░░░░░░░░ │ [✕]
│ large.pdf    │ 🔄 Background    │ ▓▓░░░░░░░░ │ [Cancel]

### Queue Actions
- Completed/Failed jobs: [✕] Remove button
- In-progress jobs: [Cancel] button (requires backend cancel endpoint)

### Auto-Select Behavior
- When a job completes OCR, the right panel AUTOMATICALLY switches to show its result.
- The completed job is highlighted in the queue.
- User can still click other jobs to view them.

### Background Processing Message (30s timeout)
"Still processing in the background. Large files can take a few minutes.
Check the Queue for completion."

---

## Store Changes Needed for Phase 5

### ScanJob Interface Updates
- Add imageUrl: string | null (object URL from File, for right panel image display)
- Add selectedJobId: string | null (tracks which job is shown in right panel)

### New Store Actions Needed
- selectJob(jobId) — set the selected job for right panel display
- cancelJob(jobId) — cancel an in-progress job (calls backend cancel endpoint)
- removeJob(jobId) — remove a completed/failed job from the queue

### Auto-Select Logic
- In pollJob: when status becomes "completed", auto-set selectedJobId to that job

---

## Backend Changes Needed

### New Endpoints
- GET /health or GET /worker-status → returns worker state (idle/busy), RAM usage
- POST /cancel/{task_id} → cancels an in-progress OCR task

### Image Serving
- Frontend will use object URLs (URL.createObjectURL(file)) stored in Zustand
- No backend image-serving endpoint needed for MVP
- Image URLs are memory-only (lost on page refresh) — acceptable for MVP

---

## Slice Plan

| Slice | Feature                                    | Status      |
|-------|--------------------------------------------|-------------|
| 13    | Frontend Baseline Verification             | ✅ COMPLETE |
| 13.2  | DropZone Test Stabilization                | ✅ COMPLETE |
| 14    | Memory-Only Zustand Store Skeleton         | ✅ COMPLETE |
| 15    | Upload Action Wiring (startUpload)         | ✅ COMPLETE |
| 16    | Polling Action Wiring (pollJob)            | ✅ COMPLETE |
| 17    | DropZone UI Wiring to New Store            | ✅ COMPLETE |
| 18    | Layout skeleton: 3-panel grid + bottom bar + dark mode + toggle | PENDING |
| 19    | Left Panel: Wire DropZone into left panel  | PENDING     |
| 20    | Center Panel: Queue table with live status | PENDING     |
| 21    | Right Panel: Image (left) + Markdown (right) with react-markdown | PENDING |
| 22    | Bottom Bar: Backend worker/RAM endpoint + frontend display | PENDING |
| 23    | Edit mode for Markdown                     | FUTURE      |
| 24    | Save edits to backend                      | FUTURE      |
| 25    | Queue cancel (backend cancel endpoint)     | FUTURE      |

---

## Open Items / Unverified

1. PDF-to-image conversion: VLM likely needs rendered pixels, not raw PDF bytes.
   Must verify before PDF support is considered working.
2. VLM smoke test: GLM-OCR + mmproj.gguf via llama-cpp-python not yet tested.
3. Worker status endpoint: GET /health needs to be built.
4. Cancel endpoint: POST /cancel/{task_id} needs to be built.
5. Queue cancel backend logic: How to interrupt llama-cpp-python inference mid-run.

---

## Test Count History

| After Slice | Test Count | Notes                          |
|-------------|------------|--------------------------------|
| Slice 13    | 56 total   | 54 pass, 2 fail (pre-existing)|
| Slice 13.2  | 56/56      | Fixed Vitest hoisting bug      |
| Slice 14    | 74/74      | Added store skeleton tests     |
| Slice 15    | 85/85      | Added startUpload tests        |
| Slice 16    | 97/97      | Added pollJob tests            |
| Slice 17    | 95/95      | Removed 2 old Sprint 1 tests   |

Current baseline: 95/95 passing.