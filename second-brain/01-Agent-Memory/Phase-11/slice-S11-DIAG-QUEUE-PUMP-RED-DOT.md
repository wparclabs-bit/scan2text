# S11-DIAG-QUEUE-PUMP-RED-DOT — Forensics

**Date:** 2026-08-20  
**Phase:** 11 (WSOD Fix)  
**Status:** DIAG — Root cause isolated, fix pending  
**Baseline:** RC B94612C9 deployed at D:\Scan2Text\backend

---

## CEO Smoke Evidence

| # | Symptom |
|---|---------|
| (a) | Job shows glossy red dot + Retry button, yet backend completes and writes .md file |
| (b) | Pending jobs behind a red job stay grey (pending) indefinitely — queue stalls |
| (c) | Dropping NEW files makes stuck pendings process to green |
| (d) | 13-drop keeps 10 + skips 3 (by design, batch cap) — ignored |

---

## Task 1: What Starts the Next Pending Job — Full Map

| Caller | File:Line | Condition | Function Called |
|--------|-----------|-----------|-----------------|
| `setStatus` terminal branch | `frontend/src/stores/scan2text.store.ts:220` | `TERMINAL_STATUSES.includes(status)` | `startNextPendingJob()` |
| `removeJob` | `frontend/src/stores/scan2text.store.ts:256` | Always | `startNextPendingJob()` |
| `pollJob` initial completion | `frontend/src/stores/scan2text.store.ts:453` | `isTaskCompleted(response)` | `promoteNextPending()` |
| `pollJob` initial failure | `frontend/src/stores/scan2text.store.ts:477` | `isTaskFailed(response)` | `promoteNextPending()` |
| `pollJob` background completion | `frontend/src/stores/scan2text.store.ts:547` | `isTaskCompleted(statusResponse)` | `promoteNextPending()` |
| `pollJob` background failure | `frontend/src/stores/scan2text.store.ts:571` | `isTaskFailed(statusResponse)` | `promoteNextPending()` |
| `startUpload` catch | `frontend/src/stores/scan2text.store.ts:401` | Upload throws | `promoteNextPending()` |

**Two distinct promotion functions:**
- `startNextPendingJob()` (line 259): finds next non-terminal job, calls `startUpload()` — **re-uploads** the file
- `promoteNextPending()` (line 284): finds next `pending && taskId !== null` job, sets status→`processing`, calls `startPolling()` — **no re-upload**

---

## Task 2: Every Code Path That Sets status=failed

| Path | File:Line | Mechanism | Calls promotion? |
|------|-----------|-----------|------------------|
| Missing taskId (initial poll) | `store.ts:418` | Direct `set()` | **NO** |
| `startUpload` catch | `store.ts:397` | Direct `set()` | YES → `promoteNextPending()` (line 401) |
| Initial poll `isTaskFailed` | `store.ts:471` | Direct `set()` | YES → `promoteNextPending()` (line 477) |
| **Background health check failure** | **`store.ts:517`** | **Direct `set()`** | **NO** |
| Background loop `isTaskFailed` | `store.ts:565` | Direct `set()` | YES → `promoteNextPending()` (line 571) |
| `setStatus('failed')` (external) | `store.ts:201` | `setStatus()` wrapper | YES → `startNextPendingJob()` (line 220) |

**Critical gap:** Lines 418 and 517 use `set()` directly WITHOUT calling any promotion function. `activeJobId` is never cleared. The queue stalls.

---

## Task 3: Reconciliation Against Evidence

### Root Cause: Single Defect

**Defect:** The background health-check-failure path in `pollJob` (`store.ts:506-525`) uses a bare `set()` to mark the job `failed` and then `return`s — it never calls `startNextPendingJob()` or `promoteNextPending()`. `activeJobId` remains stuck on the failed job.

### Why (a) — False red despite backend completing:
The background loop calls `getHealth()` before each status poll. If the backend is temporarily unresponsive (e.g., CPU spike during OCR, GC pause, or transient network hiccup on the loopback), `getHealth()` throws. The catch at line 508 marks the job `failed` with `error: i18n.t('errors.backendLost')`. The backend subsequently completes and writes the .md, but the frontend has already rendered the glossy red dot.

### Why (b) — Pending jobs stay grey:
Because no promotion function is called, `activeJobId` stays pointing at the failed job. `startNextPendingJob()` is never invoked. The FIFO queue never advances. Pending jobs remain grey indefinitely.

### Why (c) — New drops unstuck the queue:
Dropping new files triggers `startUpload()` for the first new file. Since `activeJobId` points to a terminal (failed) job, `shouldActivate = true`. The new file activates, uploads, and begins polling. When the new file completes, the background completion path at line 547 calls `promoteNextPending()`. `promoteNextPending()` checks `activeJobId` (now the new completed job — terminal), then finds the next `pending && taskId !== null` job in `jobOrder` and promotes it. The stall is broken.

---

## Task 4: Backend ↔ Frontend Response Shape Cross-Check

### Backend `GET /status/{task_id}` (`src/scan2text/api/main.py:192-209`)
```python
result = {
    "task_id": task_id,
    "status": task["status"],        # "queued" | "processing" | "completed" | "failed"
    "processed": task["processed"],
    "total": task["total"],
}
if task.get("error_code"):
    result["error_code"] = task["error_code"]
if task["status"] == "completed" and task.get("result_markdown"):
    result["result_markdown"] = task["result_markdown"]
return result
```

**Key observations:**
- Backend uses `"queued"` not `"pending"` — frontend `isTaskCompleted`/`isTaskFailed` both return false for `"queued"`, falling through to "still processing" path. **Correct.**
- Backend NEVER returns an `error` field — only `error_code`. Frontend `response.error ?? 'Processing failed'` always falls back to the generic string. **UX gap, not a bug.**
- `result_markdown` is omitted when empty/None. `isTaskCompleted` checks `typeof response.result_markdown === 'string'` — if missing, returns false. Background loop also sees false. Job hangs in `processing`. **Potential secondary issue if backend returns completed with empty markdown.**

### Frontend `TaskStatusResponse` (`frontend/src/lib/api.ts:7-13`)
```typescript
interface TaskStatusResponse {
  task_id: string
  status: string
  result_markdown?: string
  error?: string          // ← never populated by backend
  error_code?: string
}
```

**Mismatch:** `error` field is declared but never populated by backend. Harmless (falls back to generic message).

### Backend batch-level failure (`src/scan2text/api/main.py:123-125`)
```python
if summary.failed > 0:
    task["status"] = "failed"
    task["error_code"] = "OCR_FAILED"
else:
    task["status"] = "completed"
```
If ANY file in a multi-file batch fails, the entire task is marked `failed`, even though successful files have .md output on disk. Frontend shows red for the whole batch. **Secondary issue contributing to evidence (a) if partial-batch failures occur.**

---

## Task 5: Root-Cause Statement + Minimal Fix Plan

### Root-Cause Statement

**One primary defect, one secondary contributor.**

**Primary defect (causes all three symptoms a/b/c):**  
`frontend/src/stores/scan2text.store.ts` lines 506–525 — the background health-check-failure catch block uses `set()` directly to mark the active job `failed` and then `return`s without calling `startNextPendingJob()` or `promoteNextPending()`. `activeJobId` is never cleared, so the queue pump never restarts. Pending jobs remain grey. Dropping new files unsticks the queue because the new file's activation replaces `activeJobId`, and its eventual completion triggers `promoteNextPending()`.

**Secondary contributor (explains some instances of evidence a):**  
`src/scan2text/api/main.py` lines 123–125 — batch-level `status: "failed"` when `summary.failed > 0`, even though successful files wrote .md output. Frontend correctly shows red, but CEO perceives "backend completed" because .md files exist on disk.

### Minimal Fix Plan

**Files to touch:**

1. **`frontend/src/stores/scan2text.store.ts`** (lines 506–525)  
   Replace bare `set()` + `return` with `setStatus('failed', ...)` followed by `startNextPendingJob()`, OR add explicit `get().promoteNextPending()` after the `set()`. Same fix needed at line 418 (missing taskId path).

2. **`frontend/src/locales/en.json`** + **`frontend/src/locales/id.json`**  
   Add missing `errors.backendLost` key (currently unresolved i18n key — renders as literal string `'errors.backendLost'`).

3. *(Secondary, out of scope for this slice)* **`src/scan2text/api/main.py`** (lines 123–125)  
   Change batch failure logic: set `status: "completed"` if `summary.succeeded > 0` even when `summary.failed > 0`, and include partial `result_markdown`. Or introduce a new `"partial"` status.

**Which test goes RED first:**  
`frontend/src/stores/scan2text.store.test.ts` — add a test in the `pollJob` describe block:

```typescript
it('should promote next pending job when background health check fails', async () => {
  // Arrange: job-1 active + processing, job-2 pending with taskId
  mockUploadFile.mockResolvedValue({ task_id: 'task-1' })
  await store.getState().startUpload({ file: file1, jobId: 'job-1' })
  mockUploadFile.mockResolvedValue({ task_id: 'task-2' })
  await store.getState().startUpload({ file: file2, jobId: 'job-2' })
  
  // Initial poll returns processing
  mockPollTaskStatus.mockResolvedValue({ task_id: 'task-1', status: 'processing' })
  // Start background poll
  store.getState().pollJob({ jobId: 'job-1' })
  
  // Health check fails on first background iteration
  mockGetHealth.mockRejectedValue(new Error('unreachable'))
  await vi.advanceTimersByTimeAsync(0)
  
  // Act + Assert: job-1 failed, job-2 promoted to processing
  expect(store.getState().jobs['job-1'].status).toBe('failed')
  expect(store.getState().jobs['job-2'].status).toBe('processing')
  expect(store.getState().activeJobId).toBe('job-2')
})
```

This test goes RED with current code (job-2 stays `pending`, `activeJobId` stays `job-1`) and goes GREEN after the fix.

---

## Verification

- `git status` shows ZERO edits to `frontend/src/` or `src/` (backend Python source)
- All claims cite `file:line` references above
- Fix plan touches only the identified files; no backend source edits required for primary fix

---

## Non-Goals (per slice prompt)

- No fixes applied
- No new tests written
- No backend edits
- No doc edits except this Obsidian summary + 00-Current-State.md update
