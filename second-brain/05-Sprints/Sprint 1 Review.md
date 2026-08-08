## 📄 SPRINT 1 REVIEW: Scan2Text MVP Foundation

**Date:** 2026-08-05  
**Duration:** 1 Day  
**Status:** SUCCESS

### 🎯 Sprint Goal & Outcome

**Goal:** Establish the end-to-end architecture for the Scan2Text MVP, moving from a pure backend OCR tool to a full-stack "Command Center" web application.  
**Outcome:** We successfully built a local-first, multi-file processing pipeline with real-time UI feedback, a robust memory system for AI agents, and a stable contract between frontend and backend.

### 🏛️ Key Architectural Decisions (Locked)

1. **Optimistic UI (ADR-001):** The frontend instantly renders a "Processing" card with a temporary ID the moment a file is dropped. _(Why: Makes the app feel snappy and premium)._
2. **WebSockets over Polling (ADR-002):** We use FastAPI WebSockets to push real-time progress updates. _(Why: Necessary for tracking multiple concurrent file uploads)._
3. **Platform-Agnostic Multipart Upload (ADR-003):** The frontend sends actual file bytes (`multipart/form-data`) instead of local file paths. _(Why: Browsers block local paths for security)._
4. **Smart Zustand Store:** State management handles both UI state and async actions (uploads). _(Why: Keeps React components "dumb" and simple)._
5. **Rich Markdown Rendering:** OCR results will be rendered as formatted text. _(Why: Better UX for non-technical users)._
6. **Persistent Uploads Storage:** Backend saves uploaded files to a local `uploads/` folder. _(Why: Crucial for debugging OCR failures)._

### 🛠️ Technical Milestones (Slices Completed)

- **Slice 8 (Previous):** Backend Queue & Quarantine (91+ tests).
- **Slice 9:** Frontend Scaffold (Vite + React + TS + Tailwind + shadcn). _Human executed to save context._
- **Slice 10:** Frontend Logic (Zustand store, WebSocket hook, DropZone) - 23 tests passing.
- **Slice 11:** Backend WebSockets & Task-Specific Status - 100 tests passing.
- **Slice 11.5:** Agent Memory System (`AGENTS.md`, ADRs, `Current-State.md`) created.
- **Slice 11.6:** Backend Multipart Upload implementation - 102 tests passing.

### 🚧 Friction Points & Resolutions

1. **Tailwind/shadcn CLI Context Bloat:** The `npx shadcn init` CLI kept failing due to Vite 6 config mismatches.
    - _Fix:_ We bypassed the CLI entirely and manually created the config files. This saved ~20k tokens of AI context window.
2. **API Contract Mismatch:** The frontend was generating `File` objects, but the backend originally expected JSON arrays of local file paths.
    - _Fix:_ Caught during CTO review. We pivoted the backend to accept `multipart/form-data` (Slice 11.6).
3. **Global vs. Task-Specific Status:** The original backend `GET /status` only returned a global state, making multi-file uploads impossible to track.
    - _Fix:_ Upgraded to `GET /status/{task_id}` and WebSocket broadcasting.

### 📍 Current State

- **Backend:** 102 passing tests. Accepts file uploads, assigns `task_id`, processes in background, broadcasts via WebSocket.
- **Frontend:** 23 passing tests. Has the UI components and state management ready, but is currently using mocked WebSockets. Not yet wired to the real backend.
- **Agent Memory:** Fully operational. Future AI prompts only need to read `AGENTS.md` and `00-Current-State.md`.