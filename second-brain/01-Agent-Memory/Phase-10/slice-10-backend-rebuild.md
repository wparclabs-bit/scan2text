# Slice: S10-R2c-Rebuild-Backend-Exe

## What Changed
Rebuilt `scan2text-backend.exe` via PyInstaller 6.22.0 from current source code, then swapped the new executable into the portable assembly directory.

## Key Decisions
- Spec file: `packaging/scan2text-backend.spec` (entry point: `src/scan2text/cli.py`)
- The spec's conditional move (`if not os.path.isfile(dst_exe)`) did NOT trigger because the destination exe already existed from a prior build. Manual `Copy-Item -Force` used to overwrite.
- PyInstaller `--clean --noconfirm` flags used for idempotent rebuild.
- Portable assembly runtime dirs (`feedback/`, `logs/`) preserved — only the `.exe` was overwritten.

## Hash Chain
| Location | SHA256 |
|---|---|
| Old portable exe | `FD9089F59E8E835CA954729D137D782DD3772FDC606215546ECDFC6D2512223D` |
| New repo build | `39C044AF2220E5531275CFA7088FAD2F2DBC350A50B9CE3F86E829F963143CB5` |
| Swapped to portable | `39C044AF2220E5531275CFA7088FAD2F2DBC350A50B9CE3F86E829F963143CB5` |

**Verification:** Swapped hash matches repo build hash — mathematically proven identical.

## Test Coverage
- 235 backend tests passed (pre-existing failure: `test_health_contract` — dummy models on disk).
- No new tests: this slice is a rebuild only, no source changes.

## Open Questions
- None. The spec's post-build move logic needs review if manual copy is required on every rebuild.
