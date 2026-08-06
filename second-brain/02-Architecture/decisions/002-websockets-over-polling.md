# ADR-002: WebSockets Over HTTP Polling for Progress Updates

**Status:** Accepted
**Date:** 2026-08-05
**Context:** The Scan2Text backend processes files asynchronously and needs to notify the frontend of progress. Two approaches were considered: (1) HTTP polling — the frontend repeatedly asks "are you done yet?" and (2) WebSockets — the backend pushes updates to the frontend as they happen. Multiple concurrent file uploads make this choice critical.

**Decision:** Use WebSocket broadcasts (`WS /ws/progress`) for task progress updates instead of HTTP polling. Each connected client receives JSON messages scoped to a specific `task_id`, allowing the frontend to listen once and filter updates by task. An in-memory `ConnectionManager` tracks active connections and broadcasts messages to all clients.

**Consequences:**
- **Positive:** Real-time updates with zero polling overhead; the frontend reacts instantly when the backend finishes a file.
- **Positive:** Multiple concurrent tasks are handled naturally — each message carries its `task_id` so the frontend can route updates to the correct card.
- **Negative:** WebSocket connections require a persistent TCP connection. If the network drops, the client must reconnect and re-subscribe.
- **Negative:** The current `ConnectionManager` is in-memory and process-local. For multi-instance deployments, a pub/sub system (Redis, etc.) would be needed.
- **Mitigation:** `GET /status/{task_id}` remains available as an HTTP fallback for clients that cannot maintain a WebSocket connection.
