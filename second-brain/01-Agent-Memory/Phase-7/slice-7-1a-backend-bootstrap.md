# Slice 7.1a — Backend Bootstrap + Real GET /health

## What Changed
- Created `backend/` directory with FastAPI skeleton.
- Added Pydantic contracts (`models/contracts.py`): `RamTelemetry`, `ModelTelemetry`, `HealthResponse`.
- Implemented real telemetry service (`services/telemetry.py`) using `psutil` for RAM stats and filesystem checks for model files.
- Added `GET /health` route (`routes/health.py`) returning live system telemetry.
- Configured CORS for localhost:5173 in `app/main.py`.
- Added `.gitignore` entries for Python artifacts and `samples/`.
- Updated AGENTS.md phase range to include Phase-7 and appended Phase 7 Lessons.

## Key Decisions
- Backend binds only to `127.0.0.1` (localhost-first, local-first principle).
- Model file detection checks for both `vlm.gguf` and `mmproj.gguf` in `models/`; reports presence without loading.
- Worker state defaults to `"idle"`; future slices will flip to `"busy"` during OCR jobs.
- Used `py -3.12` venv to lock interpreter version (system Python may be too new for native wheels).
- No model loaded, no llama-cpp-python installed — pure telemetry stub.

## Test Coverage
- `test_health_ok`: status code 200, status `"ok"`, worker in `("idle","busy")`, version present.
- `test_health_ram_sane`: total_mb > 0, percent in [0, 100].
- `test_health_model_files_detected`: loaded is False, name is `"GLM-OCR 0.9B"`, files_present reflects actual filesystem.
- All 3 tests pass.

## Open Questions
- None for this slice. Next: POST /process endpoint (slice 7.1b+).
