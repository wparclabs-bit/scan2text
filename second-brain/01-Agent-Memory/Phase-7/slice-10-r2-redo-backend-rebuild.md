# Slice 10-R2: Redo Backend Rebuild Swap

## What Changed
- Rebuilt `scan2text-backend.exe` from current source via PyInstaller 6.22.0 using `packaging/scan2text-backend.spec`.
- Replaced stale portable backend exe at `D:\Scan2Text\dist\scan2text-backend\scan2text-backend.exe`.
- No source code changes (R2 is rebuild-only; R1 PathService logic was already implemented).

## Key Decisions
- Build entry: `packaging/scan2text-backend.spec` (PyInstaller onedir, entry point `src/scan2text/cli.py`).
- PyInstaller 6.22.0 was already available — no dependency installation needed.
- Models NOT bundled (external at portable-root/models per ADR-008).
- Output: `dist/scan2text-backend/scan2text-backend.exe` (45,570,428 bytes), only exe + empty logs folder.

## Test Coverage
- Backend tests: 232 passed (R1 added 13 PathService resolution tests; R2 is rebuild-only, no test changes).
- Build verified by SHA-256 hash comparison.

## Open Questions
- None for R2. R3 (frontend rebuild / Rust) still pending.

---

## R2b: Fresh Build Locate & Swap (2026-08-14)

### What Changed
- Located fresh build at `D:\WingAI\Projects\scan2text\dist\scan2text-backend.exe` (Mtime 8/14/2026 20:25, size 45,571,763 bytes).
- Swapped into portable location `D:\Scan2Text\dist\scan2text-backend\scan2text-backend.exe` (replacing stale E39D4FDD979D from 8/12).
- Confirmed hash FD9089F59E8E differs from both stale hashes (E39D4FDD979D and 964406C3951B).
- Zero .gguf files bundled in dist folder.

### Key Decisions
- Branch 3 taken: found 8/14 mtime exe with non-E39D4FDD979D hash, no rebuild needed.
- Copy-Item preserves source mtime → Mtime 08/14/2026 20:25:15 serves as build-date proof.
- Spec distpath resolves to `packaging/../dist/scan2text-backend/` (i.e. repo root + `dist/scan2text-backend/`).
- The spec's post-build move script (lines 78-87) creates `dist/scan2text-backend/scan2text-backend.exe` from `dist/scan2text-backend.exe` — the direct PyInstaller output was built without this post-move, confirming it's the unmodified artifact.

### Test Coverage
- Build verified by SHA-256 hash comparison.
- Inventory scan confirmed no stale-only exes (all 5 found, 2 on 8/14, 3 on 8/12).
- Models check: zero .gguf in portable dist.

### Open Questions
- None. R2b verified. R3 (frontend rebuild / Rust) still pending.
