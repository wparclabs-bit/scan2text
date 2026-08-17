# S11-FIX38 — Pypdfium2 Bundling Fix

## What Changed
- `packaging/scan2text-backend.spec`: Added `collect_all("pypdfium2")` block (lines 38-41) and merged `pdf_binaries`/`pdf_hiddenimports` into `all_binaries`/`all_hiddenimports`.
- `tests/test_packaging_spec.py`: New test file with 3 tests asserting spec text contract.

## Key Decisions
- Used spec-text inspection (regex) rather than import-time execution — avoids side effects, tests the contract at the seam.
- Intermediate variables (`pdf_binaries`, `pdf_hiddenimports`) follow existing pattern (`llama_binaries`, `pil_binaries`).
- pypdfium2 is the locked PDF rasterizer (PRD §12, L6); CEO re-confirmed.

## Root Cause (DIAG2)
`packaging/scan2text-backend.spec:29-39` collected `llama_cpp` + `PIL` only. `pypdfium2` auto-hook does NOT populate `binaries/` or `hiddenimports/` in the PyInstaller bundle, so the packaged exe crashes on any PDF input with a missing DLL.

## Test Coverage
- `test_spec_contains_pypdfium2_collect_all` — spec text has `collect_all("pypdfium2")`
- `test_spec_merges_pypdfium2_binaries_into_all_binaries` — `all_binaries` includes `*pdf_binaries`
- `test_spec_merges_pypdfium2_hiddenimports_into_all_hiddenimports` — `all_hiddenimports` includes `*pdf_hiddenimports`

## Open Questions
- None. FIX41 will do the actual rebuild; this slice only fixes the spec + adds the test gate.

## Gates
- RED: 3/3 failed
- GREEN: 3/3 passed (targeted)
- Full suite: 278 passed, 1 pre-existing failure (`test_health_contract`)
