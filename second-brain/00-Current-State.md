# Scan2Text Current State

<!-- MAINTENANCE PROTOCOL: Keep only the Baseline block + last 5 changelog entries here. When you add a new entry, move the oldest entry to second-brain/01-Agent-Memory/Archive/state-history.md. This protects the 45k token cap (AGENTS.md 3.2). -->

## Baseline
- Phase: Phase 11 (Gate + Tauri Rebuild) — S11-GATE-TAURI-REBUILD-DEPLOY
- Date: 2026-08-20
- Tauri shell hash: 9E49C4971A2C939E77045A54773DC8FC6702CBAA10DDA5321AAA740872656B4B (supersedes BFA7535715C23FF830F375BFC1CCA6F27A386CCC82BFB32B013E7D38A2B4DF50)
- Backend hash: B94612C9F074D4EA734D7090FA7A63050E409C9405AC95E1AC4CF810409F2A53
- UPX: NOT installed on build machine — upx=False
- pdfium.dll: present in portable dist (_internal/pypdfium2_raw/pdfium.dll, 6.88MB)
- _internal: 765 files, all DLLs present (python312.dll, llama.dll, pdfium.dll, 4 VC++ runtime DLLs)
- Backend tests: 322 passed, 1 pre-existing failure (test_health_contract)
- Frontend tests: 646 passed, 0 failures
- PRD: v1.12 source of truth in second-brain/04-Product/
- RESULT: S11-GATE-TAURI-REBUILD-DEPLOY COMPLETE. Full frontend gate (646/646, typecheck clean). Tauri rebuild: Vite build + Rust release compile + NSIS/MSI bundles. Single-file exe swap to D:\Scan2Text\Scan2Text.exe. Boot proof: NO console window, health OK at 15s (status ok, OvisOCR2 0.9B loaded, worker idle). Zero source edits.

## Recent Changelog
- **2026-08-20 (S11-FIX72-HEALTH-RETRY-RESILIENCE):** COMPLETE — Background health loop no longer fails a job on a single `getHealth()` rejection. Added `consecutiveHealthFailures` counter to `ScanJob`; only fails after 3 consecutive health probe failures, resets to 0 on any successful probe. TDD: RED→GREEN with 3 new/modified tests (97 total store tests, all passing). Typecheck clean. QueuePanel.integration.test.tsx updated for new `ScanJob` field.
- **2026-08-20 (S11-GATE-TAURI-REBUILD-DEPLOY):** COMPLETE — Full frontend gate: 646/646 tests passed, typecheck clean. Tauri rebuild via `npx @tauri-apps/cli build` (beforeBuildCommand: `npm run build` → `tsc -b && vite build`). Release compile in 1m 45s, built 2 bundles (NSIS setup + MSI). Single-file exe swap to `D:\Scan2Text\Scan2Text.exe`. Boot proof: no console window, health OK at 15s (status: ok, worker: idle, model: OvisOCR2 0.9B loaded). Old shell hash BFA75357… superseded. Zero source edits.
- **2026-08-20 (S11-FIX71-QUEUE-PUMP-PROMOTE):** COMPLETE — Queue pump stall fixed. Background health-check failure (store.ts:506-525) now calls `get().promoteNextPending()` after marking job failed, preventing `activeJobId` from getting stuck. Missing taskId path (store.ts:418-424) now calls `get().startNextPendingJob()` instead of bare `return`. Added i18n key `errors.backendLost` to both en.json ("Backend connection lost") and id.json ("Koneksi backend terputus"). TDD: RED→GREEN with 2 new tests (96 total, all passing). Zero source edits elsewhere.
- **2026-08-20 (S11-DIAG-QUEUE-PUMP-RED-DOT):** DIAG — ROOT CAUSE ISOLATED. False-red + queue stall caused by background health-check-failure path in `frontend/src/stores/scan2text.store.ts:506-525` using bare `set()` to mark job `failed` without calling `startNextPendingJob()` or `promoteNextPending()`. `activeJobId` stuck on failed job, queue pump never restarts. Pending jobs stay grey. Dropping new files unsticks queue because new file activates (replacing `activeJobId`) and its completion triggers `promoteNextPending()`. Secondary: backend batch-level `status:"failed"` when `summary.failed>0` even if successful files wrote .md (main.py:123-125). Fix: add `get().startNextPendingJob()` after line 524. Test RED first: `scan2text.store.test.ts` — "should promote next pending job when background health check fails". Zero source edits. Status: DIAG.
- **2026-08-20 (S11-FIX70-DEPLOY-PortableRoot):** COMPLETE — Swapped verified artifact into portable runtime root `D:\Scan2Text\backend\` using section-13 copy method (contents via wildcard, no nested-folder bug). Hash match: B94612C9F074D4EA734D7090FA7A63050E409C9405AC95E1AC4CF810409F2A53. DLL trio verified (python312.dll, llama.dll, pdfium.dll). 707 files deployed, no nested scan2text-backend\ folder. Boot proof from deployed location: alive at 15s, health `{"status":"ok","model":{"name":"OvisOCR2 0.9B","loaded":true}}`. Zero source edits.
