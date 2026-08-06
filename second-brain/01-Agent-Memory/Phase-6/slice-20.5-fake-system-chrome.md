# Slice 20.5 — Fake System Chrome

## What Changed

### Components Created/Modified
- **`src/components/layout/BottomStatusBar.tsx`** — Replaced simple status footer with three static metrics separated by subtle dividers: Worker Idle, RAM Usage (1.8 GB), App Version (v0.1.0-demo). Added `data-testid="bottom-bar"`.
- **`src/components/layout/TopBar.tsx`** — Added Settings icon button (`Settings` from lucide-react) to the right side of the toggle buttons. Click opens SettingsDialog via local state. Added `data-testid="settings-trigger"`.
- **`src/components/layout/SettingsDialog.tsx`** — New shadcn Dialog component with two sections: General (Language/Theme selectors) and Processing (locked inputs for Output Directory, Max PDF Pages, CPU Threads). All Section 2 inputs have HTML `disabled` attribute + 🔒 emoji in labels. Added `data-testid="settings-dialog"`.
- **`src/components/ui/dialog.tsx`** — Created shadcn Dialog primitive (was missing from project).
- **`src/components/ui/label.tsx`** — Created shadcn Label primitive (was missing from project).

### i18n Keys Added
- `bottomBar.workerIdle`, `bottomBar.ramUsage`, `bottomBar.version`
- `settings.title`, `settings.general`, `settings.processing`
- `settings.outputDir`, `settings.maxPdfPages`, `settings.cpuThreads`
- Both `en.json` and `id.json` updated with English/Indonesian translations.

### Tests Added
- **`BottomStatusBar.test.tsx`** — 5 tests: renders data-testid, displays Worker/RAM/Version text, separator count.
- **`TopBar.test.tsx`** — Updated to 3 tests: settings trigger renders, click opens dialog, other clicks don't open it.
- **`SettingsDialog.test.tsx`** — 11 tests: renders dialog, close button works, General section present, Processing section locked, disabled inputs, lock emojis, hidden when closed.

### Test Setup
- **`src/test-setup.ts`** — Extended hardcoded i18n resources with new bottomBar and settings keys for both en and id.

## Key Decisions

1. **Static metrics only** — No `setInterval` or timers. RAM/Worker values are fixed demo strings per spec.
2. **shadcn primitives created manually** — Dialog and Label components were missing from the project; implemented using Radix UI primitives matching shadcn default style.
3. **Locked UX pattern** — Section 2 uses HTML `disabled` attribute on all inputs + 🔒 emoji in labels to visually communicate backend dependency without requiring state management changes.
4. **No store changes** — Zustand stores untouched. SettingsDialog is a pure presentational component driven by local React state in TopBar.

## Test Coverage

| Component | Tests | Status |
|-----------|-------|--------|
| BottomStatusBar | 5 | ✅ All passing |
| TopBar | 3 (updated) | ✅ All passing |
| SettingsDialog | 11 | ✅ All passing |
| App integration | Updated | ✅ Passing |
| **Total** | **415/415** | ✅ Green |

## Open Questions

- None. Phase 6 complete with Demo Mode fully functional.
