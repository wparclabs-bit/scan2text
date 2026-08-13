# Slice 9.4b-3: api.ts + uploadService.ts Wiring

## What Changed
- Deleted `const API_BASE = 'http://127.0.0.1:8000'` from `src/lib/api.ts` and `src/services/uploadService.ts`.
- Added `import { buildApiUrl } from './apiBase'` (api.ts) and `import { buildApiUrl } from '@/lib/apiBase'` (uploadService.ts).
- Wired all fetch calls through `buildApiUrl()`:
  - `api.ts`: `uploadFile` → `buildApiUrl('/process')`; `getTaskStatus` → `buildApiUrl(\`/status/${encodeURIComponent(taskId)}\`)`
  - `uploadService.ts`: `uploadFiles` → `buildApiUrl('/process')`

## Key Decisions
- Dev mode: `buildApiUrl` returns `''` (empty string), so fetch uses relative URLs — Vite proxy handles routing.
- Prod mode: `buildApiUrl` returns `http://127.0.0.1:47351`, so fetch calls the backend directly (ADR-008).
- No dependencies added; no changes to buildApiUrl itself.

## Test Coverage
- 5 RED tests turned GREEN:
  - `api.test.ts`: `should POST multipart/form-data to /process` (dev), `should POST to buildApiUrl(/process) in prod mode`, `should call buildApiUrl(/status/{taskId}) in prod mode`
  - `uploadService.test.ts`: `should send POST to /process with multipart/form-data`, `uses buildApiUrl in prod mode`
- Full suite: 606 passed, 0 failures.
- Typecheck: 0 errors. Build: success.

## Open Questions
- S9.4b-4 (App.tsx) is the final wiring slice in this sequence.
