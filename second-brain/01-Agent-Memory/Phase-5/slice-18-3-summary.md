# Slice 18.3 Summary — Command Center Layout Skeleton

## What Changed

Built the desktop-only Command Center layout shell and wired theme/language toggles to the root app.

### Files Created
- `frontend/src/components/layout/CommandCenterLayout.tsx` — 3-panel CSS grid shell (20fr / 35fr / 45fr)
- `frontend/src/components/layout/TopBar.tsx` — App title + theme/language toggle buttons
- `frontend/src/components/layout/BottomStatusBar.tsx` — Status text from i18n (`status.ready`)
- `frontend/src/components/layout/panels/DropZonePanel.tsx` — Left panel placeholder
- `frontend/src/components/layout/panels/QueuePanel.tsx` — Center panel placeholder
- `frontend/src/components/layout/panels/PreviewPanel.tsx` — Right panel placeholder
- `frontend/src/App.test.tsx` — 18 tests covering layout, theme, and language behavior

### Files Modified
- `frontend/src/App.tsx` — Replaced old DropZone-only shell with `CommandCenterLayout`; added `useEffect` to call `hydratePreferences()` on startup
- `frontend/src/main.tsx` — Imports `en.json`/`id.json`, calls `initI18n({ en: { translation: en }, id: { translation: id } })` before rendering, then calls `hydratePreferences(window.localStorage, navigator.language)`
- `frontend/src/test-setup.ts` — Initializes i18next with test resources so `react-i18next` hooks work in tests
- `second-brain/00-Current-State.md` — Marked Slice 18.3 complete, updated test count to 186

## Key Decisions

1. **i18n initialization in main.tsx**: The locale JSON files don't have a `translation` wrapper, so they must be wrapped as `{ en: { translation: en }, id: { translation: id } }` when passed to `initI18n`. This was a gotcha — the existing `initI18n` signature expects `Record<string, { translation: Record<string, unknown> }>`.

2. **Hydration in App.tsx via useEffect**: Rather than relying on main.tsx-side effects (which don't run in tests), hydration is triggered inside `App` via `useEffect`. This ensures both the real app and tests get the dark class applied before render.

3. **Test mock strategy**: The Zustand store mock uses a shared `mockState` object with a hoisted `vi.mock` factory. This avoids the "Cannot access before initialization" error that vitest throws when referencing variables inside hoisted mocks.

4. **No React Router**: Per Phase 5 decisions, the layout is a single-page shell with CSS grid — no routing.

## Test Coverage

- **Layout structure** (8 tests): top bar, bottom bar, 3 panels, title, toggle buttons
- **Theme behavior** (5 tests): default dark, dark class on documentElement, toggle switches, persistence check, saved light theme
- **Language behavior** (5 tests): saved Indonesian, browser language detection, toggle switches, persistence check, visible text updates

**Total**: 186 tests passing (168 baseline + 18 new)

## Open Questions

- None for this slice. Panel content wiring is deferred to Slice 19.

## Next Steps (Slice 19)

- Wire actual DropZone file handling (drag-and-drop + file input)
- Implement queue items with status/progress
- Add job polling integration
- Connect preview panel to Markdown output
- Add toasts for user feedback
