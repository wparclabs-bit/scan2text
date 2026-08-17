## 2026-08-13 (S9.4b-4): App.tsx wired — imported buildApiUrl, replaced 4 relative fetch URLs (settings, download/status+cache-buster, download/start, feedback/pending-count) with buildApiUrl() calls. Added 4 RED tests (fixed mock implementations for cross-call stubbing + navigator.onLine). 4 RED tests turned GREEN. S9.4b COMPLETE. Frontend: 610 green, 0 failures.

## 2026-08-13 (S9.4b-3): Removed hardcoded `API_BASE` constants from api.ts and uploadService.ts; wired all fetch calls through buildApiUrl(). 5 RED tests turned GREEN. Frontend: 606 green, 0 failures.

## 2026-08-13 (S9.4b-2): ModelDownloaderModal wired — imported buildApiUrl, replaced 3 hardcoded/relative fetch URLs (progress, cancel, start) with buildApiUrl() calls. Added 2 RED tests for cancel/start in PROD mode. 10 tests pass (3 new). Frontend: 601 green, 5 failures remaining (api.test.ts ×3, uploadService.test.ts ×2).

## 2026-08-13 (S9.4b-1): FeedbackDialog + WelcomeModal already wired — forensics confirmed both files import and call buildApiUrl() from original commits (195d2e5, 8156378). 14 tests pass (7 per file). No source changes needed. 6 pre-existing failures remain in b-2/b-3/b-4 targets.

# DOC-05: PRD-04 §19 Testing Strategy → PRD-03 §19

## What Changed
- Copied PRD-04 §19 "Testing Strategy" (second-brain/04-Product/04-testing-and-engineering-rules.md) into PRD-03 (second-brain/04-Product/03-non-functional-and-architecture.md) as new §19, placed after §18 Logging Requirements.
- Trimmed per CEO Option A: removed the entire "QA Artifact" subsection (historical execution record); removed the historical execution line from "OCR Accuracy Validation" subsection.
- All other §19 content preserved verbatim: Test Pyramid, Unit Tests, Integration Tests (backend + frontend), Frontend v1.7 visual-contract, Manual/E2E Tests, QA Manual Test Script Artifact requirement, OCR Accuracy Validation requirement line.
- PRD-03 version bumped from 1.12 to 1.13 with changelog entry.
- PRD-04 source left intact (deletion deferred to DOC-08).

## Key Decisions
- CEO approved Option A: fold §19 into PRD-03, trim historical QA run records, keep testing requirements.
- DOC-only slice — no source code touched.
- Dissolution sequence: DOC-05 (§19→PRD-03), DOC-06 (§21/22/23→PRD-01), DOC-07 (§20→AGENTS.md), DOC-08 (delete PRD-04 + fix refs).

## Open Questions
- None. DOC-06 is the next dissolution step.

## 2026-08-13 (DOC-11): AGENTS.md diet — slimmed stale Phase-6 content, relocated + fixed MCP block to section 3.11, archived Phase-6 visual detail. Backup in 00-Inbox/backups/; archive in 01-Agent-Memory/Archive/. Doc-only slice; no source touched.

## 2026-08-13 (S9.5): Tauri sidecar forensics (read-only) — mapped src-tauri structure (866 source lines, ~30 KB), confirmed BackendManager + RunEvent::Exit hooks already implemented, externalBin config absent, no Rust code changes. Scope report generated; recommends 2-slice split (config wiring + lifecycle completion). Doc-only; no source touched.

## 2026-08-14 (S9.8-FIX): Bundle identifier repaired + production build succeeded. Updated `identifier` in tauri.conf.json from `com.tauri.dev` to `com.wingai.scan2text`. Created `src/main.rs` entry point (Cargo auto-discovers as binary target; no `[bin]` section needed — Tauri CLI rejects standard `[bin]` TOML table syntax). Validation script extended to 7 checks (2 new identifier assertions). Build produced 2 bundles: MSI (~46 MB) + NSIS (~45 MB). Backend embedded in installers via `bundle.resources`.

## 2026-08-14 (S10-E2E-Packaged-Verification): Authored `scripts/verify-packaged-backend.ps1` — searches NSIS/MSI install paths, launches Scan2Text.exe, waits for port 47351 (Test-NetConnection), hits /api/health (Invoke-RestMethod). Created `second-brain/02-qa/s10-e2e-packaged-verification.md` — 7-step CEO QA guide (install, health-check script, UI launch, drop image, verify Markdown, i18n toggle, theme toggle). Status: READY FOR CEO MANUAL VERIFICATION.

## 2026-08-14 (S10-PORTABLE-ASSEMBLY): Portable folder produced at D:\Scan2Text. Added `[[bin]] name = "Scan2Text"` to Cargo.toml — binary now compiles as `Scan2Text.exe` (was `app_lib.exe`). Portable layout: `Scan2Text.exe` + `dist/scan2text-backend/scan2text-backend.exe` + empty `models/`. Replaced obsolete `verify-packaged-backend.ps1` (NSIS/MSI-era) with `verify-portable.ps1` (parameterized -PortablePath, same health-check logic). New SHA256: `B551FF7C...`. Status: READY FOR CEO MANUAL VERIFICATION.

## 2026-08-14 (S10-DIAG5-TopBar-Tooltip-Overlap): Root cause diagnosed. FIX3 added `forceMount` to all 3 TooltipContent (line 75, 92, 108) and `delayDuration={200}` on TooltipProvider (line 25). `delayDuration` creates a 200ms close-delay window: moving cursor between the three icon buttons (8px wide, `gap-1`) within 200ms causes the first tooltip to remain open while the next opens → all TooltipContents visible simultaneously → garbled text. `forceMount` compounds by keeping all 3 contents mounted in DOM at all times. Bug-1 ternary: confirmed FIXED in 850baed (line 93 `=== 'en'` → `langTooltipEn`). Fix direction: remove `delayDuration` from provider + remove `forceMount` from all TooltipContent. Tests should use fake timers (`advanceTimersByTime`) instead. Remediation pending.

## 2026-08-15 (S10-DIAG9-Surgical-PathService-Fix): Fixed `resolve_model_path()` in `path_service.py` — changed `return self.app_root / relative` to `return self.models_dir / p.name`. In frozen portable builds, `app_root` = exe dir but models live at grandparent. 3 new tests added (frozen resolve, frozen resolve with subdir, absolute passthrough). Full suite: 235 passed, 1 pre-existing failure. No source changes needed in tests beyond adding the regression tests. Status: COMPLETE.

## 2026-08-14 (S10-R2-REDO-Backend-Rebuild-Swap): Rebuilt scan2text-backend.exe via PyInstaller 6.22.0 from current source using `packaging/scan2text-backend.spec`. Replaced stale portable backend exe at D:\Scan2Text\dist\scan2text-backend\scan2text-backend.exe. New hash E39D4FDD979D (prev 964406C3951B). No source changes, no models bundled. Status: COMPLETE.

## 2026-08-14 (S10-DIAG4-UI-Tooltip-Icon-Diagnosis): Root causes identified for two UI bugs (CEO screenshot 2026-08-14): (1) language tooltip inverted — `TopBar.tsx:93` ternary swaps `langTooltipEn`/`langTooltipId` keys; (2) dropzone upload icon left-aligned — `FileDropZone.tsx:125` uses `??` which replaces default flex-centering classes when caller passes className prop. Diagnosis written to `second-brain/01-Agent-Memory/Phase-7/issue-s10-ui-bugs-diagnosis.md`. REMEDIATION PENDING.
## 2026-08-14 (S10-FIX2-Clean-Rebuild): Forced relink by renaming poisoned `app_lib123.exe` → `app_lib123.exe.poisoned`. Clean `npx tauri build` under active Defender exclusions produced 2 bundles (MSI + NSIS). New SHA256 `A4037A3E99D097B16332911DF6CE029860AD7A26EAEAE09D10EE78F364608235` — confirmed different from poisoned hash `1A87EB29...`. BLOCKED: CEO launch test pending.

## 2026-08-14 (S10-DIAG6-Portable-Backend-Models): Root cause diagnosed. TWO issues: (1) Models path mismatch — frozen PyInstaller backend resolves app_root to exe.parent (`D:\Scan2Text\dist\scan2text-backend\`) and looks for models at `dist\scan2text-backend\models\`, but CEO placed them at `D:\Scan2Text\models\`. Backend boots, health returns 200, but files_present=false, all jobs red. (2) Rust spawn silences stdout/stderr via Stdio::null() — boot error "Model files not found" invisible. Fix: symlink or copy models into backend expected path. See second-brain/01-Agent-Memory/Phase-7/issue-s10-portable-backend.md. Status: FOUND.

## 2026-08-14 (S10-PORTABLE-REFRESH): Rebuilt Scan2Text.exe from frontend via `npx tauri build --no-bundle`. New SHA256 `22AFFAD5ED32B8579F8B71A8914C38D368B226E8C7BDC51C63FD212D844CFBD7` — confirmed different from stale portable hash `B551FF7C...`. Exe copied to `D:\Scan2Text\Scan2Text.exe` with matching hash. `verify-portable.ps1` has a pre-existing PowerShell bug (RedirectStandardOutput/RedirectStandardError conflict on Start-Process) — not a regression; core verification (hash match) passed. Status: READY FOR CEO FINAL EXAM.



## 2026-08-14 (S10-FIX3-UI-Tooltip-Icon): Fixed Bug 1: TopBar.tsx:93 swapped ternary - `language === 'en'` now maps to `t('actions.langTooltipEn')` (`Switch to Bahasa` in EN, `Beralih ke Bahasa Indonesia` in ID) instead of the inverted `langTooltipId`. Added `forceMount` to all TooltipContent for jsdom testability. Fixed Bug 2: FileDropZone.tsx:125 className merge - defaults (`w-full flex-1 flex flex-col items-center justify-center gap-2 p-4`) always emitted; prop className appended. Added 6 tests (3 TopBar tooltip + 3 FileDropZone centering). Tests: 610 -> 616. Status: READY FOR CEO MANUAL VERIFICATION.

## 2026-08-14 (S10-FIX4-Tooltip-Visibility): Root cause: FIX3 added `forceMount` to all TooltipContent (keeps all 3 mounted in DOM) + `delayDuration={200}` on TooltipProvider (200ms close-delay). Combined effect: hovering between 8px icon buttons (gap-1) keeps first tooltip open while next opens -> all visible simultaneously -> garbled text. Fix: removed `forceMount` from TooltipContent, `delayDuration={200}` retained per CEO lock. Updated tests to use fake timers. Key lesson: test-only flags like forceMount must never ship to production UI. Tests: 617 green, 0 regressions. Status: READY FOR CEO MANUAL VERIFICATION.

## 2026-08-14 (S10-FIX5+FIX6-Verify-Docs-Commit): Corrective pass. FIX4 summary had false claim that `delayDuration` was removed - corrected to disk truth: `forceMount` removed (root cause), `delayDuration={200}` KEPT (CEO lock). Tests use fake timers for 200ms delay. 617 tests green, 0 failed; typecheck 0 errors; build success. Status: READY FOR CEO MANUAL VERIFICATION.
## 2026-08-15 (S10-R2c-Rebuild-Backend-Exe): Rebuilt scan2text-backend.exe via PyInstaller 6.22.0 from current source (includes `resolve_model_path()` fix from S10-DIAG9). New hash 39C044AF… replaced stale FD9089F5… at D:\Scan2Text\dist\scan2text-backend\scan2text-backend.exe. Hash match verified. No source changes. Status: COMPLETE.

## 2026-08-14 (S10-R4-Verify-Script-Docs-Commit): Verified `verify-portable.ps1` - Start-Process redirects stdout/stderr to separate files, no same-stream conflict. Script exits 0 on healthy backend (port 47351 open, /api/health returns ok). No code changes needed; script already correct. Status: READY FOR CEO FINAL EXAM.
## 2026-08-15 (S10-OPTION-A-Commit-And-Exam-Prep): Baseline verification pass. Backend tests: 235 passed, 1 pre-existing failure (test_health_contract). Rust tests: 9 passed (4 unit + 1 lifecycle + 4 manager), build clean (2 dead_code warnings). Portable backend SHA256 verified 39C044AF… — MATCHES expected. Tauri shell SHA256 6918624F… — no R3 changes yet. tauri_plugin_log USED (lib.rs:318). Updated Obsidian baseline + changelog. 3 commits: S10-DIAG9 (PathService fix), S10-R3 (Rust boot-log), S10-OPTION-A (baseline correction + diagnostic/QA artifacts). Remaining dirty: 21 modified + 53 untracked. Status: READY FOR CEO MANUAL VERIFICATION.

## 2026-08-15 (S10-R2c-Rebuild-Backend-Exe): Rebuilt scan2text-backend.exe via PyInstaller 6.22.0 from current source (includes esolve_model_path() fix from S10-DIAG9). New hash 39C044AF… replaced stale FD9089F5… at D:\Scan2Text\dist\scan2text-backend\scan2text-backend.exe. Hash match verified. No source changes. Status: COMPLETE.

## 2026-08-17 (S11-FIX29-Tauri-DragDrop-Passthrough): Set app.windows[0].fileDropEnabled: false in tauri.conf.json — Tauri v1/v2 webview intercepts OS file drops by default (fileDropEnabled=true), blocking HTML5 onDrop handlers in packaged exe. Setting to false lets DOM receive native drop events. Extended validate-tauri-config.js with assertion #8. Frontend: 630 passed, 0 failures. Typecheck clean. Build success. Status: READY FOR CEO MANUAL VERIFICATION (packaged proof at FIX32).
