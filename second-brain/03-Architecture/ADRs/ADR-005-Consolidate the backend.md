**ADR-005: Consolidate the backend on `src/scan2text` and reconcile architectural drift** **Status:** Accepted (CEO approved 2026-08-08) · **Date:** 2026-08-08 · **Deciders:** CEO, CTO

**Context.** Forensics revealed a mature backend already exists at `src/scan2text` (102 passing tests) that was never wired to the frontend. Slice 7.1a, believing no backend existed, created a duplicate at `backend/`. The existing backend carries drift: two unintegrated FastAPI apps (`engine.py` launcher vs `api/main.py` OCR pipeline), two OCR adapter patterns, model-name drift (`ovisocr2-q8.gguf` vs the real `vlm.gguf`+`mmproj.gguf`), a `/api/health` that returns the wrong fields, a VLM adapter missing the mmproj vision wiring, several `engine.py` runtime bugs, a broken `build-backend`, and a scratch UI. Privacy remediation is done: uploads/ untracked + gitignored, then purged from all git history via git-filter-repo on 2026-08-08 (repo has no remote; never pushed).

**Decision.**

1. Backend source of truth = `src/scan2text`. Retire `backend/` from 7.1a (port its psutil RAM telemetry into the canonical health route).
2. **One FastAPI app**: merge launcher + OCR pipeline + routes into a single app exposing `POST /process`, `GET /status/{task_id}`, `GET /api/health`, `GET/PUT /api/settings`. Remove legacy `/api/jobs` and the scratch `ui/static` UI.
3. **One OCR adapter** behind `OCREngine`. Real engine = LlamaCPP loading `vlm.gguf`+`mmproj.gguf` with proper vision wiring; FakeOCR stays for tests.
4. Model files canonical: `models/vlm.gguf` + `models/mmproj.gguf`; fix all `ovisocr2-q8.gguf` references.
5. `GET /api/health` is canonical (update PRD §14 from `/health` → `/api/health`). It returns worker idle/busy, RAM, and model-loaded state.
6. Bind `127.0.0.1` only (NFR-02). No `0.0.0.0`.
7. HTTP polling primary (ADR-002 stands); WebSocket stays dormant/removed.
8. Fix `pyproject.toml` build-backend to `setuptools.build_meta`.
9. Interpreter locked to Python 3.12 via `py -3.12` + `backend/.venv`.

**Consequences.** A reconciliation slice (or small series) is required. PRD §13 updated to the `src/scan2text` layout; PRD §14 health path updated. Frontend BottomBar wiring calls `/api/health`. The 102 backend tests stay green through reconciliation. Scrub `uploads/` from history before first push.

**Alternatives considered.** (A) Build fresh at `backend/` — rejected (duplicates a mature tested backend). (B) Migrate `src/`→`backend/app/` to match PRD — rejected (high churn for a folder preference; update the PRD instead). (C) Keep two apps — rejected (fragments routing and lifecycle).

**Open questions (resolve during reconciliation).** Exact merged module layout; delete vs dormant WebSocket; disposition of scratch `ui/static`; `AppSettings.model_path` vs the PRD settings contract.