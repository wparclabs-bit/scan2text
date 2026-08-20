# S13-DIAG-FRONTEND-MODELREADY-TEST — Diagnosis Report

**Date:** 2026-08-21  
**Slice:** S13-DIAG-FRONTEND-MODELREADY-TEST  
**Status:** DIAGNOSIS COMPLETE  

---

## Failing Test

| Field | Value |
|---|---|
| **Test file** | `frontend/src/App.test.tsx` |
| **Test name** | `Command Center layout > reactive MODEL_NOT_FOUND modal > shows model-downloader-modal when store.showDownloader is true` |
| **Failed assertion** | `expect(modal).toBeInTheDocument()` at line 455 |
| **Error message** | `received value must be an HTMLElement or an SVGElement. Received has type: Null. Received has value: null` |

## Compact Failure Output

```
FAIL  src/App.test.tsx > Command Center layout > reactive MODEL_NOT_FOUND modal > shows model-downloader-modal when store.showDownloader is true
Error: expect(received).toBeInTheDocument()
received value must be an HTMLElement or an SVGElement.
Received has type:  Null
Received has value: null
 ❯ src/App.test.tsx:455:21
    453|       await new Promise((r) => setTimeout(r, 50))
    454|       const modal = document.querySelector('[data-testid="model-downlo…
    455|       expect(modal).toBeInTheDocument()
```

## modelReady State Evidence

### App.tsx (source of truth)

**Line 17 — default value:**
```tsx
const [modelReady, setModelReady] = useState<boolean>(false)
```

**Line 94 — S12 commit wiring:**
```tsx
<ModelDownloaderModal open={showDownloader} onClose={handleDownloaderClose} modelsMissing={!modelReady} isOnline={!!navigator.onLine} versionJsonExists={true} />
```

**Lines 45-64 — health check effect:**
```tsx
useEffect(() => {
  const checkModelStatus = async () => {
    try {
      const res = await fetch(`${buildApiUrl('/api/health')}?t=${Date.now()}`)
      const data = await res.json()
      if (data.model.files_present) {
        setModelReady(true)
      } else {
        await fetch(buildApiUrl('/api/download/start'), { method: 'POST' })
        setShowDownloader(true)
      }
    } catch (err) {
      console.error('Health check error:', err);
      // Backend unavailable (demo/offline) — skip downloader, proceed to welcome.
      setModelReady(true)  // ← THIS LINE IS THE KEY
    }
  }
  void checkModelStatus()
}, [])
```

### Test Setup (App.test.tsx lines 450-456)

```tsx
it('shows model-downloader-modal when store.showDownloader is true', async () => {
  _mockScan2TextStoreState = { jobs: {}, showDownloader: true }
  render(<App />)
  await new Promise((r) => setTimeout(r, 50))
  const modal = document.querySelector('[data-testid="model-downloader-modal"]')
  expect(modal).toBeInTheDocument()
})
```

**No `vi.stubGlobal('fetch', ...)` is called in this test.** The global `fetch` is the real jsdom fetch, which fails with `TypeError: Failed to parse URL from /api/health?t=...` because `/api/health` is not a valid URL in jsdom.

### ModelDownloaderModal.tsx (render gate)

**Line 110:**
```tsx
if (!modelsMissing) return null
```

## Execution Trace (Failing Test)

1. Test sets `_mockScan2TextStoreState = { jobs: {}, showDownloader: true }`
2. `App` renders with `modelReady = false` (default), `showDownloader = true`
3. `useEffect` fires → calls `fetch('/api/health?t=...')`
4. **No fetch mock exists** → jsdom real fetch throws `TypeError: Failed to parse URL from /api/health?t=...`
5. **Catch block executes** → `setModelReady(true)` (line 60)
6. React re-renders with `modelReady = true` → `modelsMissing = !true = false`
7. `ModelDownloaderModal` receives `modelsMissing={false}` → line 110 returns `null`
8. Query for `[data-testid="model-downloader-modal"]` returns `null`
9. **Test fails:** `expect(null).toBeInTheDocument()` throws

## Root Cause Classification

### TEST_MOCK_MISSING_MODELREADY

**Why this classification:**

The test sets `showDownloader: true` (simulating the reactive MODEL_NOT_FOUND trigger) but does NOT mock the fetch call that `App.tsx` makes to `/api/health`. The unmocked fetch throws in jsdom, which triggers the catch block in `App.tsx` that sets `modelReady = true`. This flips `modelsMissing` from `true` to `false`, causing `ModelDownloaderModal` to return `null` instead of rendering.

The test was written for the pre-S12 behavior where `App.tsx` passed `modelsMissing={showDownloader}` (or similar). The S12 commit changed it to `modelsMissing={!modelReady}`, but the test mock was never updated to ensure `modelReady` stays `false` during the test.

**Not APP_REGRESSION:** The App.tsx behavior is correct — when the backend is unavailable, `modelReady` is set to `true` so the app proceeds to the welcome modal (intentional offline/fallback behavior). The S12 change from `modelsMissing={showDownloader}` to `modelsMissing={!modelReady}` is semantically equivalent in the happy path (health check succeeds → `modelReady=true` → `modelsMissing=false` → no modal), and correct in the model-missing path (health returns `files_present:false` → `modelReady` stays `false` → `modelsMissing=true` → modal shows).

**Not STORE_DEFAULT_REGRESSION:** The Zustand store mock correctly provides `showDownloader: true`.

## Recommended Next Remediation Slice

**S14-FIX-MOCK-HEALTH-FLIP:** Add a fetch mock to the failing test that simulates the health check returning `{ model: { files_present: false } }`, which will keep `modelReady` at its default `false` value, making `modelsMissing = !false = true`, and allowing the `ModelDownloaderModal` to render with its `data-testid="model-downloader-modal"` attribute.

**Alternative (simpler):** Mock fetch to resolve with `{ ok: true, json: () => ({ model: { files_present: false } }) }` for the `/api/health` URL in this test only. This keeps `modelReady = false` and `modelsMissing = true`.

## Files Inspected

| File | Relevance |
|---|---|
| `frontend/src/App.test.tsx` (lines 450-458) | Failing test |
| `frontend/src/App.tsx` (full file) | S12 change: `modelsMissing={!modelReady}`; catch block sets `modelReady=true` |
| `frontend/src/components/layout/ModelDownloaderModal.tsx` (full file) | Line 110: `if (!modelsMissing) return null` |
| `frontend/src/stores/scan2text.store.ts` | Mock setup (lines 28-52 of test) — store mock is correct |

## Test Suite Summary

- **Total:** 666 tests
- **Passed:** 665
- **Failed:** 1 (this test)
- **Duration:** 8.49s
