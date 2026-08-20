# S16-FIX-HEALTH-CONTRACT-TEST

## Summary

Made `test_health_contract` hermetic and deterministic by forcing the health endpoint to observe an empty model location via `SCAN2TEXT_MODELS_DIR` environment variable, confirming the no-model path returns `loaded=False`.

## Status: COMPLETE

## RED Evidence

```
F [.1s]
================================== FAILURES ===================================
____________________________ test_health_contract _____________________________
tests\test_health.py:25: in test_health_contract
    assert model["loaded"] is False
E   assert True is False
1 failed in 0.48s
```

## Forensics

### Root Cause Analysis

The test `test_health_contract` asserts `model["loaded"] is False`, but the health endpoint returns `loaded=True` because:

1. **No adapter loaded**: The test creates a bare FastAPI app with only the health router — no queue service, no VLM adapter.
2. **Fallback path**: `_get_adapter_state()` (health.py:35-46) checks for an adapter via `queue_service._vlm_adapter`. When absent, it falls back to checking model files on disk.
3. **Workspace models present**: The repo root contains `models/vlm.gguf` and `models/mmproj.gguf`, so the fallback returns `{"loaded": True}`.

### Test Seam Discovery

Two environment variables control `PathService` path resolution:

| Env Var | Controls | Used By |
|---------|----------|---------|
| `SCAN2TEXT_HOME` | `base_dir` and `app_root` | Settings path, output dir, logs dir |
| `SCAN2TEXT_MODELS_DIR` | `models_dir` property | Model file resolution (`resolve_model_path`) |

**Critical finding**: `SCAN2TEXT_HOME` does NOT affect `models_dir`. The `models_dir` property (path_service.py:174-210) checks `SCAN2TEXT_MODELS_DIR` first, then falls back to auto-resolution via `_resolve_models_dir()` which returns `Path.cwd()` in dev mode.

When `PathService()` is instantiated with no constructor args (as the health endpoint does), both `_app_root_injected` and `_app_root_from_base_dir` are False, causing `models_dir` to use `_resolve_models_dir()` → `Path.cwd() / "models"` regardless of `SCAN2TEXT_HOME`.

### Correct Seam

`SCAN2TEXT_MODELS_DIR` — the env var that actually controls model path resolution. Setting it to an empty directory (with `models/` subdirectory created) forces both:
- `_get_adapter_state()` fallback file check → `is_file() = False`
- Health endpoint's `files_present` computation → `False`

## Fix Applied

**File**: `tests/test_health.py`

```python
def test_health_contract(tmp_path, monkeypatch):
    """Health endpoint returns loaded=False when no model files are visible."""
    (tmp_path / "models").mkdir()
    monkeypatch.setenv("SCAN2TEXT_MODELS_DIR", str(tmp_path))
    r = client.get("/api/health")
    # ... all existing assertions preserved ...
```

Changes:
- Added `tmp_path` and `monkeypatch` parameters (pytest fixtures)
- Created empty `models/` subdirectory in tmp_path
- Set `SCAN2TEXT_MODELS_DIR` to point at the empty temp directory
- Added docstring explaining the test's purpose

## GREEN Evidence

```
......                                                                   [100%]
6 passed in 0.44s
```

All 6 tests in `tests/test_health.py` pass:
1. `test_health_contract` — now hermetic via `SCAN2TEXT_MODELS_DIR`
2. `test_health_worker_busy_flag`
3. `test_health_model_files_found`
4. `test_health_when_adapter_not_loaded`
5. `test_health_when_adapter_is_loaded`
6. `test_health_returns_cpu_percent`

## Modified Files

- `tests/test_health.py` — 4 insertions, 1 deletion (test fix only)
- `second-brain/00-Current-State.md` — updated baseline + changelog
- `second-brain/01-Agent-Memory/Phase-11/slice-S16-FIX-HEALTH-CONTRACT-TEST.md` — this file

## Verification

- ✅ Targeted test command passes (6/6)
- ✅ No backend source changes (`git diff --name-only HEAD -- src` returns empty)
- ✅ No frontend or Rust files modified
- ✅ Backend tests: 336 passed + 0 failures (was 335+1, now fully GREEN)

## Key Learnings

1. **`SCAN2TEXT_HOME` ≠ `models_dir`**: The `PathService.models_dir` property has its own env var (`SCAN2TEXT_MODELS_DIR`) that takes priority over all other resolution paths. `SCAN2TEXT_HOME` only controls `base_dir` and `app_root`.
2. **Fresh instantiation in tests**: The health endpoint creates a new `PathService()` per request — module-level `_default_instance` is never used by the endpoint code.
3. **`_resolve_models_dir()` returns `Path.cwd()` in dev mode**: When neither `SCAN2TEXT_MODELS_DIR` nor injected `app_root` is set, models resolve to `<cwd>/models`, which is the workspace models directory.
