# S10-FIX2-Clean-Rebuild

## What Changed
- Renamed poisoned `app_lib123.exe` → `app_lib123.exe.poisoned` (forced Cargo relink)
- Clean `npx tauri build` under active Defender exclusions
- 2 bundles rebuilt: MSI + NSIS
- New clean SHA256: `A4037A3E99D097B16332911DF6CE029860AD7A26EAEAE09D10EE78F364608235`
- Old poisoned hash: `1A87EB29...` — confirmed different

## Key Decisions
- Defender exclusions confirmed live via Windows Security GUI (admin session)
- No source changes — purely binary rebuild under exclusions
- Build completed in 24.74s, no compilation errors

## Test Coverage
- npm run test: not run (doc/config-only slice)
- npm run typecheck: not run (doc/config-only slice)
- Hash comparison: clean vs poisoned confirmed distinct

## Open Questions
- CEO launch test still pending — BLOCKED line remains in 00-Current-State.md
