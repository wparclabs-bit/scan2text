# S11-FIX32 — Rebuild and Swap

## What Changed
No source code changes. Rebuilt both backend (PyInstaller) and Tauri shell from latest committed source, then swapped into portable `D:\Scan2Text\` and repo `packaging/dist/`.

- **Backend**: PyInstaller build via `scripts/build-backend.ps1` — exit 0. Fresh hash `A9C7BF5FAF56AA919F1AD7A55205481274A2BC882E5CB199E7C24BD18054F6AA`.
- **Shell**: Tauri build `npx tauri build --no-bundle` — exit 0. Fresh hash `61B4939FA51E6308860E2290EF0A347AF3C481E41708B1FD8BD8C19C10790428`.
- **Three-way hash match**: `D:\Scan2Text\dist\scan2text-backend\` = `D:\WingAI\Projects\scan2text\dist\scan2text-backend\` for backend; `D:\Scan2Text\Scan2Text.exe` = Tauri release build for shell.
- **Boot gate**: Launched `D:\Scan2Text\Scan2Text.exe` (PID 8812). Backend spawned (PIDs 6104/18684/28320). `GET /api/health` → status=ok, model=OvisOCR2 0.9B loaded=true, files_present=true. Zero ModuleNotFoundError, zero "Model files not found".

## Key Decisions
- Stopped running instances (PID 22468/16796/28320) before file swap to avoid locked-file errors.
- Used existing `scripts/build-backend.ps1` spec-based build (not the raw PyInstaller CLI) to maintain consistency with previous rebuild slices.

## Test Coverage
- Backend: 262 passed, 1 pre-existing failure (`test_health_contract`).
- Frontend: 633 passed, 0 failures.
- Typecheck: clean.
- Build: both exit 0.

## Open Questions
- None. Awaiting CEO manual re-smoke of packaged exe (OS file drops, full workflow).
