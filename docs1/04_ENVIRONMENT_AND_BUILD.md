# 04 — Environment, Dependencies & Build Pipeline

> Master reference: [`ARCHITECTURE.md`](./ARCHITECTURE.md) · Siblings: [01_FILE_MATRIX](./01_FILE_MATRIX.md) · [02_IPC_AND_API_CONTRACTS](./02_IPC_AND_API_CONTRACTS.md) · [03_DATA_FLOWS](./03_DATA_FLOWS.md)

## 1. Runtimes & Toolchain

| Tool | Version constraint | Why / where |
|---|---|---|
| Windows | x64, Windows 10/11 | Tauri WebView2 + Windows-only `CommandExt`/taskkill logic |
| Node.js + npm | any modern LTS running Vite 8 toolchain | `frontend/` |
| Python | **strictly `py -3.12`** — never bare `python` | `llama-cpp-python` native wheels availability locked to 3.12 (`pyproject requires-python >=3.11`, but CEO lock = 3.12); PyInstaller bundle is `cp312-win_amd64` (see `backend/_internal/*.pyd`) |
| Rust toolchain (cargo) | stable; edition 2021; tauri 2.x build needs MSVC + WebView2 | `frontend/src-tauri/Cargo.toml` |
| PowerShell | 5.1+ (CEO-locked: PowerShell only, no bash) | all `scripts/*.ps1` |
| Frontend dev server | Vite on `http://localhost:5173` | `tauri.conf.json devUrl` |

## 2. Dependency Manifests

### 2.1 Python (`pyproject.toml`)
Runtime pins: `fastapi>=0.115`, `uvicorn[standard]>=0.34`, `pydantic>=2.9`, `python-multipart>=0.0.9`, `llama-cpp-python>=0.3.7,<0.4`, `pypdfium2>=4.30`, `pillow>=10.0`, `requests>=2.32`, `click>=8.1`, `psutil>=6.0`.
Dev extras (`[project.optional-dependencies].dev`): `pytest>=8.3`, `httpx>=0.28` (FastAPI TestClient), `pytest-asyncio>=0.24`, `pyinstaller>=6.10`.
Build backend setuptools≥68; packages discovered under `src/`.

Roles: fastapi+uvicorn = HTTP layer; pydantic = schemas; python-multipart = multipart `/process`; llama-cpp-python = Ovis GGUF inference (mtmd multimodal); pypdfium2 = PDF raster (`pdfium.dll` shipped in `_internal/pypdfium2_raw`); pillow = image normalize/crops; psutil = health telemetry, boot guard, CPU budget; requests = update check.

### 2.2 Frontend (`frontend/package.json`) — key deps
- Runtime: `react@^19.2.8`, `react-dom`, `zustand@^5.0.14`, `@tauri-apps/api@^2.11.1`, `@tauri-apps/plugin-shell@^2.3.5`, `i18next@^26` + `react-i18next@^17`, `react-markdown@^10` + `remark-gfm@^4` (preview), `sonner@^2` (toasts), `lucide-react`, Radix (`react-dialog/label/scroll-area/slot/tooltip`), `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss@^3.4.19` (**v3, never v4**), `autoprefixer`.
- Dev/test: `vite@^8.2.0`, `vitest@^4.1.10` + coverage-v8, `@testing-library/{react,jest-dom,dom,user-event}`, `jsdom@^30`, `typescript@~6.0.2`, `oxlint`, `@tauri-apps/cli@^2.11.4`, `@tailwindcss/typography@^0.5.16`.

Scripts: `dev` (vite) · `build` (`tsc -b && vite build`) · `lint` (oxlint) · `test` (`vitest run --config vite.test.config.ts`; add `-- --reporter=compact`) · `typecheck` (`tsc -b`) · `tauri`.

### 2.3 Rust (`frontend/src-tauri/Cargo.toml`)
`tauri = { version = "2.11.3" }`, `tauri-plugin-log = "2"` (debug builds), `tauri-plugin-shell = "2"` (GForm/open), `serde`/`serde_json`, `log 0.4`; build-dep `tauri-build = 2.6.3`. Crate name `app_lib`; binary `Scan2Text`.

## 3. Environment Variables

| Variable | Set/read by | Effect |
|---|---|---|
| `CARGO_MANIFEST_DIR` | read in `backend_process.rs::resolve_backend_path` | locates repo-root `backend/scan2text-backend.exe` during non-installed runs |
| Frozen detection `sys.frozen` | set by PyInstaller; read by `prod_runtime.is_frozen()` | switches port 8000→47351 and path resolution to exe dir |
| No other env vars required at runtime — configuration is file-based: `settings.json` (user config) and root `version.json` (download manifest). Models resolved via `PathService.resolve_model_path` priority (settings override → portable `models/` dir chain). | | |

## 4. Local Development

PowerShell only. Two shells:

```powershell
# Shell A — backend (dev port 8000)
$env:PYTHONPATH="src"; py -3.12 -m uvicorn scan2text.api.main:app --host 127.0.0.1 --port 8000
#   or entry point module:
$env:PYTHONPATH="src"; py -3.12 -m scan2text.cli          # frozen→47351 else 8000
# or use the helper script:
.\dev.ps1                                                   # orchestrates backend + checks

# Shell B — frontend (Vite :5173) + optional Tauri window
cd frontend ; npm run dev            # web-only UI against relative API base ('')
.\dev-web.ps1                        # helper script variant
cd frontend ; npx tauri dev          # full desktop shell (debug build skips backend spawn)
```

Dev-mode contract: debug Tauri builds do **not** spawn the backend (`cfg!(debug_assertions)` early-returns in `backend_process.rs`) — dev.ps1 owns uvicorn on :8000; `apiBase.ts` uses origin-relative URLs when not PROD.

## 5. Test / Lint / Verify Commands

```powershell
cd frontend
npm run test                                # Vitest once (all suites)
npm run test -- --reporter=compact
npx vitest run src/lib/naming.test.ts       # targeted single file during RED/GREEN
npm run typecheck                           # tsc -b, must be zero errors
npm run lint                                # oxlint

# Backend (repo root)
$env:PYTHONPATH="src"; py -3.12 -m pytest -q --tb=line
py -3.12 -m pytest tests/test_api.py -q     # targeted

# Rust
cd frontend/src-tauri ; cargo check --message-format=short
cargo test                                  # backend_manager_tests.rs, backend_lifecycle.rs
```

Testing gotchas encoded in `AGENTS.md`: jsdom does no layout math; `data-testid`/`data-state` attributes everywhere testable; mock `navigator.clipboard`; react-markdown splits text → assert `container.textContent`; inject i18n via `initI18n()`.

## 6. Production Build & Packaging Pipeline

1. **Frontend bundle** — `npm run build` in `frontend/` → `tsc -b` typecheck then `vite build` → `frontend/dist/`.
2. **Backend freeze** — `scripts/build-backend.ps1` runs `pyinstaller packaging/scan2text-backend.spec` (entrypoint `src/scan2text/cli.py`) producing folder-based artifact staged as portable `backend/scan2text-backend.exe` + `_internal\` (pypdfium2_raw/pdfium.dll, llama_cpp DLLs ggml/llama/mtmd, PIL, numpy/OpenBLAS, cryptography-rust, tzdata…). Spec asserts verified by `tests/test_packaging_spec.py`. `onefile` is NOT used — folder layout is the portable contract.
3. **Desktop shell** — `npx tauri build` compiles crate `app_lib`/bin `Scan2Text`; `tauri.conf.json` embeds `../dist` as frontendDist and declares `"resources": ["../../backend"]` so the backend folder ships beside the exe.
4. **Portable assembly** — `scripts/package-portable.ps1 [-Version v1.1] [-SkipBuild] [-OutputDir <path>]`:
   - stages `.staging-portable/`,
   - produces **Thin** ZIP `Scan2Text-v1.1-Portable.zip` (~81 MB, excludes models/) and **Full** ZIP (~1.1 GB incl. models/),
   - copies `version.json` into both roots (required by ModelDownloaderService),
   - creates empty `logs/ output/ feedback/` dirs (excluded from archive contents).
5. **Distribution** — GitHub Releases hosts binaries; `version.json` on GitHub drives runtime model download (URLs under `github.com/wPAILabs/scan2text/releases/download/OCR/...`). Monthly cadence per ADR-007.
6. **Post-build verification** — `scripts/verify-portable.ps1` (layout/smoke checks).

## 7. Portable Runtime Layout (locked)

```
Scan2Text-vX.Y-Portable/
├── Scan2Text.exe                    ← Tauri shell (desktop entry)
├── version.json                     ← downloader manifest (both Thin/Full)
├── settings.json                    ← created/used by SettingsService
├── backend/
│   ├── scan2text-backend.exe        ← PyInstaller folder-based artifact
│   └── _internal/                   ← pypdfium2_raw, llama_cpp lib DLLs, tzdata, …
├── models/                          ← external; downloaded at runtime if absent
├── output/  logs/  feedback/        ← generated at runtime (empty in ZIP)
└── uploads/                         ← staging for /process uploads (UPLOADS_DIR)
```

**NEVER** use `dist/` as a runtime path reference; `resolve_backend_path()` walks parents from `current_exe()` to find `backend/scan2text-backend.exe`, matching this layout exactly.

## 8. Gotchas Matrix

| Gotcha | Detail |
|---|---|
| Python 3.12 lock | bare `python` may be 3.14+ without `llama-cpp-python` wheels → always `py -3.12` |
| Tailwind version lock | Tailwind **v3** with `postcss.config.js`/`tailwind.config.js` v3 format; `index.css` must start with the three `@tailwind` directives; installing v4 breaks palette-lock tests |
| Port binding | backend always binds `127.0.0.1` (local-first); prod port 47351 is a fixed constant shared by Rust (`BACKEND_PORT`) and TS (`apiBase.ts`) and Python (`prod_runtime.get_port()`) — change all three together |
| Kill semantics | stop uses `taskkill /IM scan2text-backend.exe /T` (image name), because `/PID` leaves the PyInstaller daemon child alive |
| Dev vs prod ports | dev 8000 (uvicorn via dev.ps1), prod 47351 (frozen); `boot_guard` prevents double-start |
| Debug skips spawn | in `cargo tauri dev` the Rust side intentionally never spawns the backend |
