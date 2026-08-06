# Slice 10 Summary: Frontend Logic & Optimistic UI

## What Was Built

This slice implemented the core frontend logic for Scan2Text's file upload experience using Test-Driven Development (TDD). Three main pieces were created:

### 1. Zustand Store (`src/stores/fileStore.ts`)
A state management store that tracks uploaded files with optimistic updates. Each file has:
- `id` — temporary UUID generated on drop
- `name` — original filename
- `status` — one of: `queued`, `processing`, `completed`, `failed`
- `progress` — integer 0–100 for the progress bar
- `real_job_id` — null initially, populated when backend confirms the job

Three actions:
- `addOptimisticFile(fileName)` — instantly adds a file card with `queued` status
- `updateFileStatus(id, status, real_job_id?)` — changes status and optionally sets the backend job ID
- `updateFileProgress(id, progress)` — updates the progress bar (clamped 0–100)

### 2. WebSocket Hook (`src/hooks/useProgressSocket.ts`)
A React hook that connects to `ws://127.0.0.1:8000/ws/progress` and listens for real-time updates. When it receives JSON messages like `{ job_id, progress }` or `{ job_id, status }`, it dispatches the corresponding Zustand action to update the UI immediately. The connection is cleaned up on unmount.

### 3. DropZone Component (`src/components/DropZone.tsx`)
A shadcn/ui Card-based component that:
- Renders a file input button ("Choose File")
- Shows a list of all files from the store with their name, status, progress bar, and optional job ID
- Calls `addOptimisticFile` immediately when a file is selected (optimistic UI)

### 4. App Wiring (`src/App.tsx`)
The main app now renders the DropZone, initializes the WebSocket hook, and shows a connection status indicator (green dot = Connected, red dot = Disconnected).

## Why Optimistic UI Was Chosen

When a user drops a file, we show the card **instantly** — before the backend even knows about it. This gives the user immediate feedback that their action was received. The WebSocket later updates the card's progress as the backend processes the file.

**Error handling approach:** If the backend rejects a file or the WebSocket disconnects, the status can be updated to `failed` via the same `updateFileStatus` action. The UI already handles the `failed` state visually through the progress bar and status text. In production, you would add retry logic and toast notifications for failed uploads.

## Test Results

All tests pass using TDD (tests written first, then implementation):

| Test File | Tests | Status |
|-----------|-------|--------|
| `src/stores/fileStore.test.ts` | 11 | PASS |
| `src/hooks/useProgressSocket.test.ts` | 5 | PASS |
| `src/components/DropZone.test.tsx` | 7 | PASS |
| **Total** | **23** | **ALL PASS** |

### Verify Commands
```
npm run test      → 23 passed (2.32s)
npm run typecheck → clean (no errors)
npm run build     → built in 644ms
```

## Files Created/Modified

| File | Action |
|------|--------|
| `src/stores/fileStore.ts` | Created — Zustand store |
| `src/stores/fileStore.test.ts` | Created — 11 tests |
| `src/hooks/useProgressSocket.ts` | Created — WebSocket hook |
| `src/hooks/useProgressSocket.test.ts` | Created — 5 tests |
| `src/components/DropZone.tsx` | Created — UI component |
| `src/components/DropZone.test.tsx` | Created — 7 tests |
| `src/App.tsx` | Modified — wired DropZone + WebSocket |
| `src/test-setup.ts` | Created — Vitest setup with jest-dom |
| `vite.test.config.ts` | Created — Vitest-specific Vite config |
| `tailwind.config.js` | Modified — added shadcn/ui theme tokens |
| `src/index.css` | Modified — added CSS variables for shadcn/ui |
| `tsconfig.app.json` | Modified — added path alias for `@/*` |
| `package.json` | Modified — added test/typecheck scripts |
| `src/components/ui/*.tsx` | Copied — shadcn/ui components from `@/` |

## Deviations from Plan

1. **shadcn/ui location**: The CLI installed components to `@/components/ui/` (root-level `@` folder) instead of `src/components/ui/`. Copied them into `src/components/ui/` so the `@/` path alias resolves correctly.
2. **WebSocket mock complexity**: Mocking WebSocket in React Testing Library required a class-based mock that tracks instances, since `useEffect` creates the connection asynchronously. Used `waitFor` in tests to ensure the effect commits before sending messages.
3. **Vitest config separation**: Created `vite.test.config.ts` instead of modifying the main config, to keep production and test builds isolated.
