# S11-DIAG-THEME-LANG-PERSISTENCE

**Date:** 2026-08-20
**Status:** DIAGNOSIS COMPLETE — Root cause identified, minimal fix proposed. Zero source edits.
**Bug Reference:** Test-Final.md Bug 5.3; PRD FR-13 (i18n), FR-14 (Theme); AGENTS.md §2.8

## Executive Summary

Theme and language choices are NOT remembered on app restart. The root cause is a **Missing Write**: the UI toggle buttons in `TopBar.tsx` call `toggleTheme()` and `toggleLanguage()` without passing `window.localStorage` as the second argument. Since all four store methods (`setTheme`, `toggleTheme`, `setLanguage`, `toggleLanguage`) use optional chaining (`storage?.setItem(...)`), the localStorage writes silently become no-ops.

The **Read/Boot chain works correctly** — `main.tsx` and `App.tsx` both pass `window.localStorage` to `hydratePreferences()`, which reads from storage and applies the `.dark` class. However, `hydratePreferences()` does NOT call `i18n.changeLanguage()` on boot, meaning even if a saved language existed, i18n would stay at 'en'. This is a secondary issue.

## Chain Analysis

### State Management Location
- **Store:** `frontend/src/stores/preferencesStore.ts` — Zustand store (`usePreferenceStore`)
- **Constants/Helpers:** `frontend/src/lib/preferences.ts` — keys (`scan2text:theme`, `scan2text:language`), types, getter functions
- **UI Toggles:** `frontend/src/components/layout/TopBar.tsx`

### Write Chain (BROKEN)

| Step | File | Line | Code | Status |
|------|------|------|------|--------|
| 1 | TopBar.tsx | 59 | `onClick={() => toggleTheme()}` | Calls with NO storage arg |
| 2 | preferencesStore.ts | 50-60 | `toggleTheme(storage)` receives `undefined` | Optional chain: `storage?.setItem(...)` → **no-op** |
| 3 | TopBar.tsx | 75 | `onClick={() => toggleLanguage()}` | Calls with NO storage arg |
| 4 | preferencesStore.ts | 71-78 | `toggleLanguage(storage)` receives `undefined` | Optional chain: `storage?.setItem(...)` → **no-op** |

**Broken links:**
- `TopBar.tsx:59` — `toggleTheme()` called without second argument
- `TopBar.tsx:75` — `toggleLanguage()` called without second argument
- `preferencesStore.ts:58` — `storage?.setItem(THEME_KEY, newTheme)` is a no-op when storage is undefined
- `preferencesStore.ts:74` — `storage?.setItem(LANGUAGE_KEY, newLanguage)` is a no-op when storage is undefined

### Read/Boot Chain (WORKS for theme, PARTIAL for language)

| Step | File | Line | Code | Status |
|------|------|------|------|--------|
| 1 | main.tsx | 16 | `hydratePreferences(window.localStorage, navigator.language)` | ✅ Passes localStorage |
| 2 | App.tsx | 24 | `hydratePreferences(window.localStorage, navigator.language)` | ✅ Passes localStorage (duplicate call) |
| 3 | preferencesStore.ts | 27-28 | `getInitialTheme(storage)` / `getInitialLanguage(storage, browserLanguage)` | ✅ Reads from storage |
| 4 | preferencesStore.ts | 29 | `set({ theme, language })` | ✅ State updated |
| 5 | preferencesStore.ts | 31-35 | `document.documentElement.classList.add/remove('dark')` | ✅ DOM class applied |
| 6 | preferencesStore.ts | 29 | `set({ theme, language })` — language set in state | ⚠️ **i18n NOT changed** |

**Partial issue:**
- `preferencesStore.ts:29` — `hydratePreferences()` sets language in Zustand state but does NOT call `i18n.changeLanguage(language)`. The i18n instance stays at 'en' (from `initI18n` in `i18n/index.ts:9`). If a user previously saved 'id', the store shows "ID" on the toggle button but all UI text remains in English.

## Root Cause Classification

**Primary:** **Missing Write** — TopBar never passes localStorage to toggle functions.
- The store methods are designed correctly with optional chaining (allowing tests to pass mock storage).
- The production callers (TopBar) simply forgot to pass the argument.
- Result: state updates live in React, but nothing is written to disk. On restart, defaults are used.

**Secondary:** **Incomplete Hydration** — `hydratePreferences()` does not call `i18n.changeLanguage()`.
- Even if writes worked, language changes would not take effect on boot.
- The Zustand store would have the correct language value, but i18n would stay at 'en'.

## Minimal Fix Proposal

### Fix 1: TopBar.tsx — Pass localStorage to toggles (PRIMARY FIX)

Two one-character edits in `frontend/src/components/layout/TopBar.tsx`:

```diff
-                  onClick={() => toggleTheme()}
+                  onClick={() => toggleTheme(window.localStorage)}

-                  onClick={() => toggleLanguage()}
+                  onClick={() => toggleLanguage(window.localStorage)}
```

Lines 59 and 75. This is the only change needed to fix Bug 5.3 (persistence on restart).

### Fix 2: preferencesStore.ts — Hydrate i18n language on boot (SECONDARY FIX)

Add one line in `hydratePreferences()` after setting state:

```diff
   hydratePreferences: (storage, browserLanguage) => {
     const theme = getInitialTheme(storage)
     const language = getInitialLanguage(storage, browserLanguage)
     set({ theme, language })
+    i18n.changeLanguage(language)  // hydrate i18n to match saved language

     if (theme === 'dark') {
```

Line 30 (after the `set()` call). This ensures the i18n instance matches the persisted language on boot.

## Verification Plan

After Fix 1:
1. Open app → default is dark/en
2. Toggle theme to light → close browser
3. Reopen app → should be light (not dark)
4. Toggle language to id → close browser
5. Reopen app → should show "ID" on toggle button

After Fix 2:
1. Set language to id via toggle → close browser
2. Reopen app → UI text should be in Indonesian (not English)

## Zero-Edits Confirmation

No source files were modified during this diagnostic slice. All findings are analysis-only.
