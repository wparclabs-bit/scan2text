# S11-FIX65 — Release Gate (Parts A–D)

FIX65 is the release gate for Phase 11. This file accumulates one section per
part (A, B, C, D). The baseline bump in `00-Current-State.md` happens only in
FIX65D.

---

## FIX65A Backend Gate

- **Date:** 2026-08-19
- **Slice:** S11-FIX65A-BACKEND-GATE-REBUILD (Part A of 4)
- **Status:** **BLOCKED**

### What completed before the block
- **Backend full suite:** `320 passed, 1 failed` — the single failure is the
  **pre-existing** `tests/test_health.py::test_health_contract`. No new failures.
  Matches the FIX63 baseline exactly. (py -3.12, `$env:PYTHONPATH="src"`.)
- **Pre-reads done:** AGENTS.md + `00-Current-State.md`. No source files read
  or edited beyond read-only inspection.

### Why BLOCKED
The slice requires "exactly one" PyInstaller spec file and verifies a rebuild
output at `dist/backend/scan2text-backend.exe`. Neither holds:

1. **Two `.spec` files exist** (slice expects one). The non-recursive discovery
   command (`Get-ChildItem -Force -Filter *.spec` from repo root) selects the
   **wrong** one:
   - `backend-spike.spec` (repo root) — leftover **spike**; entry
     `tools/spike_pyinstaller.py`; builds `backend-spike` (single-EXE, no
     `COLLECT`). NOT the production backend.
   - `packaging/scan2text-backend.spec` — the **real production spec**; entry
     `src/scan2text/cli.py`; `COLLECT name="scan2text-backend"` → folder-based
     onedir. Header: "PyInstaller spec for scan2text-backend.exe".
2. **Artifact path mismatch.** The slice verifies `dist/backend/scan2text-backend.exe`,
   but the production spec emits `dist/scan2text-backend/` (COLLECT name =
   `scan2text-backend`). No `dist/backend/` folder exists. Even picking the
   "correct" production spec cannot satisfy the verification path.

### Current `dist/` layout (observed, unmodified)
- `dist/scan2text-backend/` — folder-based onedir (stale FIX56 era), contains
  `scan2text-backend.exe` (~45 MB) + `_internal/` (pypdfium2_raw, llama_cpp, PIL, ...).
- `dist/scan2text-backend.exe` — loose 45 MB file at `dist/` root.
- No `dist/backend/`.

### Not done (per BLOCKED rule — no rebuild, no swap, no edits)
- PyInstaller rebuild: **not run** (ambiguous spec + wrong output path).
- Build exit code: N/A.
- `dist/backend/scan2text-backend.exe`: not produced.
- New backend SHA256: N/A (nothing rebuilt).

### Needs CEO decision (choose one)
- **A.** Authorize deleting the leftover `backend-spike.spec` (source/build-config
  edit, outside this GATE part) so exactly one spec remains, then re-run FIX65A.
- **B.** Confirm the intended output folder is `backend/` (rename the spec's
  `COLLECT`/`EXE` name) vs. keep `scan2text-backend/` and update the slice's
  verification path — then re-run FIX65A.
- Either way this is a build-config decision, so it belongs to a non-GATE part
  or an explicit CEO override, not to FIX65A (which is zero-edit).

### Recommended next step
CEO resolves the spec ambiguity + output-path expectation (options A/B above),
then re-run FIX65A. Backend test baseline remains valid (320 passed + 1
pre-existing) and can be reused without re-running the suite.

---

## FIX65A REV2 Backend Gate

- **Date:** 2026-08-19
- **Slice:** S11-FIX65A-BACKEND-GATE-REBUILD-REV2 (Part A of 4, revised)
- **Status:** **PASS**

### Preconditions
- `backend-spike.spec` (repo root): **absent** (CEO manually deleted).
- `packaging/scan2text-backend.spec`: **present** (production spec).

### Backend test result
- **Reused** (not re-run). Prior FIX65A gate result stands: `320 passed, 1 failed` —
  single failure is the **pre-existing** `tests/test_health.py::test_health_contract`,
  matching the FIX63 baseline. No new failures. No re-run needed.

### Rebuild
- Command: `py -3.12 -m PyInstaller packaging/scan2text-backend.spec --noconfirm --clean`
- **PyInstaller exit code: 0**
- Output: `dist/scan2text-backend/scan2text-backend.exe` (folder-based onedir, COLLECT).
- Artifact exists: **True**.

### New backend SHA256
- `CABFF88ACBD90A4784E21389E6D66F6EA6EE2BF80EF551ADBB6F759271FDEF05`
- Supersedes stale FIX56 hash `4EBD872A6563E3DE199D50A69A4DB904E0864D6F28A74C3D34B343C7DDA5F216`.

### Notes
- No source edits, no test edits, no spec edits, no file deletion, no dependency installs.
- No swap/deploy to `D:\Scan2Text` yet — that happens in FIX65D.
- Baseline bump in `00-Current-State.md` deferred to FIX65D.

---

## FIX65B Frontend Gate

- **Date:** 2026-08-19
- **Slice:** S11-FIX65B-FRONTEND-GATE-BUILD (Part B of 4)
- **Status:** **BLOCKED**

### Preconditions
- FIX65A REV2 checkpoint confirmed: **PASS** + backend SHA256
  `CABFF88ACBD90A4784E21389E6D66F6EA6EE2BF80EF551ADBB6F759271FDEF05`
  present in this file (FIX65A REV2 section).

### Tooling discrepancy (disclosed)
- The literal slice command `npm run test -- --reporter=compact` fails at
  **startup** before any test runs: vitest 4.1.1.10's built-in reporter map has
  no `compact` entry, and no custom `compact` reporter file exists in the repo,
  so vitest tries to load it as a custom module and errors
  (`Failed to load custom Reporter from compact`).
- Suite was therefore run with the AGENTS.md npm script **without** the stale
  flag: `npm run test` (= `vitest run --config vite.test.config.ts`).
- This is a docs/tooling discrepancy (AGENTS.md lists `-- --reporter=compact`),
  not a test failure, and does not affect results. Flagged for CEO: AGENTS.md
  table needs the stale reporter flag removed or a real compact reporter added.

### Frontend test result (official gate run)
- Command: `npm run test` (full suite, default reporter).
- **642 passed, 1 failed (643 total).** Test files: 36 passed, 1 failed (37).
- Exit code: 1. Expected per slice: 642 passed, 0 failures → **not met**.

### Failing test
- `src/App.test.tsx` → `Command Center layout` → `API URL construction via
  buildApiUrl` → `shows model-downloader-modal when first health response has
  files_present=false` (line 342).
- Assertion: `expect(modal).toBeInTheDocument()` —
  `[data-testid="model-downloader-modal"]` resolves to `null`.
- **Deterministic:** re-run in isolation (`npx vitest run src/App.test.tsx -t …`)
  also fails (1 failed, 30 skipped). Not flaky, not load-sensitive.
- No frontend source drift: `git status` shows no modified frontend files;
  working tree matches FIX63 commit `0673ef7`.

### Root-cause analysis (read-only; no edits made)
- App path is correct: `App.tsx` `checkModelStatus` → `files_present=false` →
  `POST /api/download/start` → `setShowDownloader(true)` →
  `<ModelDownloaderModal open={showDownloader}>`.
- The sibling test (`calls /api/download/start when health reports
  files_present=false`, line 320) **passes**, proving the App effect runs and
  the POST fires.
- The failure is in the **test mock** (`App.test.tsx` line 29):
  `const mockSetShowDownloader = vi.fn()` is a no-op that never mutates
  `_mockScan2TextStoreState`. So `setShowDownloader(true)` cannot flip
  `showDownloader` from `false`, and the modal can never render. The
  store-driven test (line 435) passes only because it assigns
  `_mockScan2TextStoreState = { jobs: {}, showDownloader: true }` directly.
- Conclusion: the FIX63 test `shows model-downloader-modal …` was introduced
  with a broken store mock and **cannot pass as written**. It was never caught
  earlier because the full suite was deferred to this gate (AGENTS.md
  clarification: CODE slices run targeted tests only).

### Not done (per STOP rule)
- `npm run typecheck`: **not run** (STOP after test failure).
- `npm run build`: **not run**. Build exit code: N/A.
- Build output folder (`frontend/dist`): **not confirmed** (build not run).
- No swap/deploy. No source/test/config edits. No dependency installs.

### Needs CEO decision (choose one)
- **A.** Authorize a FIX65B-fix slice (test edit, outside this zero-edit GATE
  part): make the mock setter mutate `_mockScan2TextStoreState`
  (e.g. `(v) => { _mockScan2TextStoreState = { ..._mockScan2TextStoreState,
  showDownloader: v } }`), re-run full suite, then continue FIX65B typecheck +
  build.
- **B.** Triage the App-level behavior as the defect instead (i.e. decide the
  modal should render by a different mechanism) — less likely given the
  store-driven test passes.
- Also decide: keep or remove `--reporter=compact` in the AGENTS.md command
  table (stale for vitest 4.1.1.10).

---

## FIX65B REV2 Frontend Gate

- **Date:** 2026-08-19
- **Slice:** S11-FIX65B-FRONTEND-GATE-BUILD-REV2 (Part B of 4, revised)
- **Status:** **PASS**

### Preconditions
- FIX65A REV2 checkpoint confirmed: **PASS** + backend SHA256
  `CABFF88ACBD90A4784E21389E6D66F6EA6EE2BF80EF551ADBB6F759271FDEF05`
  present in this file (FIX65A REV2 section).
- Commit `32a5b02` (S11-FIX65B-FIX: fix setShowDownloader mock) confirmed
  present — reactive mock setter now mutates `_mockScan2TextStoreState`.

### Frontend test result
- Command: `npm run test` (full suite, `vitest run --config vite.test.config.ts`).
- **643 passed, 0 failures (643 total).** Test files: 37 passed (37).
- Duration: 10.80s.
- Exit code: 0. **PASS.**

### Typecheck result
- Command: `npm run typecheck` (= `tsc -b`).
- **Zero TypeScript errors.** Exit code: 0. **PASS.**

### Build result
- Command: `npm run build` (= `tsc -b && vite build`).
- **Exit code: 0.** Build completed in 943ms.
- Build output folder confirmed: `frontend/dist/` present with
  `index.html`, `assets/`, `favicon.svg`, `icons.svg`.
- **PASS.**

### Notes
- No source edits, no test edits, no config edits, no dependency installs.
- The previous FIX65B BLOCK was resolved by the test-mock fix in commit
  `32a5b02`. All 643 tests now pass including the previously-failing
  `shows model-downloader-modal when first health response has files_present=false`.
- No swap/deploy to `D:\Scan2Text` — that happens in FIX65D.
- Baseline bump in `00-Current-State.md` deferred to FIX65D.

---

## FIX65C Rust Check + Tauri Build

- **Date:** 2026-08-19
- **Slice:** S11-FIX65C-RUST-CHECK-TAURI-BUILD (Part C of 4)
- **Status:** **BLOCKED**

### Preconditions
- FIX65A REV2 checkpoint confirmed: **PASS** + backend SHA256
  `CABFF88ACBD90A4784E21389E6D66F6EA6EE2BF80EF551ADBB6F759271FDEF05`
  present in this file (FIX65A REV2 section).
- FIX65B REV2 checkpoint confirmed: **PASS** (643 passed, 0 failures, typecheck
  clean, frontend/dist confirmed).
- `frontend/dist/` exists: **True** (confirmed in FIX65B REV2).

### Rust/Tauri type check
- Command: `cargo check --message-format=short` (from `frontend/src-tauri/`).
- **Zero errors.** Exit code: 0. **PASS.**
- Note: `cargo check` compiles the `dev` profile only; the `#[cfg(not(debug_assertions))]`
  code path (including `try_clone`) is NOT exercised in dev mode.

### Tauri build result
- Command: `npx tauri build --no-bundle` (from `frontend/`).
- **Exit code: 1. BUILD FAILED.**
- Frontend Vite build: **PASS** (exit 0, 957ms).
- Rust compilation (release profile): **FAIL**.

### Build error (last 10 lines)
```
   Compiling app_lib v0.1.0 (D:\WingAI\Projects\scan2text\frontend\src-tauri)
error[E0599]: no method named `try_clone` found for struct `Child` in the current scope
  --> src\backend_process.rs:68:39
   |
68 |             let watcher_child = child.try_clone().expect("failed to clone child handle");
   |                                       ^^^^^^^^^ method not found in `Child`

For more information about this error, try rustc --explain E0599.
error: could not compile `app_lib` (lib) due to 1 previous error
failed to build app: failed to build app
       Error failed to build app: failed to build app
```

### Root cause
Rust 1.97.1 (stable-x86_64-pc-windows-msvc) no longer has `std::process::Child::try_clone()`.
Standalone reproduction confirms the method is absent:
```
rustc 1.97.1 — `child.try_clone()` → E0599 in isolated test program.
```
Alternative methods tested: `duplicate()`, `clone_handle()`, `handle()` — all absent.
`as_handle()` exists (returns a handle reference), but replacing `try_clone()` with
`as_handle()` requires a source code edit, which is outside the scope of this
zero-edit GATE part.

### Not done (per BLOCKED rule — no edits)
- Shell executable rebuild: **not possible** (compiler error).
- Shell executable path: N/A (no new build output).
- Shell SHA256: N/A (no new executable produced).
- No source/test/config edits. No dependency installs. No swap/deploy.

### Needs CEO decision (choose one)
- **A.** Authorize a FIX65C-fix slice (Rust source edit): replace
  `child.try_clone()` in `backend_process.rs:68` with an equivalent that works
  in Rust 1.97.1 (e.g. using `as_handle()` + unsafe DuplicateHandle, or spawning
  the watcher thread before cloning), then re-run FIX65C build.
- **B.** Downgrade/switch Rust toolchain to a version where `try_clone()` still
  exists (requires rustup target/toolchain change — outside this GATE part).
- Either way this is a build-source decision, so it belongs to a non-GATE part
  or an explicit CEO override, not to FIX65C (which is zero-edit).

### Recommended next step
CEO authorizes a FIX65C-fix slice to patch `backend_process.rs:68`, then re-run
FIX65C. Backend and frontend gates remain valid and can be reused.

---

## FIX65C REV2 Rust Check + Tauri Build

- **Date:** 2026-08-19
- **Slice:** S11-FIX65C-RUST-CHECK-TAURI-BUILD-REV2 (Part C of 4, revised)
- **Status:** **PASS**

### Preconditions
- FIX65A REV2 checkpoint confirmed: **PASS** + backend SHA256
  `CABFF88ACBD90A4784E21389E6D66F6EA6EE2BF80EF551ADBB6F759271FDEF05`
  present in this file (FIX65A REV2 section).
- FIX65B REV2 checkpoint confirmed: **PASS** (643 passed, 0 failures, typecheck
  clean, frontend/dist confirmed).
- Commit `ac302c7` (S11-FIX65C1: replace removed `Child::try_clone` with
  health-endpoint polling) confirmed present — the Rust 1.97.1 compatibility
  fix is applied.
- `frontend/dist/` exists: **True** (confirmed in FIX65B REV2).

### Rust/Tauri type check
- Command: `cargo check --release --message-format=short` (from `frontend/src-tauri/`).
- **Zero errors.** 1 warning (dead_code: `spawn_creation_flags` unused) — acceptable.
- Exit code: 0. **PASS.**

### Tauri build result
- Command: `npx tauri build --no-bundle` (from `frontend/`).
- **Exit code: 0. BUILD SUCCESS.**
- Frontend Vite build: **PASS** (exit 0, 7.65s).
- Rust compilation (release profile): **PASS** (28.35s).

### Shell executable
- Path confirmed: `frontend\src-tauri\target\release\Scan2Text.exe`
- **Exists: True.**

### Shell SHA256
- `2F444F0E18BD219FF8530330D71D83D0C9757D1BD122F40E1706B10A84C0E2A8`
- Supersedes stale FIX65C hash `BFA7535715C23FF830F375BFC1CCA6F27A386CCC82BFB32B013E7D38A2B4DF50`.

### Notes
- No source edits, no test edits, no config edits, no dependency installs.
- The previous FIX65C BLOCK was resolved by the try_clone fix in commit
  `ac302c7`. The release build now compiles successfully.
- No swap/deploy to `D:\Scan2Text` — that happens in FIX65D.
- Baseline bump in `00-Current-State.md` deferred to FIX65D.
