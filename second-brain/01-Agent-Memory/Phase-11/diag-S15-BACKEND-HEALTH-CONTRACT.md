# diag-S15-BACKEND-HEALTH-CONTRACT

**Date:** 2026-08-21  
**Slice:** S15-DIAG-BACKEND-HEALTH-CONTRACT  
**Status:** DIAGNOSIS COMPLETE — Root cause identified. Fix deferred to next slice.

---

## Failing Test

| Field | Value |
|---|---|
| **Test file** | `tests\test_health.py` |
| **Test name** | `test_health_contract` |
| **Failed assertion** | Line 25: `assert model["loaded"] is False` |
| **Error output** | `assert True is False` |

## Actual vs Expected Response

The test constructs a bare FastAPI app (no queue_service, no adapter), calls `GET /api/health`, and expects:

```python
model = body["model"]
assert model["name"] == "OvisOCR2 0.9B"   # ✓ passes
assert model["loaded"] is False            # ✗ FAILS — actual: True
assert isinstance(model["files_present"], bool)  # ✓ passes (True)
```

Actual response body:
```json
{
  "status": "ok",
  "worker": "idle",
  "ram": { "total_mb": ..., "used_mb": ..., "percent": ... },
  "cpu": { "percent": ... },
  "model": {
    "name": "OvisOCR2 0.9B",
    "loaded": true,          ← test expects false
    "files_present": true
  },
  "version": "0.1.0"
}
```

## Root Cause Analysis

### Code path traced

1. `test_health_contract()` creates a bare `FastAPI()` app, includes the health router.
2. Calls `client.get("/api/health")`.
3. In `health()` (src/scan2text/routes/health.py:50), `_get_adapter_state(request)` is called.
4. `request.app.state` has no `queue_service` → `adapter = None`.
5. Falls through to the fallback path (lines 41-46):
   ```python
   paths = PathService()
   settings = SettingsService(path_service=paths).load()
   model_rel = settings.model_path or "models/vlm.gguf"
   mmproj_rel = settings.mmproj_path or "models/mmproj.gguf"
   files_present = paths.resolve_model_path(model_rel).is_file() and paths.resolve_model_path(mmproj_rel).is_file()
   return {"loaded": files_present}
   ```
6. `PathService()` resolves `models_dir` → `Path.cwd() / "models"` (dev mode, no SCAN2TEXT_HOME set).
7. **Both `models/vlm.gguf` and `models/mmproj.gguf` exist** in the workspace (`D:\WingAI\Projects\scan2text\models\`).
8. Therefore `files_present = True`, and `loaded = files_present = True`.
9. Test asserts `model["loaded"] is False` → **FAILS**.

### Why the test expected `False`

The test was written when the `models/` directory either did not exist or contained no model binaries. In that scenario, `files_present` would be `False`, and the fallback path would correctly return `{"loaded": False}`. The test codified this transient condition as a permanent contract.

### Why the endpoint returns `True`

The health endpoint's `_get_adapter_state()` uses file existence as a proxy for "loaded" when no active adapter is available. This is intentional: in a bare FastAPI test app (no queue_service), the endpoint cannot query a real VLM adapter, so it checks whether the model files are present on disk as the best available signal.

## Root Cause Classification

**STALE_TEST_EXPECTING_BARE_HEALTH**

The test asserts `model["loaded"] is False` based on an outdated assumption that no model files would be present in the test environment. The workspace now contains both `vlm.gguf` and `mmproj.gguf`, so the health endpoint correctly reports `loaded=True` via its file-existence fallback. The test expectation is stale, not a backend regression.

## Recommended Next Remediation Slice

**S16-FIX-HEALTH-CONTRACT-TEST** — Update `test_health_contract` to assert `model["loaded"] is True` (matching the current workspace state where both model files are present). Alternatively, if the test should verify the "no adapter" path specifically, it should use `monkeypatch` to set `SCAN2TEXT_HOME` to a temp directory without model files, mirroring the pattern used in `test_health_model_files_found`.

**Recommended approach:** Use `monkeypatch` with `SCAN2TEXT_HOME` pointing to an empty temp dir, so the test verifies the "no models" path explicitly and remains robust regardless of workspace state. This aligns with the existing pattern in `test_health_model_files_found` (line 36-41).

## Files Inspected

| File | Purpose |
|---|---|
| `tests\test_health.py` | Failing test + related health tests |
| `src\scan2text\routes\health.py` | Health endpoint implementation |
| `src\scan2text\services\path_service.py` | Path resolution logic (models_dir, resolve_model_path) |

## No Source Edits Made

Per slice constraints: zero source files modified. Diagnosis only.
