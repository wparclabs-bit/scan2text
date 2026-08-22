# Slice S42a — External Audit Fact Pack

**Date:** 2026-08-23  
**Slice:** S42a-FACT-PACK  
**Phase:** 11 (post-v1.0.0 release)  
**Status:** COMPLETE

## Objective
Produce a single read-only evidence pack for external audit review without requiring repo access.

## Deliverables
1. **`second-brain/03-Architecture/Repo-Audit/s42a-fact-pack.md`** — Main fact pack (~45KB, 571 lines of structured data)
2. **`second-brain/01-Agent-Memory/Phase-11/slice-S42a-fact-pack.md`** — This summary

## Key Findings

### Repository Scale
- **571 tracked files** (git ls-files)
- **6 files >100 KB**: 2 binary probes (~930KB each), package-lock.json (235KB), 2 Tauri schema files (~117KB each), Cargo.lock (112KB)
- **7 duplicate basenames** across the repo (most common: `__init__.py` at 11 locations)

### Architecture Graph (Graphify AST)
- **2,173 nodes**, **3,292 edges**, **193 communities**
- Top god node: `PathService` (207 edges) — central routing hub
- No import cycles detected
- 83% EXTRACTED / 17% INFERRED quality

### Dependency Inventory
- **Frontend:** 21 production + 16 dev dependencies (React 19, Tauri 2, Tailwind 3, Zustand 5)
- **Backend:** 11 production + 4 dev dependencies (FastAPI 0.141, Pydantic 2.13, llama-cpp-python 0.3.x)
- **Rust/Tauri:** tauri 2.11.3, serde, serde_json, log, tauri-plugin-log

### Test Coverage
- **92 total test files**: 53 Python + 19 TSX + 20 TS
- Backend: 361 tests (green)
- Frontend: 682 tests (green)

### Folder Casing
- `second-brain/02-qa` uses **lowercase** "qa" (not "02-QA") — discovered via Get-ChildItem, no rename performed.

## Constraints Honored
- Zero source edits
- Zero deletions
- Zero dependency installs
- No external service calls
- No runtime artifacts included (models/, output/, logs/, feedback/)

## Verification
- Fact pack exists at `second-brain/03-Architecture/Repo-Audit/s42a-fact-pack.md`
- Sections a–l all present and populated
- No D:\Scan2Text paths in the pack
- .gitignore full content included (section k)

## Files Changed
| File | Action |
|------|--------|
| `second-brain/03-Architecture/Repo-Audit/s42a-fact-pack.md` | Created |
| `second-brain/00-Current-State.md` | Updated (S42a entry prepended, S33b archived) |
| `second-brain/01-Agent-Memory/Phase-11/slice-S42a-fact-pack.md` | Created |
| `second-brain/01-Agent-Memory/Archive/state-history.md` | Updated (S33b archived) |

## Notes for External Analyst
- The fact pack is self-contained: all evidence is in the markdown document.
- Graphify AST graph at `graphify-out/graph.json` provides additional structural detail (2,173 nodes).
- All tracked file paths are absolute within the repo root — no relative path resolution needed.
- The repo uses a `src/` layout for Python backend (`src/scan2text/`) and flat `frontend/src/` for the Tauri app.
