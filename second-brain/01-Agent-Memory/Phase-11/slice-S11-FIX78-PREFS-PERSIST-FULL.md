# Slice S11-FIX78-PREFS-PERSIST-FULL

**Date:** 2026-08-20
**Status:** COMPLETE
**Commit:** `0e16f5d`

## Root Cause
TopBar.tsx called `toggleTheme()` and `toggleLanguage()` without passing `window.localStorage` as the second argument. All four store methods use optional chaining (`storage?.setItem(...)`) — when storage is undefined, writes silently become no-ops. State updates live in React but nothing persists to disk. On restart, defaults are used.

Secondary: `hydratePreferences()` set language in Zustand state but never called `i18n.changeLanguage()`, so even if writes worked, i18n stayed at 'en' on boot.

## Semantics (CEO Locked)
- **localStorage** = instant paint cache; **settings.json** = portable source of truth.
- Toggle: write localStorage immediately + debounced (~800ms) PUT /api/settings mirror of theme+language.
- Boot: hydrate from localStorage first; if a pref is ABSENT in localStorage, apply it from GET /api/settings when it resolves (theme class + i18n.changeLanguage).

## Implementation
1. **api.ts:** Extended `SettingsPatch` with `theme?: string` and `language?: string`.
2. **preferencesStore.ts:**
   - Added module-level debounce timers (`scheduleThemeSave`, `scheduleLangSave`) with 800ms delay.
   - `hydratePreferences` now calls `i18n.changeLanguage()` when localStorage has a saved language (distinguishes stored vs browser-detection path via `getStoredLanguage`).
   - `toggleTheme` and `toggleLanguage` now call their respective debounce schedulers after state update.
   - All store methods (`setTheme`, `toggleTheme`, `setLanguage`, `toggleLanguage`) fall back to `window.localStorage` when storage arg is undefined — this fixes the TopBar issue where toggles are called without args.
   - New `applySettingsFromResponse` method: applies theme class + i18n.changeLanguage from GET /api/settings response.
3. **App.tsx:** Boot fallback — after GET /api/settings resolves, checks if localStorage lacks theme or language; if so, calls `applySettingsFromResponse` with the response data.

## Tests (13 new, all GREEN)
- toggleTheme writes to localStorage immediately
- toggleLanguage writes to localStorage + calls i18n.changeLanguage
- hydratePreferences calls i18n.changeLanguage when saved language exists
- hydratePreferences does NOT call i18n when no saved language (browser detection path)
- Boot fallback applies theme class from settings.json when localStorage empty
- Boot fallback calls i18n.changeLanguage from settings.json when localStorage empty
- Boot fallback applies both theme + language from settings.json
- Debounce: rapid theme toggles produce at most one saveSettings call within ~1s
- Debounce: rapid language toggles produce at most one saveSettings call within ~1s

## Regression
- Existing preferencesStore tests: 20 passed (unchanged)
- TopBar tests: 21 passed (unchanged)
- SettingsDialog tests: 5 passed (unchanged)
- All store tests: 144 passed
- TypeScript typecheck: clean (zero errors)

## Files Changed
- `frontend/src/lib/api.ts` — SettingsPatch extended
- `frontend/src/stores/preferencesStore.ts` — debounce, i18n hydration, applySettingsFromResponse
- `frontend/src/App.tsx` — boot fallback from GET /api/settings
- `frontend/src/stores/preferencesStore.persistence.test.ts` — 13 new tests (new file)

## Obsidian Updated
- `second-brain/00-Current-State.md` — prepended FIX78 entry, rotated LINGER-PROCESSES to archive
- `second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX78-PREFS-PERSIST-FULL.md` — this file
