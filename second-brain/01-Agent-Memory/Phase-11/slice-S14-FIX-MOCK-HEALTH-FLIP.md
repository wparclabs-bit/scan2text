# S14-FIX-MOCK-HEALTH-FLIP

**Phase:** 11 — Frontend Test Fix
**Date:** 2026-08-21
**Status:** COMPLETE

## Problem

The test `"shows model-downloader-modal when store.showDownloader is true"` in `frontend/src/App.test.tsx` was failing because it did not mock the `/api/health` fetch call made by `App.tsx` during component mount.

### Root Cause Chain

1. Test sets `_mockScan2TextStoreState.showDownloader = true`
2. App.tsx mounts and calls `fetch(\`${buildApiUrl('/api/health')}?t=${Date.now()}\`)` (line 48)
3. In jsdom, unmocked `fetch` throws a network error
4. Catch block at line 57-61 sets `modelReady = true`
5. `modelsMissing = !modelReady = false`
6. `ModelDownloaderModal` receives `modelsMissing={false}` and returns `null`
7. Test assertion `expect(modal).toBeInTheDocument()` fails — modal is null

### Why the URL mattered

App.tsx appends a cache-buster query param: `${buildApiUrl('/api/health')}?t=${Date.now()}`. In dev mode (default), `buildApiUrl('/api/health')` returns `/api/health`, so the actual URL is `/api/health?t=1234567890`. A mock checking exact equality with `/api/health` would not match.

## Fix

Added a fetch mock to the failing test using the existing pattern (`vi.stubGlobal('fetch', mockFetch)` + `mockImplementation`). The mock:

- Returns `{ ok: true, json: () => Promise.resolve({ hide_welcome_notice: true }) }` for `/api/settings`
- Returns `{ ok: true, json: () => Promise.resolve({ model: { files_present: false } }) }` for `/api/health?t=...` (using `startsWith` + `includes('?t=')` to match the cache-buster URL)
- Returns `{ ok: false }` for all other URLs
- Cleans up with `vi.unstubAllEnvs()` after the test

## Changes

**File modified:** `frontend/src/App.test.tsx` (lines 450–467)

```diff
    it('shows model-downloader-modal when store.showDownloader is true', async () => {
      _mockScan2TextStoreState = { jobs: {}, showDownloader: true }
+     const mockFetch = vi.fn()
+     vi.stubGlobal('fetch', mockFetch)
+     mockFetch.mockImplementation((url: string) => {
+       if (url === buildApiUrl('/api/settings')) {
+         return Promise.resolve({ ok: true, json: () => Promise.resolve({ hide_welcome_notice: true }) })
+       }
+       if (url.startsWith(buildApiUrl('/api/health')) && url.includes('?t=')) {
+         return Promise.resolve({ ok: true, json: () => Promise.resolve({ model: { files_present: false } }) })
+       }
+       return Promise.resolve({ ok: false })
+     })
      render(<App />)
      await new Promise((r) => setTimeout(r, 50))
      const modal = document.querySelector('[data-testid="model-downloader-modal"]')
      expect(modal).toBeInTheDocument()
+     vi.unstubAllEnvs()
    })
```

## Verification

- **RED:** `npm run test -- src/App.test.tsx` — 1 failed (30 passed)
- **GREEN:** `npm run test -- src/App.test.tsx` — 31 passed, 0 failed
- **Typecheck:** `npm run typecheck` — zero errors
- **Scope:** Only `frontend/src/App.test.tsx` modified (test-only fix, no source changes)

## Follow-up

Full frontend test suite deferred to GATE slice. No backend or Rust changes required.
