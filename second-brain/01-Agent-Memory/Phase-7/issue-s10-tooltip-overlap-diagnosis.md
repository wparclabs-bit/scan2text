# S10-DIAG5: TopBar Tooltip Overlap Diagnosis

## What Changed (FIX3 Changeset — commit 850baed)

Files touched (8 files, +145 / -16 lines):
1. `frontend/src/components/dropzone/FileDropZone.test.tsx` — +27 (6 new tests)
2. `frontend/src/components/dropzone/FileDropZone.tsx` — +1/-1 (className merge fix, `??` → `||`)
3. `frontend/src/components/layout/TopBar.test.tsx` — +80 (3 tooltip tests)
4. `frontend/src/components/layout/TopBar.tsx` — +4/-4 (ternary fix line 93; added `forceMount` to all 3 TooltipContent)
5. `frontend/src/test-setup.ts` — +2/-2 (fake timer setup)
6. `second-brain/00-Current-State.md` — changelog entry
7. `second-brain/01-Agent-Memory/Archive/state-history.md` — appended
8. `second-brain/01-Agent-Memory/Phase-7/slice-10-fix3-ui-tooltip-icon.md` — slice summary

TopBar.tsx delta (lines 75, 92, 108): added `forceMount` to all three `<TooltipContent>` elements.
TopBar.tsx line 93: ternary fixed from `language === 'en' ? t('actions.langTooltipId') : t('actions.langTooltipEn')` → `language === 'en' ? t('actions.langTooltipEn') : t('actions.langTooltipId')`.

## Tooltip JSX Structure (TopBar.tsx)

All three tooltips are **sibling** `<Tooltip>` components inside a single `<TooltipProvider delayDuration={200}>`:

- **Theme** (lines 64-78): `<Tooltip>` → `<TooltipTrigger asChild>` → `<button data-testid="theme-toggle">` → `<TooltipContent side="bottom" forceMount>`
- **Language** (lines 80-95): `<Tooltip>` → `<TooltipTrigger asChild>` → `<button data-testid="language-toggle">` → `<TooltipContent side="bottom" forceMount>`
- **Settings** (lines 97-111): `<Tooltip>` → `<TooltipTrigger asChild>` → `<button data-testid="settings-trigger">` → `<TooltipContent side="bottom" forceMount>`

**No open/defaultOpen props.** Each `<Tooltip>` is independent (no shared state, no nesting — one wrapping multiple). All three `<TooltipContent>` elements share `side="bottom"` and `forceMount`.

## Root Cause

**Primary: `delayDuration={200}` on `<TooltipProvider>` (line 25).**

Radix Tooltip `delayDuration` controls the **openDelay** — time the mouse must rest on a trigger before the tooltip opens. When the user moves from one button to the next within 200ms, the following race occurs:

1. Hover Button A → Tooltip A opens immediately (0 openDelay).
2. Move mouse toward Button B within 200ms.
3. The **close delay** (also 200ms by default when `delayDuration` is set) has NOT elapsed, so Tooltip A remains open.
4. Hover Button B → Tooltip B opens immediately.
5. Both `TooltipContent` elements are simultaneously visible → garbled overlapping text.

With three buttons 8px wide and only `gap-1` spacing, the user's cursor traverses all three within the 200ms window. The delay is shared across all three tooltips.

**Contributing: `forceMount` on all three `<TooltipContent>` (lines 75, 92, 108).**

`forceMount` keeps all three tooltip content elements mounted in the DOM at all times (Radix normally unmounts on close). While Radix hides them via `display: none` when closed, `forceMount` means:
- All three contents exist in the DOM simultaneously
- Any CSS/state bug that affects visibility of one affects all
- In jsdom, the contents are always present for testing

The combination of `delayDuration={200}` + `forceMount` creates a wider overlap window where all three contents are both mounted and potentially visible.

**Fix direction:**
1. Remove `delayDuration={200}` from `<TooltipProvider>` (line 25) — instant open/close, no overlap window.
2. Remove `forceMount` from all three `<TooltipContent>` elements (lines 75, 92, 108) — unmount on close, standard behavior.
3. If tests need content present, use `renderMode: 'client'` or `jest.useFakeTimers()` with `advanceTimersByTime()` rather than `forceMount`.

## Bug-1 Ternary Fix Status

**FIXED** in 850baed (S10-FIX3).

Current TopBar.tsx:93:
```tsx
<p>{language === 'en' ? t('actions.langTooltipEn') : t('actions.langTooltipId')}</p>
```

en.json:
- `actions.langTooltipEn`: "Switch to Indonesian"
- `actions.langTooltipId`: "Switch to English"

id.json:
- `actions.langTooltipEn`: "Beralih ke Bahasa Indonesia"
- `actions.langTooltipId`: "Beralih ke Bahasa Inggris"

The ternary now correctly maps `language === 'en'` → `langTooltipEn` (was inverted pre-FIX3). i18n keys present in BOTH locales.
