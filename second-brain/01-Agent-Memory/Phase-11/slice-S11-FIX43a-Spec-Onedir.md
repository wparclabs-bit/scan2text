# S11-FIX43a — Spec-Onedir

## What Changed
- `packaging/scan2text-backend.spec`: Added `onefile=False` to EXE call; replaced manual `shutil.move` post-build hack with standard `COLLECT(exe, a.binaries, a.datas, name='scan2text-backend')` block.
- `tests/test_packaging_spec.py`: +2 spec-contract tests guarding folder mode forever.

## Key Decisions
- ADR-008 Decision 2 / CEO Option B locks folder-based output. The onefile exe bundles everything into a single 45 MB binary with zero standalone DLLs, which breaks pypdfium2's sibling-DLL resolution.
- `onefile=False` is explicit (not implicit) so the spec text itself encodes the contract.
- COLLECT block wires the exe + binaries + datas into the `dist/scan2text-backend/` folder artifact — pypdfium2_raw/pdfium.dll lands as a real sibling file on disk.

## Test Coverage
- `test_spec_not_onefile`: asserts `"onefile=True"` NOT in spec text.
- `test_spec_has_collect_block_for_folder_artifact`: asserts `COLLECT(` block exists and names `scan2text-backend`.
- All 5 packaging spec tests green. Full backend: 283 passed, 1 pre-existing (test_health_contract).

## Open Questions
- STEP 2 (S11-FIX43b) must rebuild both artifacts and run live PDF probe to confirm pypdfium2 loads from the real DLL sibling.

## Commit
- `2bca268` S11-FIX43a: spec onedir — COLLECT block + onefile=False (ADR-008 Option B)
