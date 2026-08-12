# Slice S9.2a — Standalone Backend Artifact via PyInstaller

**Date:** 2026-08-12  
**Phase:** Phase 7  
**Type:** Code + build artifact (doc-only boundary respected for dev scripts)

## What Changed

### New Files
- `src/scan2text/utils/prod_runtime.py` — Production runtime helper:
  - `is_frozen()` → detects PyInstaller frozen mode
  - `frozen_exe_dir()` → returns `Path(sys.executable).parent` when frozen
  - `get_port()` → 47351 when frozen, 8000 otherwise
  - `get_host()` → always "127.0.0.1"
- `src/scan2text/cli.py` — Frozen executable entry point; starts uvicorn on prod host/port
- `packaging/scan2text-backend.spec` — PyInstaller spec (folder-based output structure)
- `tools/smoke_backend_exe.ps1` — Smoke test script for frozen backend
- `tests/unit/test_prod_runtime.py` — 7 tests for prod_runtime helper
- `tests/unit/services/test_path_service_frozen.py` — 5 tests for PathService frozen behavior

### Modified Files
- `src/scan2text/services/path_service.py` — `_resolve_base_dir()`: frozen path changed from `exe_parent / "scan2text-data"` to `exe_parent` (both base_dir and app_root now resolve to exe directory when frozen)

### Build Artifact
- `dist/scan2text-backend/scan2text-backend.exe` (45 MB, PyInstaller 6.22.0)
- Binds 127.0.0.1:47351 when frozen
- Serves GET /api/health and GET /api/download/status
- Missing model files handled gracefully (loaded=false, no crash)

## Key Decisions

1. **Port 47351 locked** by CEO for production frozen backend; dev remains 8000.
2. **PathService frozen base_dir** now resolves to exe parent (not `exe_parent/scan2text-data`). This makes the artifact fully portable — all runtime dirs (settings, output, logs, models) live beside the exe.
3. **Single-file PyInstaller bundle** moved into `dist/scan2text-backend/` folder for organized output. The exe is a self-contained single-file bundle that extracts to temp at runtime.
4. **No dev script changes** — dev.ps1/dev-web.ps1 untouched; they still use uvicorn on port 8000.
5. **No dependencies installed** beyond PyInstaller (already present, CEO-approved).

## Test Coverage

- `tests/unit/test_prod_runtime.py`: 7 tests
  - TestIsFrozen::test_false_in_normal_python
  - TestIsFrozen::test_true_when_sys_frozen_is_set
  - TestFrozenExeDir::test_returns_exe_parent_when_frozen
  - TestFrozenExeDir::test_raises_when_not_frozen
  - TestGetPort::test_frozen_port_is_47351
  - TestGetPort::test_non_frozen_port_is_8000
  - TestGetHost::test_always_127_0_0_1
- `tests/unit/services/test_path_service_frozen.py`: 5 tests
  - TestPathServiceFrozen::test_frozen_app_root_is_exe_parent
  - TestPathServiceFrozen::test_frozen_base_dir_is_exe_parent
  - TestPathServiceFrozen::test_non_frozen_behavior_unchanged
  - TestPathServiceFrozen::test_frozen_models_dir_under_exe_parent
  - TestPathServiceFrozen::test_frozen_settings_path_under_exe_parent

## Open Questions

- Tauri sidecar wiring: how should Tauri discover and manage the backend process lifecycle? (Next slice: S9.3)
- Should the frozen exe include a `--help` or `--port` CLI override for debugging? (YAGNI for now)
