# S10-R1-REDO-PathService-Models-Resolution

## What Changed
- Added `tests/unit/services/test_path_service_models_resolution.py` (13 tests)
- **NO source code changes** — PathService models resolution priority was ALREADY-IMPLEMENTED

## Key Decisions
- PathService `_resolve_models_dir()` + `models_dir` property already implement the locked CEO priority:
  1. `SCAN2TEXT_MODELS_DIR` env var (with error listing probed paths)
  2. Frozen grandparent (`exe_dir.parent`) when `models/` exists
  3. Frozen parent (`exe_dir`) when `models/` exists
  4. Dev root (`cwd`)
- The 13 new tests verify every branch including edge cases (env invalid, frozen env error lists paths, injected app_root)
- DIAG7 forensics confirmed R1/R2/R2 were never executed: frozen binary was built before this code was added

## Test Coverage
| Branch | Test | Status |
|--------|------|--------|
| Env valid | `test_env_valid_returns_env_path` | PASS |
| Env invalid | `test_env_nonexistent_raises_runtime_error` | PASS |
| Env invalid + frozen paths | `test_frozen_env_missing_lists_frozen_paths` | PASS |
| Grandparent models | `test_grandparent_has_models_is_chosen` | PASS |
| Parent models (no grandparent) | `test_grandparent_no_models_parent_has_models` | PASS |
| Exe-adjacent only | `test_only_exe_has_models` | PASS |
| No models anywhere | `test_no_models_anywhere_creates_under_exe` | PASS |
| Dev cwd | `test_non_frozen_returns_cwd` | PASS |
| Env overrides dev | `test_non_frozen_env_overrides_cwd` | PASS |
| Missing error paths | `test_env_missing_error_lists_all_paths` | PASS |
| Injected app_root | `test_injected_app_root_models` | PASS |
| Base_dir only | `test_base_dir_only_app_root_from_base` | PASS |

## Open Questions
- Frozen binary needs rebuild (R2) to pick up the models resolution logic
- Pre-existing SyntaxWarning on line 196 (`\ |` in sanitize_filename docstring) — not introduced by this slice
- Full suite: 232 passed, 1 pre-existing failure (test_health_contract)
