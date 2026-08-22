# S11-DIAG-HEALTH404-BACKGROUND-REPOLL

**Date:** 2026-08-20
**Slice Type:** DIAG (forensics + report only, zero source edits)
**Baseline Backend:** DAEEFBCCC0A9… (FIX73+FIX74 live)
**Baseline Shell:** 6B56B7310BAF…

## Executive Summary

**HYPOTHESIS: CONFIRMED.** The FR-04 background re-poll path calls `GET /health` (no `/api/` prefix), which returns 404 because the backend only serves `GET /api/health` (PRD-03 §14). Three consecutive 404s trip the FIX72 threshold (`consecutiveHealthFailures >= 3`) → job marked `failed` + `errors.backendLost` toast, while the backend actually completes and writes the `.md`. Fast jobs (<30s) never enter background mode, so they stay green.

## Root Cause

**Single-line URL mismatch in `frontend/src/lib/api.ts:116`:**

```typescript
// api.ts:115-116
export async function getHealth(): Promise<{ status: string }> {
  const response = await fetch(buildApiUrl('/health'))   // ← WRONG: should be '/api/health'
```

`buildApiUrl('/health')` resolves to `/health` (dev) or `http://127.0.0.1:47351/health` (prod). The backend has NO `/health` route — only `/api/health`. Every call returns HTTP 404.

## Every Health-URL Caller (file:line:URL:cadence)

| # | File | Line | URL Literal | Cadence | Status |
|---|------|------|-------------|---------|--------|
| 1 | `frontend/src/lib/api.ts` | 116 | `buildApiUrl('/health')` → `/health` | Called by background loop (see #5) | **BUG — wrong path** |
| 2 | `frontend/src/App.tsx` | 41 | `buildApiUrl('/api/health')` → `/api/health?t=...` | Once at app init | OK |
| 3 | `frontend/src/components/layout/BottomStatusBar.tsx` | 30 | `buildApiUrl('/api/health')` → `/api/health?t=...` | Every 10s (setInterval) | OK |
| 4 | `frontend/src/stores/scan2text.store.ts` | 507 | via `getHealth()` import from api.ts | Every 60s in background loop | **BUG (indirect, via #1)** |
| 5–8 | Test files (`apiBase.test.ts`, `App.test.tsx`, `BottomStatusBar.test.tsx`, `scan2text.store.test.ts`) | various | `buildApiUrl('/api/health')` | Mocked | OK (tests mock `getHealth()` entirely — never test the URL path) |

**Note:** `src-tauri/` directory does not exist in this repo. The Tauri shell is a compiled binary (`Scan2Text.exe`). No Rust-side `/health` watchdog exists in source.

## Failure Chain (known.pdf red)

1. User uploads `known.pdf` (~2 min PDF job).
2. Initial poll: `pollJob()` → `pollTaskStatus()` returns `processing` after ~30s.
3. `pollJob()` spawns background loop (store.ts:498–618): infinite `while(true)` with 60s sleep.
4. **First iteration** (~30s + 60s = ~90s from upload): calls `await getHealth()` at store.ts:507 → `fetch(buildApiUrl('/health'))` at api.ts:116 → backend returns 404 → throws.
5. Catch block (store.ts:518–548): increments `consecutiveHealthFailures` to 1.
6. **Second iteration** (~150s): same 404 → counter = 2.
7. **Third iteration** (~210s): same 404 → counter = 3 ≥ threshold (store.ts:530).
8. Job set to `status: 'failed'` with `error: i18n.t('errors.backendLost')` (store.ts:531–544).
9. `toast.error(i18n.t('errors.backendLost'))` fires (store.ts:545).
10. `promoteNextPending()` called (store.ts:546) — promotes next queued job.
11. Meanwhile, backend continues processing and eventually writes the `.md` file, but the frontend has already marked the job failed.

## Cadence Confirmation

- **Background loop interval:** `await new Promise(resolve => setTimeout(resolve, 60_000))` at store.ts:617 — confirmed 60s cadence.
- **FIX72 threshold:** `if (newCount >= 3)` at store.ts:530 — confirmed 3 consecutive failures.
- **Total time to failure:** ~3 × 60s = 180s (3 minutes) after background loop starts, which begins ~30s after upload completes initial polling.

## Test Gap

All tests mock `getHealth()` entirely via `mockGetHealth`. The URL path is never exercised:
- `scan2text.store.test.ts:1041`: `mockGetHealth.mockResolvedValue({ status: 'ok' })`
- `scan2text.store.test.ts:1088`: `mockGetHealth.mockRejectedValue(new Error('ECONNREFUSED'))`

The tests verify the *logic* of consecutive-health-failure handling but never validate that `getHealth()` calls the correct URL. This is why the bug survived all test gates.

## Minimal Fix Proposal

**File:** `frontend/src/lib/api.ts`
**Line:** 116
**Change:** One character — add `/api/` prefix to the path.

```diff
- const response = await fetch(buildApiUrl('/health'))
+ const response = await fetch(buildApiUrl('/api/health'))
```

This is a one-character edit (adding `/api/`) that makes `getHealth()` consistent with every other health URL caller in the codebase (App.tsx:41, BottomStatusBar.tsx:30).

## Test Impact

| Test File | Impact | Action |
|-----------|--------|--------|
| `frontend/src/lib/apiBase.test.ts` | No change — tests `buildApiUrl` utility, not `getHealth()` path | None needed |
| `frontend/src/App.test.tsx` | No change — uses `buildApiUrl('/api/health')` directly | None needed |
| `frontend/src/components/layout/BottomStatusBar.test.tsx` | No change — uses `buildApiUrl('/api/health')` directly | None needed |
| `frontend/src/stores/scan2text.store.test.ts` | Tests mock `getHealth()` entirely; no URL path tested | **Recommended:** add a test that verifies `getHealth()` calls the correct endpoint. Currently the bug was invisible to tests because of this gap. |

## Root-Cause Classification

**Type:** URL path typo / copy-paste error
**Severity:** High — causes false-negative job failures for long-running PDF/scan jobs
**Frequency:** 100% of background re-poll health checks (every 60s during >30s jobs)
**Affected jobs:** Only jobs that enter the background loop (>30s processing time, typically large PDFs)
**Not affected:** Fast jobs (<30s), initial app health check, BottomBar RAM/CPU telemetry

## Zero-Edits Confirmation

This slice made ZERO source code edits. Findings and fix proposal documented only.
