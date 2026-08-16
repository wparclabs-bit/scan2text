# S10-FIX-Clean-Bytes-Rebuild

## What Changed
- Rebuilt Tauri app from scratch after confirmed on-disk inline patching (poisoned exe copies).
- Build log piped to `build.log` for audit trail.
- No source code changes — pure rebuild with fresh compiler output.

## Key Decisions
- Defender exclusions could not be verified at shell level (non-admin), but CEO confirmed exclusions were added for target and install folders prior to this run.
- Used `npx tauri build > build.log 2>&1` per AGENTS.md §2 PowerShell constraints.

## Build Artifacts
| Artifact | SHA256 |
|---|---|
| `app_lib.exe` | `F8AA2B3D13D15B496C138D53C17F1691DB35465C962919B1D78604AEA3438E98` |
| `Scan2Text_0.1.0_x64-setup.exe` (NSIS) | `1352D671111EF33633CC4DEEF1701E9044BFC7518C70714B3DD7C7795BECE8C6` |
| `Scan2Text_0.1.0_x64_en-US.msi` (MSI) | `985CEEFA2B3C47CA6D1BAC7389CFF96A5D616D1D9B199A520FFCB47A7FDCE374` |

## Test Coverage
- No code changes — no new tests required.

## Open Questions
- CEO must run the fresh installer and verify the app launches without Defender quarantine.
- Previous build hash unknown (was never recorded before poisoning event).

## Status
- **BLOCKED** — Awaiting CEO launch test with fresh installer.
- Build log at: `frontend\build.log`
