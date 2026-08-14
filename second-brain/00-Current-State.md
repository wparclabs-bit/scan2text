# Scan2Text Current State

<!-- MAINTENANCE PROTOCOL: Keep only the Baseline block + last 5 changelog entries here. When you add a new entry, move the oldest entry to second-brain/01-Agent-Memory/Archive/state-history.md. This protects the 45k token cap (AGENTS.md 3.2). -->

## Baseline
- Phase: Phase 10 (E2E Packaged Verification) — MSI + NSIS installers built, portable assembly done, backend wired to HTTP (ADR-008)
- Date: 2026-08-14
- Baseline commit: ec9443d (Phase 6 closed)
- Backend tests: 211 passed, 1 pre-existing failure (test_health_contract — dummy models on disk)
- Frontend tests: 616 green, 0 failures. S10-FIX3 tooltip + centering fixes complete. S9.4b COMPLETE.
- Rust tests: 14 passed (10 existing + 4 from S9.7: boot_backend + 3 lifecycle)
- PRD: v1.10 source of truth in second-brain/04-Product/
- Next: CEO manual E2E verification of portable assembly at D:\Scan2Text — run verify-portable.ps1 → drop image → verify Markdown output.

## Recent Changelog (last 5)
- **2026-08-14 (S10-FIX3-UI-Tooltip-Icon):** Fixed Bug 1: TopBar.tsx:93 swapped ternary — `language === 'en'` now maps to `t('actions.langTooltipEn')` ("Switch to Bahasa" in EN, "Beralih ke Bahasa Indonesia" in ID) instead of the inverted `langTooltipId`. Added `forceMount` to all TooltipContent for jsdom testability. Fixed Bug 2: FileDropZone.tsx:125 className merge — defaults (`w-full flex-1 flex flex-col items-center justify-center gap-2 p-4`) always emitted; prop className appended. Added 6 tests (3 TopBar tooltip + 3 FileDropZone centering). Tests: 610 → 616. Status: READY FOR CEO MANUAL VERIFICATION.
- **2026-08-14 (S10-DIAG4-UI-Tooltip-Icon-Diagnosis):** Root causes identified for two UI bugs (CEO screenshot 2026-08-14): (1) language tooltip inverted — `TopBar.tsx:93` ternary swaps `langTooltipEn`/`langTooltipId` keys; (2) dropzone upload icon left-aligned — `FileDropZone.tsx:125` uses `??` which replaces default flex-centering classes when caller passes className prop. Diagnosis written to `second-brain/01-Agent-Memory/Phase-7/issue-s10-ui-bugs-diagnosis.md`. REMEDIATION PENDING.
- **2026-08-14 (S10-PORTABLE-ASSEMBLY):** Portable folder produced at D:\Scan2Text. Added `[[bin]] name = "Scan2Text"` to Cargo.toml — binary now compiles as `Scan2Text.exe` (was `app_lib.exe`). Portable layout: `Scan2Text.exe` + `dist/scan2text-backend/scan2text-backend.exe` + empty `models/`. Replaced obsolete `verify-packaged-backend.ps1` (NSIS/MSI-era) with `verify-portable.ps1` (parameterized -PortablePath, same health-check logic). New SHA256: `B551FF7C...`. Status: READY FOR CEO MANUAL VERIFICATION.
- **2026-08-14 (S10-DIAG3-Config-Divergence-Fix):** Root cause identified. Diffed our build.rs + Cargo.toml against working probe (s2t-probe). Divergence: (1) build.rs called only `println!` rerun directives, missing `tauri_build::build()` — this function embeds the ComCtl32 v6 manifest that enables modern Windows controls (TaskDialogIndirect). Without it, binary links against Common Controls v5 → entry-point error at launch. (2) crate-type missing `staticlib` (probe has `["staticlib","cdylib","rlib"]`). Fixed both. Rebuilt: new SHA256 `B0DF43AF56FD805BB604D62F4D6C8DA7704EF3570CED8B4CFEAA8B0413BDC23D` (≠ A4037A3E). BLOCKED: CEO launch test.
- **2026-08-14 (S10-FIX2-Clean-Rebuild):** Forced relink by renaming poisoned `app_lib123.exe` → `app_lib123.exe.poisoned`. Clean `npx tauri build` under active Defender exclusions produced 2 bundles (MSI + NSIS). New SHA256 `A4037A3E99D097B16332911DF6CE029860AD7A26EAEAE09D10EE78F364608235` — confirmed different from poisoned hash `1A87EB29...`. BLOCKED: CEO launch test pending.

For older history see second-brain/01-Agent-Memory/Archive/state-history.md
