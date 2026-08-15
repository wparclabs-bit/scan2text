# Slice 9 — PathService resolve_model_path Fix

## What Changed
- `src/scan2text/services/path_service.py`: `resolve_model_path()` changed from `self.app_root / relative` to `self.models_dir / p.name`
- `tests/unit/services/test_path_service_frozen.py`: Added 3 new tests

## Key Decisions
- **Fix at PathService layer (Option B)** — resolves_model_path now uses `self.models_dir` which already implements the correct priority chain (env → frozen grandparent → parent → dev)
- `p.name` extracts just the filename from relative paths (e.g., `"models/vlm.gguf"` → `"vlm.gguf"`), preventing double-"models/" prefix
- Absolute paths remain passthrough (unchanged behavior)

## Test Coverage
- `test_resolve_model_path_frozen_uses_models_dir` — verifies frozen mode resolves to models_dir, not app_root
- `test_resolve_model_path_frozen_with_subdir` — verifies `"models/vlm.gguf"` resolves correctly (filename extracted)
- `test_resolve_model_path_absolute_passthrough` — verifies UNC absolute paths pass through unchanged

## Open Questions
- None. The models_dir resolution logic itself was validated in Phase 10 R1 (13 tests). This slice only fixes the consumer of models_dir.
