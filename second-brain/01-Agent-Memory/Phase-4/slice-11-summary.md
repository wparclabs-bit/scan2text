# Slice 11 Summary: Backend WebSockets & Task-Specific Status

## What Was Built

Added real-time progress tracking to the Scan2Text OCR backend so the frontend can monitor multiple concurrent file-processing jobs individually instead of relying on a single global status.

### New Files
- `src/scan2text/api/websocket_manager.py` — A simple in-memory `ConnectionManager` class that tracks active WebSocket connections and broadcasts JSON messages to all connected clients. It automatically cleans up dead connections when sends fail.

### Changed Files
- `src/scan2text/api/main.py` — Upgraded the FastAPI bridge with three key changes:
  1. **Task-specific status endpoint**: `GET /status/{task_id}` replaces the old global `GET /status`. Returns `{ task_id, status, processed, total }` and includes `result_markdown` when the task is completed. Returns 404 for unknown task IDs.
  2. **WebSocket progress endpoint**: `WS /ws/progress` accepts connections, registers them with the `ConnectionManager`, and keeps them alive. Supports a `ping`/`pong` keepalive.
  3. **Background processing**: `POST /process` now returns immediately with a `task_id` and runs the actual OCR work in a background `asyncio.create_task`. The background coroutine broadcasts `"processing"` and `"completed"` (or `"failed"`) messages via WebSocket as it progresses.

- `tests/test_api.py` — Updated existing tests for the new `/status/{task_id}` contract and added new tests for the WebSocket endpoint and task store behavior.

## Why We Moved from Global Status to Task-Specific WebSockets

The old `GET /status` endpoint returned a single global object (`{ status, processed, total }`) that only made sense when one batch was running at a time. With multiple concurrent file uploads, the frontend had no way to:
- Track individual job progress
- Know which task a status update belonged to
- Receive real-time updates without polling

The new design solves this by:
1. Assigning each `POST /process` call a unique `task_id`
2. Storing per-task state in an in-memory `_task_store` dict
3. Broadcasting task-scoped JSON messages over WebSocket so the frontend can listen once and filter by `task_id`
4. Allowing HTTP polling via `GET /status/{task_id}` as a fallback

## Exact New API Contract

### POST /process
**Request:**
```json
{ "file_paths": ["/path/to/doc1.png", "/path/to/doc2.pdf"] }
```
**Response (202):**
```json
{ "task_id": "uuid-string" }
```

### GET /status/{task_id}
**Response (200) — while processing:**
```json
{ "task_id": "...", "status": "processing", "processed": 3, "total": 5 }
```
**Response (200) — completed:**
```json
{ "task_id": "...", "status": "completed", "processed": 5, "total": 5, "result_markdown": "# OCR text..." }
```
**Response (404) — unknown task:**
```json
{ "detail": "Task not found" }
```

### WS /ws/progress
Client connects and receives JSON broadcast messages:
```json
{ "task_id": "...", "status": "processing", "processed": 0, "total": 5 }
{ "task_id": "...", "status": "completed", "processed": 5, "total": 5 }
```
Client can send `"ping"` to receive `"pong"`.

## Commands Run and Output Status

```
$ python -m pytest -q
........................................................................ [ 72%]
............................                                             [100%]
100 passed, 1 warning in 0.91s
```

Baseline was 96 tests; Slice 11 added 4 new passing tests (task-specific status x4, WebSocket x1). All 100 tests pass.

## Deviations

- **No per-file progress granularity**: The `QueueService.process_image_paths()` method processes files sequentially but doesn't expose per-file callbacks. The WebSocket broadcasts a single `"processing"` message at start and `"completed"` at finish. Per-file progress would require refactoring the worker to accept a progress callback — deferred to a future slice.
- **In-memory task store**: `_task_store` is process-local and resets on restart. For production multi-instance deployments, this would need to be replaced with a persistent store (Redis, database). Noted as a known limitation.
- **WebSocket cleanup on client disconnect**: The `ConnectionManager` removes dead connections during broadcast, but stale connections from crashed clients are only cleaned up on the next broadcast attempt. Acceptable for the current single-user desktop app.
