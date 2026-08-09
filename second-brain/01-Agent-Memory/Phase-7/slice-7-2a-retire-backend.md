# Slice 7.2a — Retire backend/ Duplicate + Fix build-backend

## What Changed
- Deleted duplicate `backend/` directory (created by 7.1a) via `git rm -r`.
- Fixed `pyproject.toml` build-backend from `setuptools.backends._legacy:_Backend` to `setuptools.build_meta`.
- Installed missing venv deps (`python-multipart`, `requests`) that were absent from the pre-existing `backend/.venv`.

## Key Decisions
- ADR-005 Decision 1 executed: `src/scan2text` is now the sole backend source of truth; `backend/` skeleton retired.
- `build-backend` corrected to standard `setuptools.build_meta` per ADR-005 item 8.
- Venv dependency gap was a pre-existing issue (venv created before all deps were pinned); fixed inline so baseline stays green.

## Test Coverage
- Root pytest: **102 passed, 1 warning** (baseline preserved).
- No frontend tests touched (doc-only scope for this slice's changes).

## Open Questions
- `backend/.venv` is now orphaned (backend/ deleted from git but venv dir remains on disk, gitignored). It can be cleaned up in a future slice when src/scan2text gets its own venv.
- Reconciliation of src/scan2text module layout vs the retired backend/ structure is deferred to the next reconciliation slice.
