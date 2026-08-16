# S10-FIX20: FirstRun Gate + Health RAM

## What Changed
- **App.tsx**: Replaced `/api/download/status` check with `/api/health` check using `model.files_present`. Modal now shows ONLY when backend reports models missing (files_present=false). When models present, launch goes straight to main screen.
- **BottomStatusBar.tsx**: Added 10s poll of `/api/health` for RAM percentage. Displays real value instead of static "—".
- **i18n**: Updated `bottomBar.ramUsage` from `"RAM: —"` to `"RAM: {{percent}}"` in en.json + id.json + test-setup.ts (both locales).

## Key Decisions
- Frontend trigger changed from download/status (requires version.json + SHA256) to health/files_present (simple existence check via PathService). Root cause: download/status needs version.json which is absent on non-public GitHub; health correctly reports files exist on disk.
- BottomBar uses setInterval(10s) poll, not Zustand store — minimal wiring, no state leakage.
- Deleted unused `DownloadState` interface from App.tsx.

## Test Coverage
- App.test.tsx: 4 new tests (files_present=true → no modal/no start call; files_present=false → modal + start call; health cache-buster; feedback pending with health).
- BottomStatusBar.test.tsx: 1 new test (RAM value rendered, not dash).
- Frontend: 624 passed, 0 failures.
- Backend: 259 passed, 1 pre-existing failure (test_health_contract — unchanged).

## Open Questions
- None.
