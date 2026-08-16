# ADR-008 — Desktop shell and packaging: Tauri v2 supersedes pywebview

Status: APPROVED (CEO signed 2026-08-13) · Phase: 7

## Context

PRD-03 section 11 and section 12 specified pywebview for the desktop window and "PyInstaller or equivalent" for packaging. The 2026-08-11 PyInstaller spike proved llama-cpp-python bundles cleanly via --collect-all and recommended Tauri (Electron not required). Phase 7 then installed Tauri v2 dev-mode plumbing (S9.1b), built the folder-based PyInstaller backend artifact (S9.2a), and wired Tauri-managed backend lifecycle with an explicit exit hook (FIX-S9.3). The pywebview-to-Tauri decision was implemented but never captured as an ADR, so PRD-03 still says pywebview.

## Decisions

1. Desktop shell = Tauri v2 (Rust). NOT pywebview, NOT Electron. Tauri provides the native window and bundles the built React frontend.
2. Backend = PyInstaller FOLDER-BASED standalone artifact at dist/scan2text-backend/scan2text-backend.exe. NOT one-file PyInstaller.
3. Backend lifecycle is owned by Tauri: process handle stored in Tauri-managed state; explicit shutdown hook on app exit; kill + bounded wait + port-47351 verification + Windows process-tree kill escalation. NOT Drop/RAII-only cleanup.
4. Production backend binds 127.0.0.1:47351 (host 127.0.0.1, port 47351). NOT port 8000.
5. Frontend-to-backend transport: dev uses the Vite proxy (/api); production calls http://127.0.0.1:47351/api directly via the apiBase resolver.
6. Models (vlm.gguf, mmproj.gguf) remain EXTERNAL and are downloaded into models/ at runtime. NOT bundled into the executable.

## Consequences

- Tauri v2 gives a small native shell over WebView2 and supports bundling the C++ llama.cpp engine (spike-proven), avoiding Electron bloat.
- Folder-based artifact avoids one-file extraction overhead and keeps the backend portable and inspectable.
- Tauri-owned lifecycle guarantees no orphan backend on X-close (FIX-S9.3 manually verified: process gone, port released).
- Port 47351 avoids clashes with common dev ports (8000, 5173).
- External models keep the exe small and let the in-app downloader (ADR-007) manage acquisition.

## Open / Pending

- Final Tauri production bundling method (how dist/scan2text-backend/ is packaged into the final Scan2Text.exe bundle) is NOT locked. Capture in a follow-up ADR or amendment once decided.

## Supersedes

PRD-03 section 11 "opens the UI in a native desktop window (pywebview)"; PRD-03 section 12 "pywebview; PyInstaller or equivalent". Does not supersede ADR-006 or ADR-007.

## Addendum 2026-08-16 (Phase 10 closure — CEO-approved)

(a) **CORS `allow_origins=["*"]` is safe.** Backend binds `127.0.0.1` only (Decision 4 above); it is not reachable from any external host or network interface. This satisfies NFR-02 (local-first, no cloud upload, no external access). The wildcard is scoped to the loopback transport and does not weaken the local-first privacy guarantee.

(b) **Backend child spawned with `CREATE_NO_WINDOW` (0x08000000).** On Windows, the Rust Tauri shell uses `CommandExt::creation_flags(0x08000000)` when spawning the PyInstaller backend process, suppressing any console window. The Rust-spawned backend itself is invisible; Python multiprocessing worker processes (3 total PIDs) are expected and are not fixable from Rust per NON-GOALS.

(c) **Topology:** 1 Rust-spawned backend child + Python `multiprocessing` worker children expected. `[Errno 10048]` losers exit cleanly — the Tauri lifecycle hook kills the backend process tree on app exit; orphaned Python workers are cleaned up by the OS.
