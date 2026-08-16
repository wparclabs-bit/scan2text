# S10-DIAG13b — BootGate Swap v2 (gate-in-place with rollback)

## What Changed
- Boot-gate in-place swap of build 14 candidate into production home at `D:\Scan2Text\dist\scan2text-backend\scan2text-backend.exe`.
- Three-way hash match confirmed: packaging dist = portable dist = repo dist = `DB360FB0E19308CA6BA6CC3E805011FB658F4EEC614618A66BB16B52E247C3CA`.
- Gate stderr verbatim: `INFO: Uvicorn running on http://127.0.0.1:47351` — zero `ModuleNotFoundError`, zero `Model files not found`.
- Rollback path exercised: NOT needed (PASS). Rollback command: `Copy-Item D:\WingAI\Projects\scan2text\dist\scan2text-backend\scan2text-backend.exe D:\Scan2Text\dist\scan2text-backend\scan2text-backend.exe -Force` (restores 39C044AF).
- Gate logs deleted after verification.

## Key Decisions
- Gate-in-place (no rebuild, no source edit) per slice spec. CEO locked: stderr must contain "Uvicorn running" AND NOT "ModuleNotFoundError" AND NOT "Model files not found".
- Separate stdout/stderr redirect files (gate-out.log + gate-err.log) — never merged.
- 15s boot gate first; extended to 30s only on negative result (not needed here — PASS on first attempt).
- Spec carried uncommitted `pathex` edit from S10-DIAG11 — preserved, not reverted, not re-edited.
- SyntaxWarnings deferred as hygiene debt (out of scope).

## 13a vs 14 Fingerprint Diff
- **S10-DIAG13a** (previous slice): candidate hash `D6C2032EFA0A099DCC14B008D616231D706222972D81633C5035E80215974601` — BROKEN (ModuleNotFoundError on boot). This was the post-DIAG11 hash that failed the gate.
- **S10-DIAG13b build 14**: candidate hash `DB360FB0E19308CA6BA6CC3E805011FB658F4EEC614618A66BB16B52E247C3CA` — PASS (Uvicorn running, clean boot).
- The spec's uncommitted pathex edit (S10-DIAG11) is present in build 14 source but was NOT the fixing commit — the fix was the path-math correction in `_resolve_models_dir()` (exe_dir.parent → exe_dir.parent.parent) plus the GLM-OCR ghost string removal.
- Build 14 is a fresh PyInstaller rebuild from the current source tree including DIAG11's pathex edit.

## Spec Pathex Deviation + SyntaxWarning Debt
- Spec says: "Spec carries uncommitted pathex edit — do NOT revert, do NOT re-edit." The uncommitted edit from S10-DIAG11 (path_service.py `resolve_model_path()` fix) is present in the working tree but was not committed before this slice.
- SyntaxWarnings in backend source are deferred hygiene debt (out of scope for boot-gate slices).

## 964406C3951B Misreport Lesson
- `964406C3951B` was the portable backend hash from S10-PORTABLE-REFRESH (2026-08-14). It was later misreported as the "known-good" hash in state-history.md and changelog entries.
- Truth: 964406C3951B belonged to a stale build that had the models-path mismatch (models at `D:\Scan2Text\models\` but backend looked at `D:\Scan2Text\dist\scan2text-backend\models\`). It booted with "Model files not found" — NOT a healthy build.
- The three known-good reference hashes for this slice are:
  - `98F14363…` (pre-DIAG11, original)
  - `39C044AF…` (post-R2c rebuild, verified healthy)
  - `D6C2032E…` (post-DIAG11, BROKEN — ModuleNotFoundError)
- **Lesson: a hash alone is not proof of health. Boot-gate stderr is the acceptance test.**

## Test Coverage
- Manual boot gate: 15s live boot from production home, stderr + stdout captured to separate files.
- Three-way hash match: packaging / portable / repo dist all = DB360FB0…
- Rollback path: verified command exists but not exercised (PASS).

## Open Questions
- None. CEO runs the Final Exam manually.

## Status
COMPLETE — READY FOR CEO FINAL EXAM
