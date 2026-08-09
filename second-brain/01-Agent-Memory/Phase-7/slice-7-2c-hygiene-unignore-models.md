# Slice 7.2c — Repo Hygiene: Un-ignore `src/scan2text/models` + Drop `egg-info`

## What Changed
- `.gitignore`: replaced bare `models/` with anchored `/models/` so the rule no longer shadows `src/scan2text/models/`.
- `.gitignore`: added `*.egg-info/` to suppress future setuptools artifact noise.
- `git rm -r --cached src/scan2text.egg-info`: removed stale egg-info entries from the index.
- `git add src/scan2text/models/ .gitignore`: re-added the five model contract files to tracking.

No source-code logic changed. Frontend untouched. Test baseline (112 tests) carries unchanged.

## Key Decisions
- Anchored the ignore rule (`/models/`) rather than deleting it, preserving the intent to ignore top-level `models/` directories (e.g. runtime output dirs) while un-shadowing the source contracts under `src/`.
- Dropped `egg-info` from the index rather than adding it retroactively; the new `*.egg-info/` line prevents recurrence.

## Test Coverage
- No new tests required (no logic change). 112-test Phase-6 baseline remains the reference count.
- Verification performed via `git ls-files src/scan2text/models` confirming all five files: `__init__.py`, `settings.py`, `job.py`, `errors.py`, `ocr_result.py`.

## Open Questions
- None. Slice is metadata-only hygiene.
