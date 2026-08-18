# S11-DIAG-Packaged-Regressions-Forensics

**Date:** 2026-08-17  
**Phase:** Phase 10  
**Slice:** S11-DIAG-Packaged-Regressions-Forensics  
**Baseline:** FIX32 packaged build (backend A9C7BF5F…, shell 61B4939F…)  
**Status:** Forensics complete — written report, no source edits.

---

## BUG-34: Open Folder Dead

### Root Cause
The Open Folder button in `PreviewHeader` has an **empty onClick handler**. It is a pure placeholder with no implementation.

### Call Chain Trace

```
PreviewPanel.tsx:36-47  ← PreviewHeader button (data-testid="preview-open-folder-btn")
  onClick={() => {
    // In final product, this would open the output folder
    // For now, placeholder behavior
  }}
```

The handler is an arrow function with only comments — it does nothing. No Tauri command is called, no backend endpoint is hit, no `shell:open` or `opener` plugin invocation exists anywhere in the frontend codebase.

### Capability Audit

| File | Permissions |
|------|------------|
| `frontend/src-tauri/capabilities/default.json:1` | `["core:default"]` only |

Missing permissions that would be required for a real implementation:
- `shell:allow-open` — to open arbitrary paths via Tauri shell plugin
- `opener:allow-open-path` — if using the opener plugin instead

### Rust Side

No Tauri commands exist in `lib.rs` or `main.rs` for opening folders. The only commands are backend lifecycle management (`boot_backend`, `cleanup_backend_process`).

### Error Handling

Not applicable — the handler never throws because it never executes any logic. No unhandled promise rejection risk.

### Header Overflow at Narrow Widths

`PreviewPanel.tsx:14`:
```tsx
className="flex items-center justify-center gap-2 p-3 shrink-0"
```

No overflow handling, no truncation, no wrapping. At narrow widths the two buttons sit side-by-side with `gap-2`. If the panel narrows below ~280px, the buttons will overflow the header container horizontally. No `flex-wrap`, no `min-w-0`, no text truncation.

### Proposed Fix (minimal)

1. Add `shell:allow-open` to `default.json` capabilities.
2. Implement a Tauri command or use `window.__TAURI__.shell.open(path)` in the onClick handler.
3. Resolve output folder path via backend `GET /api/settings` → `output_dir`, then pass to opener.
4. Add `flex-wrap` or `min-w-0` + truncate to header for narrow-width safety.

---

## BUG-33: Settings Not Persisted

### Root Cause
`SettingsDialog.tsx` has **no save mechanism at all**. It is a static display-only dialog.

### Complete Failure Points (Packaged Flow)

1. **No Save Button** (`SettingsDialog.tsx:98-100`)  
   The only button in the footer is "Close" which calls `onOpenChange(false)`. There is no "Save" or "Apply" button anywhere in the component.

2. **No Backend API Call**  
   The dialog never calls `PUT /api/settings` (defined in `src/scan2text/routes/settings.py:27-37`). The entire settings persistence backend exists and works (`SettingsService.save()` at `src/scan2text/services/settings_service.py:69-91`), but the frontend never invokes it.

3. **Hardcoded Static Values** (`SettingsDialog.tsx:55-79`)  
   All inputs are uncontrolled with hardcoded `value` props:
   - Output dir: `value="./output"` (line 58) — ignores actual backend setting
   - Max PDF pages: `value={20}` (line 70) — hardcoded default
   - CPU threads: `value={0}` (line 78) — hardcoded default
   These never reflect loaded settings and never capture user changes.

4. **Uncontrolled Selects** (`SettingsDialog.tsx:27-34`, `37-44`)  
   Language and theme `<select>` elements use `defaultValue` (not `value`), so React does not track changes. Even if a save mechanism existed, these values would be lost.

5. **No Toast on Close**  
   Closing the dialog silently discards any hypothetical changes. No user feedback is provided.

### Frozen Mode Path Resolution

`PathService.settings_path` (`src/scan2text/services/path_service.py:83-86`) in frozen mode resolves to:
```
{portable_root}/settings/settings.json
```
where `portable_root` is found by walking up from exe_dir to the first ancestor containing `models/`. This path is correct per S11-FIX28b. The backend write path works — the problem is purely frontend: the dialog never sends data to the backend.

### Silent Failure Summary

| Layer | Failure Mode | Toast? |
|-------|-------------|--------|
| Frontend UI | No save button exists | N/A |
| Frontend state | Inputs are uncontrolled/static | N/A |
| Backend API | `PUT /api/settings` never called | N/A |
| SettingsService.save() | Never invoked | N/A |
| PathService.settings_path | Correct in frozen mode, but irrelevant | N/A |

**Verdict:** Zero silent failures — the feature is simply unimplemented. The dialog is a visual mockup, not a functional settings editor.

### Proposed Fix (minimal)

1. Convert all inputs to controlled components with `value` + `onChange`.
2. Add a "Save" button that calls `PUT /api/settings` with current form state.
3. Show sonner toast on success/failure.
4. On successful save, update `hide_welcome_notice` via the same endpoint (already supported by `AppSettings`).

---

## BUG-35: Preview Vertical Bloat + Tiny Scrollbar Thumb

### Root Cause
The `prose` typography plugin applies generous default margins to block-level elements. OCR output is essentially a sequence of single-line paragraphs, so each line accumulates full top + bottom margin.

### Layer Analysis

**Layer 1: Dual Size Classes** (`MarkdownPreview.tsx:10`)
```tsx
className="prose prose-sm prose-base dark:prose-invert ..."
```
Both `prose-sm` and `prose-base` are applied. In Tailwind cascade, `prose-base` (1rem font) wins over `prose-sm` (0.875rem), but both sets of margin rules are generated. This is redundant but not the primary bloat cause.

**Layer 2: Typography Default Margins** (`node_modules/@tailwindcss/typography/src/styles.js:25-27`)
```js
p: {
  marginTop: em(16, 14),   // ≈ 1.14rem ≈ 18px at base 16px
  marginBottom: em(16, 14) // ≈ 1.14rem ≈ 18px
}
```

For OCR output where each "line" is a `<p>` element, each paragraph gets ~18px top + ~18px bottom = **36px vertical gap per line**. For a 50-line OCR result, that's 50 × 36px = 1800px of pure whitespace.

**Layer 3: Wrapper Padding** (`PreviewPanel.tsx:97`)
```tsx
<div className="p-4">
```
Adds another 16px on all sides inside the scroll area.

**Layer 4: Scrollbar Thumb Sizing**  
The Radix ScrollArea thumb size is proportional to `(content_visible / content_total)`. Because the CSS margins create huge total content height while only a small fraction is actual text, the thumb becomes a tiny sliver — the visual symptom CEO reported.

### Why OCR Output Is Affected Disproportionately

OCR engines (including Ovis via llama.cpp) output one text line per `<p>` element. Unlike prose documents where paragraphs contain multiple sentences and the margin-to-content ratio is reasonable, OCR output has:
- 1 line of text per `<p>`
- Full `margin-top: 1em` + `margin-bottom: 1em` per line
- No lists, tables, or other dense structures to amortize the margins

### Proposed Fix (minimal)

Add a CSS override block in `index.css` (or a scoped class on the article) to reduce paragraph margins for the OCR preview context:

```css
/* Compact margins for OCR-style one-line-per-paragraph output */
.prose-compact p {
  margin-top: 0.25em;
  margin-bottom: 0.25em;
}
.prose-compact {
  line-height: 1.4;
}
```

Then change `MarkdownPreview.tsx:10` from `prose prose-sm prose-base` to `prose prose-compact`.

Alternatively, target the specific output pattern:
```css
.prose [class$="-preview"] p { margin-top: 0.3em; margin-bottom: 0.3em; }
```

---

## Cross-Cutting Notes

### BUG-34 + BUG-33 Interaction
Both bugs involve missing frontend-to-backend wiring. The Open Folder button needs the output directory path, which would come from `GET /api/settings` — the same endpoint that Settings save writes to. Fixing BUG-33 (settings persistence) is a prerequisite for a correct BUG-34 implementation (Open Folder should open the user-configured output dir, not a hardcoded path).

### BUG-35 + Scrollbar CSS
The existing scrollbar CSS in `index.css:310-321` sets thumb color and visibility but does not affect thumb size. Thumb size is purely proportional to content ratio, so reducing vertical bloat (BUG-35 fix) will automatically improve thumb size.

---

## Verification

- No source files were edited.
- No tests were run or modified.
- No builds were performed.
- All file:line references verified via direct read of source.
