# Scan2Text Current State

<!-- MAINTENANCE PROTOCOL: Keep only the Baseline block + last 5 changelog entries here. When you add a new entry, move the oldest entry to second-brain/01-Agent-Memory/Archive/state-history.md. This protects the 45k token cap (AGENTS.md 3.2). -->

## Baseline
- Phase: Phase 11 (WSOD Fix) — S11-FIX63 Complete
- Date: 2026-08-19
- Tauri shell hash: BFA7535715C23FF830F375BFC1CCA6F27A386CCC82BFB32B013E7D38A2B4DF50
- Backend hash: 4EBD872A6563E3DE199D50A69A4DB904E0864D6F28A74C3D34B343C7DDA5F216 (folder-based onedir, S11-FIX56)
- pdfium.dll: present in portable dist (_internal/pypdfium2_raw/pdfium.dll, 7.2MB)
- Backend tests: 320 passed, 1 pre-existing failure (test_health_contract)
- Frontend tests: 642 passed, 0 failures (full suite deferred to FIX65 gate)
- PRD: v1.12 source of truth in second-brain/04-Product/
- Next: CEO manual kitchen sink QA
- RESULT: S11-FIX63 complete. Boot gate: files_present=false → ModelDownloaderModal; MODEL_NOT_FOUND → reactive modal via store. +2 frontend tests (App.test.tsx 30+, scan2text.store.test.ts 93). Typecheck clean. Status: READY FOR CEO MANUAL VERIFICATION.

## Recent Changelog
- **2026-08-19 (S11-FIX65C1-Rust-TryClone-Compat):** COMPLETE — Replaced removed `std::process::Child::try_clone` (Rust 1.97.1) in backend_process.rs with health-endpoint polling in watcher thread. `cargo check --release` and `cargo check --dev` both zero errors. Dev lib tests 2/2 passed. No new deps, no unsafe code. Committed ac302c7. FIX65C REV2 rebuild pending.
- **2026-08-19 (S11-FIX65B-Test-Mock-Fix):** COMPLETE — Fixed setShowDownloader mock in App.test.tsx: bare `vi.fn()` no-op never mutated `_mockScan2TextStoreState`, so the files_present=false modal test failed. Mock is now reactive (useSyncExternalStore + subscribe/notify); setter mutates state AND notifies; beforeEach resets mock state (prevents showDownloader leakage between tests). Targeted test 31/31 passed. Typecheck clean. Zero production edits. Full suite deferred to FIX65 GATE slice.
- **2026-08-19 (S11-DIAG-PDF-GUARDRAIL-FORENSICS):** DIAG — PDF guardrail present and verified; backend source enforces 50-page/20MB limits with FILE_TOO_COMPLEX before rasterization. Targeted test passes. Next step: rebuild backend artifact.
- **2026-08-19 (S11-FIX63-FirstRun-Gate):** COMPLETE — First-run gate: boot files_present check + MODEL_NOT_FOUND reactive modal via store. 7 files, +70 lines. App.test.tsx 30+, store.test.ts 93. Full suite deferred to FIX65 gate per AGENTS.md 9 clarification. Typecheck clean. Committed 0673ef7. Status: READY FOR CEO MANUAL VERIFICATION.
- **2026-08-19 (S11-FIX62-Backend-Lifecycle):** COMPLETE — Backend lifecycle: boot guard (boot_guard.py), kill-on-exit (backend_process.rs), boot-failed toast (useBackendBootFailedListener). +4 backend tests, +3 frontend tests. Typecheck clean, build success. Status: READY FOR CEO MANUAL KITCHEN SINK QA.
- **2026-08-19 (S11-FIX62-Backend-Lifecycle):** COMPLETE — Backend lifecycle: boot guard (boot_guard.py), kill-on-exit (backend_process.rs), boot-failed toast (useBackendBootFailedListener). +4 backend tests, +3 frontend tests. Typecheck clean, build success. Status: READY FOR CEO MANUAL KITCHEN SINK QA.
