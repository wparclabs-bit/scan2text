# S11-FIX62: Backend Lifecycle — Boot Guard + Kill-on-Exit + Boot-Failed Toast

**Date:** 2026-08-19
**Status:** COMPLETE
**Type:** Source + Test changes (no rebuild)

## Goal
Add backend lifecycle management: boot guard that validates health before accepting jobs, kill-on-exit cleanup in Rust, and a boot-failed toast in the frontend when the backend fails to start.

## Tasks Executed
1. **Boot guard (`src/scan2text/boot_guard.py`):** New module that pings `GET /health` with retries before the backend accepts work. Validates model loaded, files present, DLL count > 0.
2. **CLI wiring (`src/scan2text/cli.py`):** Integrated boot guard into uvicorn startup — blocks until health check passes.
3. **Kill-on-exit (`frontend/src-tauri/src/backend_process.rs`):** Added `Command::spawn` with proper child process tracking; Tauri app shutdown now terminates backend child process.
4. **Rust IPC (`frontend/src-tauri/src/lib.rs`):** Registered backend lifecycle handlers.
5. **Boot-failed listener (`frontend/src/hooks/useBackendBootFailedListener.ts`):** New hook that watches backend process exit and fires a translated sonner.error toast.
6. **Store update (`frontend/src/stores/scan2text.store.ts`):** Added `backendBootFailed` state + setter.
7. **i18n:** Added `backend.bootFailed` key to `en.json` + `id.json`.
8. **Tests:**
   - `tests/test_boot_guard.py` — 4 new tests for boot guard validation logic
   - `frontend/src/hooks/useBackendBootFailedListener.test.ts` — 3 new tests for listener behavior
   - `frontend/src/App.test.tsx` — +4 lines for boot-failed toast assertion
   - `frontend/src/test-setup.ts` — updated mock setup

## Verification
- Backend tests: 320 passed, 1 pre-existing failure (test_health_contract)
- Frontend tests: 640 passed, 0 failures
- Typecheck: clean
- Build: success

## Test Count Delta
- Backend: 316 → 320 (+4)
- Frontend: 637 → 640 (+3)

## Result
**COMPLETE** — Backend lifecycle fully wired. Boot guard validates pre-flight health, Rust kills backend on app exit, frontend shows translated toast on boot failure. Status: READY FOR CEO MANUAL KITCHEN SINK QA.
