# 📄 SPRINT 2 - PHASE 4 SUMMARY: Scan2Text Frontend API Architecture

**Date:** 2026-08-05
**Phase:** Phase 4 — Frontend API Architecture
**Status:** COMPLETE
**Context Mode:** AI-Assisted Software Development with strict context management

---

## 🎯 Phase Goal & Outcome

**Goal:**
Create a stable, tested, framework-agnostic frontend API layer for the Scan2Text MVP, defining how the frontend communicates with the backend for file upload and task status.

**Outcome:**
Phase 4 delivered a pure TypeScript API layer with dependency-injected polling, strict type guards, and a stable backend contract. Phase 5 (UI and state integration) is now in progress, building the Command Center dashboard on top of this foundation.

---

## 🏛️ Key Architectural Decisions (Locked)

### From Phase 4
- **Pure TypeScript API Layer:** API logic isolated from React components.
- **Framework-Agnostic Design:** No React dependency in the API layer.
- **Polling as MVP Transport:** Task status checked via `GET /status/{task_id}`. WebSockets (ADR-002 from Sprint 1) are deferred. Polling is simpler and sufficient for MVP.
- **Dependency-Injected Polling:** `pollTaskStatus` accepts delay/deps for testability.
- **Strict Type Guards:** `isTaskCompleted` and `isTaskFailed` for safe TypeScript narrowing.
- **Stable Backend Contract:** `POST /process` and `GET /status/{task_id}`. No `/api/jobs` routes.

### From Phase 5 (Locked During Sprint 2)
- **Zustand for State Management:** Memory-only. No localStorage/sessionStorage.
- **react-markdown for Rendering:** OCR output rendered as formatted Markdown.
- **No React Router for MVP:** Single-page Command Center dashboard with state-based panel switching.
- **Dark Mode Default:** With toggle to light mode.
- **Desktop-Only for MVP:** Mobile/responsive deferred.
- **Command Center Layout:** 3-panel dashboard (Drop Zone / Queue / Live Preview) + bottom status bar.

### Model & Inference
- **VLM Model:** GLM-OCR 0.9B (`vlm.gguf` + `mmproj.gguf`)
- **Runner:** `llama-cpp-python`
- **CPU-Only:** GPU intentionally excluded for portability and simplicity.
- **PDF Handling:** Likely requires PDF-to-image conversion before VLM inference. UNVERIFIED.

---

## 📡 Phase 4 API Surface

uploadFile(file: File) → POST /process → { task_id } 
getTaskStatus(taskId: string) → GET /status/{task_id} 
isTaskCompleted(response) → type guard 
isTaskFailed(response) → type guard 
pollTaskStatus(taskId, opts, deps) → polling loop 
DEFAULT_POLL_OPTIONS → 15 attempts × 2000ms = 30 seconds 
defaultDelay → production setTimeout helper

---

## 🎨 Product UX Decision

If polling exceeds 30 seconds, show:
> "Still processing in the background. Large files can take a few minutes. Check the Queue for completion."

---

## ✅ Verification State

| Metric | Phase 4 End | Current (After Slice 17) |
|--------|-------------|--------------------------|
| Frontend tests | 21/21 (API layer only) | 95/95 (full frontend) |
| TypeScript typecheck | PASS | PASS |
| Backend contract | Stable | Stable |
| Current-state file | Updated | Updated |

Note: Test count grew from 21 to 95 as Phase 5 added store and component tests. Two old Sprint 1 tests were intentionally removed in Slice 17 (WebSocket/assignTaskId tests no longer relevant after polling migration).

---

## 🛠️ Phase 5 Progress (During Sprint 2)

| Slice | Feature | Status |
|-------|---------|--------|
| 13 | Frontend Baseline Verification | ✅ |
| 13.2 | DropZone Test Stabilization | ✅ |
| 14 | Memory-Only Zustand Store Skeleton | ✅ |
| 15 | Upload Action Wiring (startUpload) | ✅ |
| 16 | Polling Action Wiring (pollJob) | ✅ |
| 17 | DropZone UI Wiring to New Store | ✅ |
| 18 | Command Center Layout Skeleton | NEXT |

---

## 🚧 Friction Points & Resolutions

- **Context Restoration / Memory Loss:** Some earlier UI memory was lost during context restoration. Resolved by structured memory files and repo verification (Slice 13).
- **Polling vs WebSocket Direction:** Sprint 1 locked WebSockets (ADR-002). Phase 4 pivoted to polling. Resolved: polling is MVP transport, WebSockets deferred.
- **Test Count Discrepancy:** Phase 4 reported 21/21 tests. Actual repo had 56 tests with 2 failures. Resolved via Slice 13 verification and Slice 13.2 fix.
- **Vitest Hoisting Bug:** `vi.mock` hoisting caused mock mismatch in DropZone tests. Resolved using `vi.hoisted()`.

---

## 📍 Current State

- **Frontend API:** Complete, tested, pure TypeScript, framework-agnostic.
- **Backend Contract:** Stable around `/process` and `/status/{task_id}`.
- **State Management:** Zustand memory-only store with `startUpload` and `pollJob` actions.
- **UI:** DropZone wired to new store. Command Center layout pending.
- **Model:** GLM-OCR 0.9B chosen. Smoke test pending.
- **Phase 5:** In progress. Slice 18 next.

---

## ▶️ Next Phase: Phase 5 (Continued)

Phase 5 is UI and state integration with the Command Center layout.

**Remaining Slices:**
- Slice 18: Layout skeleton (3-panel grid + bottom bar + dark mode)
- Slice 19: Left Panel (DropZone)
- Slice 20: Center Panel (Queue table)
- Slice 21: Right Panel (Image left + Markdown right)
- Slice 22: Bottom Bar (worker status + RAM)
- Slice 23+: Edit mode, Save, Queue cancel

**Full Phase 5 plan:** See `second-brain/01-Agent-Memory/Phase-5/phase-5-command-center-plan.md`

---

## ✅ Sign-Off

**Phase 4 status:** COMPLETE
**Phase 5 status:** IN PROGRESS (Slice 17 complete, Slice 18 next)
**State management:** Zustand memory-only
**Model:** GLM-OCR 0.9B + mmproj.gguf, CPU-only
**UI Vision:** Command Center 3-panel dashboard