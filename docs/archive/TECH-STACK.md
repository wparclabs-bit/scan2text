# Tech Stack

Versions from the repository manifests (`frontend/package.json`, `pyproject.toml`,
`frontend/src-tauri/Cargo.toml`). Declared ranges are shown verbatim; resolved versions noted
where available.

## Frontend (`frontend/package.json`)

**Production dependencies**

| Package | Declared Range |
|---|---|
| react | ^19.2.8 |
| react-dom | ^19.2.8 |
| react-i18next | ^17.0.11 |
| react-markdown | ^10.1.0 |
| remark-gfm | ^4.0.1 |
| zustand | ^5.0.14 |
| sonner | ^2.0.7 |
| tailwind-merge | ^3.6.0 |
| i18next | ^26.3.6 |
| lucide-react | ^1.28.0 |
| class-variance-authority | ^0.7.1 |
| clsx | ^2.1.1 |
| tailwindcss | ^3.4.19 |
| @radix-ui/react-dialog | ^1.1.23 |
| @radix-ui/react-label | ^2.1.15 |
| @radix-ui/react-scroll-area | ^1.2.18 |
| @radix-ui/react-slot | ^1.3.3 |
| @radix-ui/react-tooltip | ^1.2.16 |
| @tauri-apps/api | ^2.11.1 |
| autoprefixer | ^10.5.4 |

**Development dependencies (build/test relevant)**

| Package | Declared Range |
|---|---|
| typescript | ~6.0.2 |
| vite | ^8.2.0 |
| vitest | ^4.1.10 |
| jsdom | ^30.0.1 |
| @testing-library/react | ^16.3.2 |
| @testing-library/jest-dom | ^7.0.0 |
| @testing-library/user-event | ^14.6.3 |
| @testing-library/dom | ^10.4.1 |
| @vitejs/plugin-react | ^6.0.4 |
| @vitest/coverage-v8 | ^4.1.10 |
| @tauri-apps/cli | ^2.11.4 |
| @tailwindcss/typography | ^0.5.16 |
| oxlint | ^1.75.0 |

## Backend (`pyproject.toml`, Python)

Declared constraints from `pyproject.toml`; resolved versions noted where available.

| Package | Declared | Resolved |
|---|---|---|
| fastapi | >=0.115 | 0.141.1 |
| uvicorn[standard] | >=0.34 | 0.52.0 |
| pydantic | >=2.9 | 2.13.4 |
| llama-cpp-python | >=0.3.7, <0.4 | 0.3.34 |
| pypdfium2 | >=4.30 | 5.12.1 |
| pillow | >=10.0 | [VERIFY: resolved version not recorded in fact pack] |
| requests | >=2.32 | [VERIFY: resolved version not recorded in fact pack] |
| click | >=8.1 | [VERIFY: resolved version not recorded in fact pack] |
| psutil | >=6.0 | [VERIFY: resolved version not recorded in fact pack] |
| python-multipart | >=0.0.9 | [VERIFY: resolved version not recorded in fact pack] |
| pyinstaller (dev) | >=6.10 | 6.22.0 |
| pytest (dev) | >=8.3 | [VERIFY: resolved version not recorded in fact pack] |
| httpx (dev) | >=0.28 | [VERIFY: resolved version not recorded in fact pack] |
| pytest-asyncio (dev) | >=0.24 | [VERIFY: resolved version not recorded in fact pack] |

Python requirement: `>=3.11` in manifest; project locked to `py -3.12` launcher — never bare
`python`.

## Rust shell (`frontend/src-tauri/Cargo.toml`)

| Crate | Version |
|---|---|
| tauri | 2.11.3 (feature: ``) |
| tauri-build | 2.6.3 |
| tauri-plugin-log | 2 |
| serde | 1 (features: derive) |
| serde_json | 1 |
| log | 0.4 |

Edition 2021; library crate `app_lib`; binary `Scan2Text` from `src/main.rs`. App version
declared in `tauri.conf.json` as 1.0.0.

## ML models

| File | Quantization | Size | Role |
|---|---|---|---|
| `models/vlm.gguf` | Q8_0 | 811 MB | OvisOCR2 0.9B vision-language model |
| `models/mmproj.gguf` | f16 | 205 MB | Multimodal projector paired with vlm.gguf |

Base model: OvisOCR2 0.9B (ATH-MaaS, Apache-2.0); GGUF quantization by bartowski. Runtime:
llama-cpp-python, CPU-only. Models are external release assets, downloaded at first run and
never committed. Attribution: [NOTICE.md](../NOTICE.md).

## Locked choices and why

- **CPU-only offline inference.** Target users run CPU-only Windows machines with unstable or no
  internet. llama-cpp-python executes the GGUF models on CPU; no GPU code path exists.
- **Tailwind v3 locked (3.4.19). v4 forbidden.** The theme system (Coffee & Paper palette, dark
  `.dark` class strategy, typography plugin) is built and tested against the v3 PostCSS pipeline;
  upgrading to v4 is out of scope.
- **Python locked to `py -3.12`.** `requires-python = ">=3.11"` in manifest; project uses the
  `py -3.12` launcher — newer system defaults lack native wheels for llama-cpp-python, so every
  command pins the launcher.
- **Zustand memory-only jobs.** Queue state lives in memory only (`jobOrder[]` FIFO, one active
  job). Jobs never persist to disk or localStorage; only theme and language preference persist.
- **Markdown-output-first boundary.** The product ends at `.md` files. No editing, no DOCX/XLSX
  export, no rich-text rendering beyond the read-only preview — editing happens in external tools.
