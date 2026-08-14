# Scan2Text Current State

<!-- MAINTENANCE PROTOCOL: Keep only the Baseline block + last 5 changelog entries here. When you add a new entry, move the oldest entry to second-brain/01-Agent-Memory/Archive/state-history.md. This protects the 45k token cap (AGENTS.md 3.2). -->

## Baseline
- Phase: Phase 10 (E2E Packaged Verification) — MSI + NSIS installers built, portable assembly done, backend wired to HTTP (ADR-008)
- Date: 2026-08-14
- Baseline commit: ec9443d (Phase 6 closed)
- Backend tests: 211 passed, 1 pre-existing failure (test_health_contract — dummy models on disk)
- Frontend tests: 617 green, 0 failures. S10-FIX3 tooltip + centering fixes complete. S10-FIX4 tooltip visibility fix complete (forceMount removed, delayDuration={200} CEO-locked). S10-FIX5+FIX6 corrective history complete. S9.4b COMPLETE.
- Rust tests: 14 passed (10 existing + 4 from S9.7: boot_backend + 3 lifecycle)
- PRD: v1.10 source of truth in second-brain/04-Product/
- Next: CEO manual E2E verification of portable assembly at D:\Scan2Text — run verify-portable.ps1 → drop image → verify Markdown output.

## Recent Changelog (last 5)
- **2026-08-14 (S10-R4-Verify-Script-Docs-Commit):** Verified `verify-portable.ps1` — Start-Process redirects stdout/stderr to separate files, no same-stream conflict. Script exits 0 on healthy backend (port 47351 open, /api/health returns ok). No code changes needed; script already correct. Status: READY FOR CEO FINAL EXAM.
- **2026-08-14 (S10-FIX5+FIX6-Verify-Docs-Commit):** Corrective pass. FIX4 summary had false claim that `delayDuration` was removed — corrected to disk truth: `forceMount` removed (root cause), `delayDuration={200}` KEPT (CEO lock). Tests use fake timers for 200ms delay. 617 tests green, 0 failed; typecheck 0 errors; build success. Status: READY FOR CEO MANUAL VERIFICATION.
- **2026-08-14 (S10-FIX4-Tooltip-Visibility):** Root cause: FIX3 added `forceMount` to all TooltipContent (keeps all 3 mounted in DOM) + `delayDuration={200}` on TooltipProvider (200ms close-delay). Combined effect: hovering between 8px icon buttons (gap-1) keeps first tooltip open while next opens → all visible simultaneously → garbled text. Fix: removed `forceMount` from TooltipContent, `delayDuration={200}` retained per CEO lock. Updated tests to use fake timers. Key lesson: test-only flags like forceMount must never ship to production UI. Tests: 617 green, 0 regressions. Status: READY FOR CEO MANUAL VERIFICATION.
- **2026-08-14 (S10-DIAG5-TopBar-Tooltip-Overlap):** Root cause diagnosed. FIX3 added `forceMount` to all 3 TooltipContent (line 75, 92, 108) and `delayDuration={200}` on TooltipProvider (line 25). `delayDuration` creates a 200ms close-delay window: moving cursor between the three icon buttons (8px wide, `gap-1`) within 200ms causes the first tooltip to remain open while the next opens → all TooltipContents visible simultaneously → garbled text. `forceMount` compounds by keeping all 3 contents mounted in DOM at all times. Bug-1 ternary: confirmed FIXED in 850baed (line 93 `=== 'en'` → `langTooltipEn`). Fix direction: remove `delayDuration` from provider + remove `forceMount` from all TooltipContent. Tests should use fake timers (`advanceTimersByTime`) instead. Remediation pending.
- **2026-08-14 (S10-FIX3-UI-Tooltip-Icon):** Fixed Bug 1: TopBar.tsx:93 swapped ternary — `language === 'en'` now maps to `t('actions.langTooltipEn')` ("Switch to Bahasa" in EN, "Beralih ke Bahasa Indonesia" in ID) instead of the inverted `langTooltipId`. Added `forceMount` to all TooltipContent for jsdom testability. Fixed Bug 2: FileDropZone.tsx:125 className merge — defaults (`w-full flex-1 flex flex-col items-center justify-center gap-2 p-4`) always emitted; prop className appended. Added 6 tests (3 TopBar tooltip + 3 FileDropZone centering). Tests: 610 → 616. Status: READY FOR CEO MANUAL VERIFICATION.

For older history see second-brain/01-Agent-Memory/Archive/state-history.md
