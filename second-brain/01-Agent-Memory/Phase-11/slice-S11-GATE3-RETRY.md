# S11-GATE3-RETRY — Test-Drift Fix + Rebuild + Deploy + Boot

**Status:** COMPLETE
**Date:** 2026-08-20
**Type:** REMEDIATION GATE (one authorized edit)

## Summary
Remediated the GATE3 BLOCK from commit `5c988b8`. The lone failure was test drift: FIX73 (`844a2e6`) added `PARTIAL_FAILURE` to the `ErrorCode` enum but never updated the exhaustive-membership test. One-line test fix resolved it; full gate went GREEN except the pre-existing `test_health_contract`. Rebuilt via PyInstaller, deployed to the portable runtime root, and proved boot.

## The One Authorized Edit
- **File:** `tests/unit/test_error_mapping.py` → `TestErrorMapping::test_all_enum_values_present`
- **Before:** `expected` set had 11 members, LACKING `"PARTIAL_FAILURE"`.
- **After:** added `"PARTIAL_FAILURE"` (placed after `SETTINGS_INVALID`, matching enum order) → 12 members.
- **Rationale:** CEO-locked FIX73 Option A — `PARTIAL_FAILURE` is a legitimate `ErrorCode` member (`src/scan2text/models/errors.py:19`); the test must match it. Zero source edits.

## Full Gate Counts
- Targeted (test_error_mapping.py): **2 passed** (GREEN).
- Full suite (`py -3.12 -m pytest -q --tb=line`): **331 passed + 1 failed** — failure = `tests/test_health.py::test_health_contract` ONLY (pre-existing, expected). No unexpected failures → proceed to build.

## PyInstaller Invocation
- Discovered unambiguously: `packaging/scan2text-backend.spec` (EXE/COLLECT name `scan2text-backend` = production). The sibling `packaging/scan2text-backend-console-diag.spec` produces `scan2text-backend-diag` and was excluded. Banned scripts (`deploy-fix65d.ps1`/`verify-fix65d.ps1`) never run.
- Command: `py -3.12 -m PyInstaller packaging/scan2text-backend.spec --clean` (from `packaging/` so the spec's relative `../src/scan2text/cli.py` resolves). First run errored at COLLECT (stale onedir present); cleared `packaging/dist/scan2text-backend` and reran with `-y`. Exit 0.
- Output: `packaging/dist/scan2text-backend/` → `scan2text-backend.exe` + `_internal/`.

## dist Verification
- `scan2text-backend.exe` present (45.6 MB).
- `_internal/` present; `_internal/pypdfium2_raw/pdfium.dll` present (7.22 MB).
- **Total file count: 707** (reported, not asserted — historical 765 vs 707 disagreement noted).

## Deploy
- `Copy-Item "$dist\*" -Destination "D:\Scan2Text\backend" -Recurse -Force`.
- **NEW backend SHA256: `DAEEFBCCC0A9084B3C4B05BE59628FC76BECFF50E462BC470947FA0CA437DC8D`** (≠ stale `B94612C9F074D4EA734D7090FA7A63050E409C9405AC95E1AC4CF810409F2A53`).

## Boot Proof (@127.0.0.1:47351/api/health, ~15s)
```json
{"status":"ok","worker":"idle","ram":{"total_mb":48233,"used_mb":39147,"percent":81.2},"cpu":{"percent":0.0},"model":{"name":"OvisOCR2 0.9B","loaded":true,"files_present":true},"version":"0.1.0"}
```
- Assertions: status=ok ✓, model.loaded=true (OvisOCR2 0.9B) ✓, worker=idle ✓, version=0.1.0 ✓.
- Boot instance killed (`Stop-Process -Name scan2text-backend`); port 47351 free (`TcpTestSucceeded False`), no orphan processes.

## Pre-flight / Orphan
- No `scan2text-backend` processes at start; port 47351 free. Tauri shell untouched (live hash `6B56B7310BAF98AC10753AAFCCAC8A5ED287C016468E5D6A227D3F2BD66622FE`). Orphan-process ROOT-CAUSE fix out of scope (separate Rust DIAG slice) — kill/verify only.

## Docs
- `second-brain/00-Current-State.md`: Baseline updated (phase → GATE3-RETRY, backend hash → new, _internal → 707, tests → 331+1). Changelog prepended GATE3-RETRY entry; kept last 5; moved S11-GATE2-TAURI-REBUILD-DEPLOY + S11-FIX72-HEALTH-RETRY-RESILIENCE to `Archive/state-history.md`.
- `second-brain/01-Agent-Memory/Phase-11/slice-S11-GATE3-RETRY.md`: this file.

## CEO Retest
Launch `D:\Scan2Text\backend\scan2text-backend.exe` (or via Tauri shell), wait ~15s, `Invoke-RestMethod http://127.0.0.1:47351/api/health` → expect status ok, model.loaded true, worker idle, version 0.1.0. Ensure no stale backend holds port 47351 first.
