# ADR-001: Optimistic UI for File Uploads

**Status:** Accepted
**Date:** 2026-08-05
**Context:** When a user drops or selects files in the Scan2Text frontend, the backend needs time to acknowledge the upload and begin processing. Without immediate feedback, the UI would appear frozen for 1–3 seconds per file, creating a poor user experience.

**Decision:** The frontend immediately creates temporary file cards in the Zustand store with `status: "queued"` the moment a file is selected. These cards show a placeholder progress bar. Once the backend confirms the job (via WebSocket or polling), the card is updated with the real `task_id` and actual progress. If the backend rejects the file, the status changes to `"failed"`.

**Consequences:**
- **Positive:** Users see instant feedback; the app feels responsive even on slow networks.
- **Positive:** The same store actions (`addOptimisticFile`, `updateFileStatus`) handle both success and failure paths, keeping the code simple.
- **Negative:** If the backend never responds (e.g., server crash), the optimistic card stays in `"queued"` indefinitely. A timeout or retry mechanism should be added in a future slice.
- **Negative:** The temporary card has no `real_job_id` until the backend confirms, so any action that depends on the job ID must wait.
