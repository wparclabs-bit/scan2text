# Slice S11-FIX30-Settings-PortableRoot

**Date:** 2026-08-17
**Phase:** Phase 10
**Status:** READY FOR FIX32 REBUILD

## What Changed

Refactored `_resolve_output_dir()` in `src/scan2text/services/path_service.py` to delegate to the shared `_resolve_portable_root()` method, eliminating duplicate walk-up logic.

### Before
- `_resolve_portable_root()` (lines 94-108): walked up from exe_dir finding first ancestor with `models/`
- `_resolve_output_dir()` (lines 110-125): DUPLICATED the same walk-up loop, returned `cand / "output"`
- `settings_path`, `logs_dir`, `feedback_dir`: all used `_resolve_portable_root()` directly

### After
- `_resolve_portable_root()` unchanged — single source of truth for the walk-up
- `_resolve_output_dir()` now delegates: `return PathService._resolve_portable_root() / "output"`
- `settings_path`, `logs_dir`, `feedback_dir`: continue using `_resolve_portable_root()` unchanged

## Key Decisions
- Did NOT change output_dir behavior (FIX14 locked) — only refactored its internal implementation to reuse the shared resolver.
- Dev (non-frozen) behavior unchanged: all three properties still fall through to `base_dir / "..."`.
- The actual fix for frozen portable paths was implemented in S11-FIX28b (commit 072e211); this slice is a verification + unification pass.

## Test Coverage
- `test_frozen_settings_and_logs_resolve_to_portable_root` — verifies settings_path + logs_dir at portable root when models/ exists at grandparent
- `test_frozen_feedback_dir_resolves_to_portable_root` — verifies feedback_dir at portable root
- `test_frozen_output_dir_resolves_to_portable_root` — verifies output_dir at portable root
- All 12 frozen tests pass (0 regressions)
- Full backend suite: 262 passed, 1 pre-existing failure (test_health_contract — unchanged)

## Open Questions
- None. FIX32 rebuild will bake this into the PyInstaller exe so the portable runtime writes settings/logs/feedback at D:\Scan2Text\ instead of inside dist\scan2text-backend\.
