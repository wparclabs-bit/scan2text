# Slice 12a Summary — Upload API Client Function

## What Changed

- Created `frontend/src/lib/api.ts` with a pure async `uploadFile(file: File): Promise<{ task_id: string }>` function.
- Creates `FormData`, appends the single file under the key `'file'`, POSTs to `/process` via `fetch`.
- Throws a typed `Error` with message `Upload failed: {status} {statusText}` on any non-2xx response.
- Created `frontend/src/lib/api.test.ts` with 4 tests covering success, 4xx, 5xx, and multipart body shape.

## Key Decisions

- **Single-file function** (`uploadFile`) vs. existing multi-file service (`uploadFiles` in `services/uploadService.ts`). The slice scope explicitly requested a single-file signature; the existing service is left untouched.
- **Location**: `src/lib/api.ts` per slice spec, keeping it separate from React components, Zustand stores, and WebSocket logic.
- **Error shape**: Plain `Error` with status + statusText in the message — sufficient for downstream catch handlers in the store layer.

## Test Coverage

| Test | Status |
|------|--------|
| Returns task_id from successful POST | ✅ |
| Throws on 4xx response | ✅ |
| Throws on 5xx response | ✅ |
| POSTs multipart/form-data with correct key | ✅ |

All 4 tests pass. Typecheck passes.

## Open Questions

- Should the frontend eventually switch to using this `api.ts` client instead of the existing `uploadService.ts`, or keep both? (Out of scope for this slice.)
- Should the API base URL be configurable via env vars for staging/prod? (Deferred to integration phase.)
