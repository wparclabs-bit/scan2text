# Environment & Build Configuration

> **Generated:** 2026-09-03

---

## 1. Required Runtimes

| Runtime | Version | Notes |
|---------|---------|-------|
| Python | 3.12 (locked) | Never use bare `python`; always `py -3.12` |
| Node.js | ≥ 18 | For Vite, Tauri CLI |
| Rust | ≥ 1.70 | For Tauri compilation |
| pnpm | ≥ 8 | Package manager |

---

## 2. Project Structure

```
D:\WingAI\Projects\scan2text\
├── frontend/                    # Tauri + React frontend
│   ├── src-tauri/              # Rust shell
│   │   ├── src/
│   │   │   ├── main.rs         # Entry point
│   │   │   ├── lib.rs          # App setup
│   │   │   └── backend_process.rs  # Backend management
│   │   ├── tauri.conf.json     # App config
│   │   ├── Cargo.toml          # Rust deps
│   │   └── capabilities/       # Permission caps
│   └── src/                    # React app
│       ├── main.tsx            # React entry
│       ├── App.tsx             # Root component
│       ├── components/         # UI components
│       ├── stores/             # Zustand stores
│       ├── lib/                # Utilities
│       ├── hooks/              # React hooks
│       └── locales/            # i18n files
├── src/scan2text/              # Python backend
│   ├── api/                    # FastAPI app
│   ├── adapters/               # OCR engines
│   ├── routes/                 # API routes
│   ├── services/               # Business logic
│   ├── models/                 # Pydantic models
│   └── utils/                  # Utilities
├── packaging/                  # PyInstaller specs
│   └── scan2text-backend.spec
├── scripts/                    # Build scripts
├── dev.ps1                     # Dev startup
├── pytest.ini                  # Pytest config
└── second-brain/               # Obsidian vault (local-only; gitignored; NOT published)
```

---

## 3. Development Commands

### 3.1 Unified Dev Mode

```powershell
# From repo root
.\dev.ps1
```

**What it does:**
1. Checks port 47351 occupancy (fails if occupied)
2. Starts Python backend: `py -3.12 -m uvicorn scan2text.api.main:app --host 127.0.0.1 --port 47351`
3. Waits for health check (30s timeout)
4. Launches Tauri dev mode: `npx tauri dev`
5. Cleanup trap kills backend on exit

### 3.2 Frontend-Only Development

```powershell
cd frontend
npm run dev          # Vite dev server on :5173
npm run build        # Production build
npm run test         # Vitest tests
npm run typecheck    # TypeScript check
npm run lint         # Oxlint
```

### 3.3 Backend-Only Development

```powershell
$env:PYTHONPATH="src"
py -3.12 -m uvicorn scan2text.api.main:app --host 127.0.0.1 --port 47351
```

### 3.4 Backend Testing

```powershell
$env:PYTHONPATH="src"
py -3.12 -m pytest -q --tb=line
```

### 3.5 Rust/Tauri Checks

```powershell
cd frontend/src-tauri
cargo check --message-format=short
cargo test
```

---

## 4. Build Artifacts

### 4.1 Frontend Build

```powershell
cd frontend
npm run build
# Output: frontend/dist/
```

### 4.2 Backend Build (PyInstaller)

```powershell
py -3.12 -m PyInstaller packaging/scan2text-backend.spec
# Output: dist/scan2text-backend/
```

**Spec Details** (`packaging/scan2text-backend.spec`):
- Entry point: `src/scan2text/cli.py`
- Collection: `llama_cpp`, `PIL`, `pypdfium2`, `pypdfium2_raw`
- Excludes: `pytest`, `unittest`, `tkinter`, `matplotlib`, `pyarrow`, `pandas`
- Output mode: `onedir` (folder-based, required for pypdfium2_raw)

### 4.3 Tauri Build

```powershell
cd frontend
npx tauri build
# Output: frontend/src-tauri/target/release/bundle/
```

---

## 5. Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `SCAN2TEXT_HOME` | Override portable root | Auto-detected |
| `SCAN2TEXT_MODELS_DIR` | Override models location | `{home}/models` |
| `PYTHONPATH` | Backend source path (dev) | `src` |

---

## 6. Port Configuration

**Unified Port:** `47351`

**Locations (change together):**
1. `frontend/src-tauri/src/backend_process.rs:13` — `BACKEND_PORT`
2. `frontend/src/lib/apiBase.ts:2` — `getApiBaseUrl()`
3. `src/scan2text/utils/prod_runtime.py:31-32` — `get_port()`

**Dev Proxy:** `frontend/vite.config.ts:11-15`
```typescript
proxy: {
  '/api': {
    target: 'http://127.0.0.1:47351',
    changeOrigin: true,
  },
}
```

---

## 7. Dependencies

### 7.1 Frontend (package.json)

**Runtime:**
- `react` ^19.2.8
- `react-dom` ^19.2.8
- `zustand` ^5.0.14
- `react-i18next` ^17.0.11
- `i18next` ^26.3.6
- `tailwindcss` ^3.4.19
- `@tailwindcss/typography` ^0.5.16
- `lucide-react` ^1.28.0
- `sonner` ^2.0.7
- `react-markdown` ^10.1.0
- `remark-gfm` ^4.0.1
- `@tauri-apps/api` ^2.11.1
- `@radix-ui/*` (dialog, scroll-area, tooltip, etc.)

**Dev:**
- `vite` ^8.2.0
- `typescript` ~6.0.2
- `vitest` ^4.1.10
- `jsdom` ^30.0.1
- `@vitejs/plugin-react` ^6.0.4
- `oxlint` ^1.75.0

### 7.2 Backend (pyproject.toml / requirements)

**Runtime:**
- `fastapi` >= 0.100.0
- `uvicorn` >= 0.23.0
- `pydantic` >= 2.0.0
- `llama-cpp-python` (CPU-only)
- `pypdfium2` (PDF rendering)
- `Pillow` (image processing)
- `psutil` (process management)

**Dev/Test:**
- `pytest` >= 7.0.0
- `pytest-asyncio` >= 0.21.0

### 7.3 Rust (Cargo.toml)

- `tauri` ^2.11.3
- `tauri-plugin-log` ^2
- `tauri-plugin-shell` ^2
- `serde` ^1 (with derive)
- `serde_json` ^1
- `log` ^0.4

---

## 8. Testing Strategy

### 8.1 Frontend Tests (Vitest)

```powershell
cd frontend
npm run test              # Run all tests
npm run test:watch        # Watch mode
```

**Configuration:** `vite.test.config.ts`
- Environment: `jsdom`
- Coverage: V8
- Setup: `src/test-setup.ts`

**Test Patterns:**
- Component tests with `@testing-library/react`
- Store tests with mocked API
- i18n tests with `initI18n()`
- Theme/palette lock tests

### 8.2 Backend Tests (Pytest)

```powershell
$env:PYTHONPATH="src"
py -3.12 -m pytest -q --tb=line
```

**Configuration:** `pytest.ini`
- Test paths: `tests/`
- Async support: `pytest-asyncio`

---

## 9. Build Verification

### 9.1 Pre-Build Checklist

- [ ] `npm run typecheck` — Zero TypeScript errors
- [ ] `npm run lint` — Zero lint errors
- [ ] `npm run test` — All tests passing
- [ ] `cargo check` — Rust compilation clean

### 9.2 Post-Build Verification

```powershell
# Verify portable layout
Get-ChildItem -Path . -Recurse -Name | Where-Object { $_ -match '\.(exe|dll|gguf)$' }

# Verify backend entry point
.\dist\scan2text-backend\scan2text-backend.exe --help
```

---

## 10. Deployment

### 10.1 Release Process

1. Update version in:
   - `frontend/package.json`
   - `frontend/src-tauri/Cargo.toml`
   - `README.md`
   - `docs/ARCHITECTURE.md`

2. Build artifacts:
   ```powershell
   cd frontend && npx tauri build
   py -3.12 -m PyInstaller packaging/scan2text-backend.spec
   ```

3. Package portable ZIP:
   ```powershell
   .\scripts\package-portable.ps1
   ```

4. Upload to GitHub Releases:
   - Asset: `Scan2Text-v{version}-Portable-Full.zip`
   - Include: `Scan2Text.exe`, `backend/`, `models/`, `README.md`

### 10.2 Version Manifest

**Location:** GitHub Releases assets

**Format:** `version.json`
```json
{
  "current": "1.1.0",
  "latest": "1.1.0",
  "vlm_download_url": "https://github.com/wparclabs-bit/scan2text/releases/download/v1.1/...",
  "vlm_sha256": "0000000000000000000000000000000000000000000000000000000000000000",
  "vlm_size_bytes": 0,
  "mmproj_download_url": "https://github.com/wparclabs-bit/scan2text/releases/download/v1.1/...",
  "mmproj_sha256": "0000000000000000000000000000000000000000000000000000000000000000",
  "mmproj_size_bytes": 0
  "notes": "Release notes...",
  "model_version": "1.0.0"
}
```

---

## 11. Troubleshooting

### 11.1 Common Issues

| Issue | Solution |
|-------|----------|
| Port 47351 occupied | Kill process: `taskkill /F /IM scan2text-backend.exe /T` |
| Backend won't start | Check `logs/backend-boot.log` |
| Model not found | Run model download from UI |
| Type errors | Run `npm run typecheck` |
| Test failures | Run specific test: `npm run test -- src/stores/scan2text.store.test.ts` |

### 11.2 Log Locations

| Log | Path |
|-----|------|
| Backend boot | `logs/backend-boot.log` |
| Application | `logs/app.log` |
| Tauri dev | Console output |

---

## 12. API Reference

See [02_IPC_AND_API_CONTRACTS.md](./02_IPC_AND_API_CONTRACTS.md) for detailed API schemas.
