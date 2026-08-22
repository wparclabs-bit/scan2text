# Build and Release

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Python | 3.12 via the `py -3.12` launcher | Never bare `python`; newer defaults lack llama-cpp-python wheels |
| Node.js + npm | [VERIFY: pinned Node version] | For the frontend build and Tauri CLI |
| Rust toolchain | [VERIFY: pinned toolchain] | Edition 2021 crates |

Install dependencies: `npm install` in `frontend/`; backend dependencies come from `pyproject.toml`
(`pip install -e ".[dev]"` in a 3.12 environment). Note: building `llama-cpp-python` on Windows can
require C++ build tools; the historical README recommends pre-built CPU wheels when compilation
fails [VERIFY: wheel index still current].

## Verify before shipping

| Gate | Command |
|---|---|
| Frontend types | `npm run typecheck` |
| Frontend tests | `npm run test` |
| Backend tests | `py -3.12 -m pytest -q --tb=line` |
| Rust | `cargo check --message-format=short` |

## Backend build (PyInstaller)

Build the folder artifact from the spec:

```
py -3.12 -m PyInstaller packaging/scan2text-backend.spec --noconfirm
```

The result is a folder containing `scan2text-backend.exe` plus its `_internal/` dependencies
(pypdfium2 raw libraries, Python runtime). This folder becomes `<app-root>/backend/`. Never point
the runtime at a `dist/` path.

## Shell build (Tauri)

1. Build the frontend: `npm run build` (Vite).
2. Build the desktop shell with the pinned Tauri CLI (produces `Scan2Text.exe`):

```
npx tauri build
```

[VERIFY: exact build script/command of record.]

## Portable deploy layout

Assemble the portable root exactly as documented in [RUNTIME-LAYOUT.md](RUNTIME-LAYOUT.md):
`Scan2Text.exe` and `backend/` side by side at the root, with empty `models/`, `output/`, `logs/`,
and `feedback/` folders created by the app on first run. Zip the root **without** models.

## Release flow

1. Tag the release; cut application ZIP and the two model files.
2. Upload to Google Drive: the application ZIP, `vlm.gguf` (811 MB), and `mmproj.gguf` (205 MB).
   Models total roughly 1 GB and are **never committed** — `/models/` and `*.gguf` are gitignored,
   and models ship exclusively as external release assets.
3. Publish `version.json` to GitHub with the update contract fields (`current`, `latest`,
   `download_url`, `notes`, `model_version`) plus the SHA256 manifest for the downloadable
   artifacts. The app verifies SHA256 (streaming to `.part`, atomic rename after size check)
   before using any download.
4. Releases follow a monthly cadence; the in-app check is launch-only, optional, and never
   self-updates — users download manually.

**Google Drive caveat:** files above the virus-scan threshold trigger Google Drive's
"This file is large — download anyway" interstitial, and naive "direct download" URL forms can
break for large binaries. Validate the exact `download_url` format stored in `version.json`
against the interstitial before publishing. [VERIFY: confirmed working URL format per release]

## Post-release smoke check

On a clean machine: unzip, launch `Scan2Text.exe`, confirm first-run model download completes and
SHA256 passes, drop one image and one PDF, confirm two `.md` files in `output/`, close the app and
confirm no leftover backend process on port 47351.
