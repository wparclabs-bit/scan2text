# S10-DIAG4 — UI Tooltip + Icon Diagnosis

**Date:** 2026-08-14
**Phase:** Phase 7 (diagnosis for Phase 10 remediation)
**Status:** Root causes identified, remediation pending

## Found

### Bug 1: Language tooltip shows current language instead of "switch to …"
- **Symptom:** Hovering the language button (TopBar, top-right) displays the *current* language (e.g. "EN") instead of a "Switch to Indonesian / English" action message.
- **Affected element:** Language toggle button + tooltip in TopBar.

### Bug 2: Dropzone upload icon pinned to left edge
- **Symptom:** The upload arrow/tray SVG inside the dropzone area is flush-left instead of horizontally centered in the dropzone.
- **Affected element:** FileDropZone SVG icon rendered inside DropZonePanel.

---

## Root Cause 1 — Language tooltip inverted

**File:** `frontend/src/components/layout/TopBar.tsx`
**Line:** 93

```tsx
<p>{language === 'en' ? t('actions.langTooltipId') : t('actions.langTooltipEn')}</p>
```

### Why it's wrong

The ternary branches are **swapped**. The key names encode the *current* language:

| Key | en.json value | id.json value | Meaning |
|-----|---------------|---------------|---------|
| `actions.langTooltipEn` | "Switch to Indonesian" | "Beralih ke Bahasa Inggris" | Shown when current language is EN |
| `actions.langTooltipId` | "Switch to English" | "Beralih ke Bahasa Inggris" (NOTE: key name says ID but text says switch to English) | Shown when current language is ID |

Current logic:
- `language === 'en'` → `langTooltipId` → "Switch to English" ❌ (should say "Switch to Indonesian")
- `language === 'id'` → `langTooltipEn` → "Switch to Indonesian" ❌ (should say "Switch to English")

### Fix direction

Line 93 should be:
```tsx
<p>{language === 'en' ? t('actions.langTooltipEn') : t('actions.langTooltipId')}</p>
```

**Keys involved:** `actions.langTooltipEn`, `actions.langTooltipId`
**Pattern:** `frontend/src/components/layout/TopBar.tsx:93`

---

## Root Cause 2 — Upload icon left-aligned (missing flex centering classes)

**File:** `frontend/src/components/dropzone/FileDropZone.tsx`
**Line:** 125

```tsx
className={`${className ?? 'w-full flex-1 flex flex-col items-center justify-center gap-2 p-4'} border-2 border-dashed rounded-lg cursor-pointer transition-colors ${...}`}
```

**Caller:** `frontend/src/components/layout/panels/DropZonePanel.tsx` line 29:
```tsx
<FileDropZone className="flex-1 min-h-0 w-full" />
```

### Why it's wrong

The `??` (nullish coalescing) operator **replaces** the entire default class string when the prop is truthy. DropZonePanel passes `className="flex-1 min-h-0 w-full"`, so the ternary returns that prop value directly, and **all** default classes are discarded:

**Actual className rendered (no centering):**
```
flex-1 min-h-0 w-full border-2 border-dashed rounded-lg cursor-pointer transition-colors border-muted-foreground/30 hover:border-primary/50
```

**Missing from defaults:** `flex flex-col items-center justify-center gap-2 p-4`

Without `flex flex-col items-center`, the SVG is a plain block element that flows to the left edge of the container.

### Fix direction

Replace `??` with concatenation so defaults are always included and prop is appended:
```tsx
className={`w-full flex-1 flex flex-col items-center justify-center gap-2 p-4 ${className ? ' ' + className : ''} border-2 border-dashed rounded-lg cursor-pointer transition-colors ${...}`}
```

**Classes involved:** `flex`, `flex-col`, `items-center`, `justify-center`, `gap-2`, `p-4`
**Pattern:** `frontend/src/components/dropzone/FileDropZone.tsx:125`

---

## Keys & Classes Summary

| Bug | File | Line(s) | Key/Class |
|-----|------|---------|-----------|
| 1 — tooltip | `TopBar.tsx` | 93 | `actions.langTooltipEn`, `actions.langTooltipId` — ternary inverted |
| 2 — icon left | `FileDropZone.tsx` | 125 | `??` operator replaces defaults; missing `flex flex-col items-center justify-center gap-2 p-4` |
| 2 — caller | `DropZonePanel.tsx` | 29 | passes `className="flex-1 min-h-0 w-full"` triggering the `??` swap |

## Open Questions

1. **en.json `langTooltipId` value** — en.json line 27 says `"Switch to English"`. The key name `langTooltipId` semantically means "tooltip when language is ID", but the value says "Switch to English" which would be the *current* language display. Confirm: should the value be "Switch to Indonesian" (the target language)? Same check needed for id.json line 27.
2. **DropZonePanel className intent** — Does DropZonePanel need to add `flex-1 min-h-0 w-full` or should it pass no className and let defaults cover everything? If the prop is always truthy from the caller, the `??` pattern is fundamentally broken and should be replaced with concatenation regardless.
3. **Is there a test for the language tooltip?** Search for tests hitting `data-testid="language-toggle"` to verify if the tooltip content is asserted (it likely isn't, since the component renders a React fragment's `<p>` child inside the tooltip portal).
