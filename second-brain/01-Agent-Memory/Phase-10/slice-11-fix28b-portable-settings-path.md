# Slice S11-FIX28b-Portable-Settings-Path

**Date:** 2026-08-17
**Phase:** Phase 10
**Status:** COMPLETE

## What Changed

Fixed `PathService` so `settings_path`, `logs_dir`, and new `feedback_dir` resolve to the portable root (ancestor containing `models/`) in frozen mode, matching the `output_dir` logic from FIX14.

### Root Cause
In frozen (PyInstaller) builds, `sys.executable` points to `dist/scan2text-backend/scan2text-backend.exe`. The `base_dir` property resolves to `exe.parent` = `dist/scan2text-backend/`. Therefore:
- `settings_path` → `dist/scan2text-backend/settings/settings.json` (wiped on reinstall)
- `logs_dir` → `dist/scan2text-backend/logs/` (wiped on reinstall)
- feedback dirs (via `base_dir`) → same location

Settings and logs did not persist across reopens because the portable root is `D:\Scan2Text\`, not `D:\Scan2Text\dist\scan2text-backend\`.

### Fix
Added `_resolve_portable_root()` static method that walks up from `exe_dir` (exe_dir, exe_dir.parent, exe_dir.parent.parent) to find the first ancestor containing a `models/` directory. Applied it to:
- `settings_path` — frozen: portable_root / "settings" / "settings.json"
- `logs_dir` — frozen: portable_root / "logs"
- `feedback_dir` (new property) — frozen: portable_root / "feedback"

Non-frozen (dev) behavior unchanged. When no `models/` ancestor exists, falls back to exe_dir (legacy behavior).

## Key Decisions
- Did NOT change `base_dir` — it's used by many consumers and changing it would be a broad refactor. Only the three affected properties now use portable root in frozen mode.
- Added `feedback_dir` property to `PathService` so `FeedbackService` can use it explicitly (currently it uses `base_dir` directly; future cleanup can wire it through).
- Test name updated: `test_frozen_settings_path_under_exe_parent` → `test_frozen_settings_path_under_exe_parent_when_no_models_above` to reflect fallback behavior.

## Test Coverage
- `test_frozen_settings_and_logs_resolve_to_portable_root` — new, verifies both properties resolve to portable root when models/ exists at grandparent
- `test_frozen_feedback_dir_resolves_to_portable_root` — new, verifies feedback_dir resolves to portable root
- `test_frozen_settings_path_under_exe_parent_when_no_models_above` — updated existing test for fallback behavior
- All 12 frozen tests pass

## Open Questions
- Should `FeedbackService._ensure_feedback_dirs()` be wired to use `path_service.feedback_dir` instead of `base_dir` directly? (Low priority — `base_dir` is still correct for dev mode.)
