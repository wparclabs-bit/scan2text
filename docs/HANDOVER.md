# Scan2Text — Master Handover & Boot Prompt

> **Version:** 1.1.0  
> **Last Updated:** 2026-09-04  
> **SSOT:** `docs/ARCHITECTURE.md`

---

## Boot Prompt

Feed this exact text to any new AI agent or human developer on session start:

```
You are joining the Scan2Text project at D:\WingAI\Projects\scan2text.
Read these documents IN ORDER before doing anything else:
1. AGENTS.md — Agent operating manual (engineering rules, locked decisions)
2. second-brain/00-Current-State.md — Current phase, test counts, recent changelog
3. docs/ARCHITECTURE.md — Master architecture reference

After reading, state: "Loaded. Current phase: [N]. Status: [COMPLETE/READY/BLOCKED]."
Then await your slice prompt.
```

---

## Reading Order

Strict sequence for any new agent or developer:

1. **`AGENTS.md`** — Operating manual: paths, commands, engineering rules, locked decisions, lessons learned
2. **`second-brain/00-Current-State.md`** — Current phase, test baselines, recent changelog (last 5 entries)
3. **`docs/ARCHITECTURE.md`** — Single source of truth for architecture: repo topology, layers, contracts, data flows
4. **`docs/01_FILE_MATRIX.md`** — Complete file ledger
5. **`docs/02_IPC_AND_API_CONTRACTS.md`** — API schemas and IPC contracts
6. **`docs/03_STATE_AND_PERSISTENCE.md`** — State management details
7. **`docs/04_SECURITY_AND_PRIVACY.md`** — Security audit findings
8. **`docs/05_DATA_FLOWS.md`** — Sequence diagrams
9. **`docs/06_ENVIRONMENT_AND_BUILD.md`** — Build instructions and environment setup

> **Note:** PRD docs are now public at `docs/product/` (moved from `second-brain/04-Product/`). Read only if explicitly listed in a slice prompt.

---

## Locked Facts

### Environment
- **Python:** `py -3.12` — NEVER bare `python`. System default may be 3.14+ lacking native wheels.
- **OS:** Windows (PowerShell only). No bash/grep/tail/ls — use `Select-String`, `Get-Content`, `Get-ChildItem -Force`.
- **CPU-only:** No GPU support. Uses `llama-cpp-python` with GGUF models.
- **Port:** `47351` — hardcoded in three places that MUST change together:
  - `frontend/src-tauri/src/backend_process.rs` (BACKEND_PORT const)
  - `frontend/src/lib/apiBase.ts` (getApiBaseUrl)
  - `src/scan2text/utils/prod_runtime.py` (get_port)

### Architecture
- **Shell:** Tauri 2.11 (Rust), fixed `inset-0` kiosk layout
- **Frontend:** React 19 + TypeScript 6 + Vite 8 + Zustand 5
- **Backend:** FastAPI + Uvicorn, binds `127.0.0.1` only
- **Engine:** OvisOCR2 0.9B (GGUF), temperature 0.1, full-page normalization
- **Output:** Markdown via GFM stdlib converter (prevents HTML table breakage)

### UI/UX (Command Center v1.7)
- **Layout:** `fixed inset-0 flex flex-col overflow-hidden` — viewport is the only sizing authority
- **TopBar:** 34px, LEFT logo chip, CENTER brand image `text.png` 153×34, RIGHT icon-only theme/language/settings
- **Main:** `grid-cols-[minmax(0,34fr)_minmax(0,60fr)]` gap-[2%]; left panels `grid-rows [minmax(0,38fr)_minmax(0,62fr)]`
- **BottomBar:** shrink-0, grid `1fr auto 1fr`; LEFT empty, CENTER worker status + RAM + version, RIGHT Share icon
- **Palette:** Coffee & paper — dark `#080502` / light `#F9F8F6`, accent `#E3A55F` / `#92400E`
- **Scrollbars:** always-visible, warm tones on Queue + Preview only

### Validation & Limits
- **File size:** max 20MB per file
- **Formats:** PNG, JPG, JPEG, WEBP, PDF only
- **Batch cap:** 10 files (first 10 kept, extras skipped + warning toast)
- **Invalid batch:** ONE aggregated sonner toast, invalid files never enter queue
- **Output naming:** `{stem}_{HHmm}_{yyyyMMdd}.md`, collision `_2`/`_3`, never overwrite

### State & Persistence
- **Jobs:** memory-only, NEVER persist to disk or localStorage
- **localStorage:** ONLY theme + language
- **Settings:** `settings/settings.json` (Pydantic AppSettings)
- **Logs:** 1MB rotation, no filenames, no content in logs

### Testing
- **TDD mandatory:** RED → GREEN → REFACTOR. All code/script/config changes require tests.
- **Frontend:** Vitest 4 + jsdom 30, 707 tests green
- **Backend:** pytest, 421 tests green
- **Typecheck:** `npm run typecheck` — zero errors required
- **Build:** `npm run build` — success required

### Release
- **Format:** Portable ZIP (`Scan2Text-v{version}-Portable-Full.zip`)
- **Cadence:** Monthly releases
- **Binaries:** GitHub Releases
- **Version info:** `version.json` on GitHub (6 keys: vlm_download_url, vlm_sha256, vlm_size_bytes, mmproj_download_url, mmproj_sha256, mmproj_size_bytes)

---

## Parked Features

These features are identified but not yet implemented:

1. **Single-Instance Plugin** — Prevent multiple app instances from running simultaneously. Currently unimplemented; background process management relies on port occupancy checks in `dev.ps1`.

2. **S63b-RUST-ESCORT** — Rust-based escort process for backend lifecycle management. Proposed improvement over current spawn/poll pattern. Awaiting implementation.

3. **Deeper Pipeline Integration** — Enhanced integration between frontend queue UI and backend processing pipeline, including real-time progress via WebSocket (currently unused by frontend).

4. **Feedback Silent Send** — Feedback queue exists (`feedback/` directory) but silent automatic send is blocked by ADR-007. Manual send via GForm button only.

5. **GPU Support** — Explicitly excluded by CEO decision. CPU-only architecture is a hard constraint.

---

## Known Limitations

### Hard Constraints
- **CPU-only:** No GPU acceleration. Model runs via `llama-cpp-python` with GGUF quantized models.
- **20MB file limit:** Large files exceed memory/CPU capacity for single-pass OCR.
- **Batch cap 10:** Processing more than 10 files simultaneously causes memory pressure.
- **No internet required:** Fully offline after model download. No cloud services.

### Platform
- **Windows-only:** Tauri app targets Windows. No macOS/Linux builds.
- **Portable only:** No installer; single-folder deployment.

### Technical
- **Memory-only jobs:** Jobs are lost on app restart. No history or resume.
- **No real-time WebSocket:** Progress WebSocket endpoint exists but frontend polls via HTTP.
- **Single active job:** Only one OCR job runs at a time; queue is FIFO.
- **No background processing:** Frontend must remain open; app exit terminates backend.

### UX
- **Welcome screen:** Displays every launch until dismissed (ADR-007).
- **Share button:** Placeholder URL `https://placeholder.local`; soft toast on click, no actual navigation.
- **Logs:** Minimal — no filenames, no content details (privacy-by-design).

---

## Quick Reference Commands

```powershell
# Navigate to repo
cd D:\WingAI\Projects\scan2text

# Dev startup
.\dev.ps1

# Frontend tests
cd frontend && npm run test

# Backend tests
$env:PYTHONPATH="src"; py -3.12 -m pytest -q --tb=line

# Typecheck
npm run typecheck

# Build
npm run build

# Graphify (AST visualization)
graphify . --code-only

# Git status
git status --short
git log --oneline -5
```

---

## Obsidian Vault Map

```
second-brain/
  00-Current-State.md          ← Read first for current phase
  00-Inbox/                    ← Unprocessed items
  01-Agent-Memory/             ← Slice summaries (Phase-2…Phase-7)
    Archive/                   ← Old state history
  02-QA/                       ← Manual test scripts (CEO-executed)
  03-Architecture/             ← ADRs and architecture docs
  05-Sprints/                  ← Sprint planning
```

> **Rule:** Every slice updates `00-Current-State.md` and writes a summary to `second-brain/01-Agent-Memory/Phase-{N}/slice-{X}-{name}.md`.

---

## Final Status States

- **COMPLETE** — Tests green, typecheck clean, build success, Obsidian updated, committed.
- **READY FOR CEO MANUAL VERIFICATION** — Code/tests done; CEO must manually verify UI/layout via screenshot or live run.
- **BLOCKED** — Waiting on CEO decision, external dependency, or diagnosis incomplete.
