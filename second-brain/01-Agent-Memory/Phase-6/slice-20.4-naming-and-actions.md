# Slice 20.4 — Naming Utility & Preview Panel Action Header

**Status:** ✅ Complete  
**Date:** 2026-08-06  
**Baseline Tests:** 362 → 398 (+36 new tests passing)

---

## What Changed

### 1. Naming Utility (Pure TypeScript)
- **File:** `src/lib/naming.ts` + `src/lib/naming.test.ts`
- **Function:** `generateOutputFilename(originalFileName, completionDate, existingFiles)`
- **Logic:**
  - Extracts stem from filename, removes invalid Windows chars (`<>:"/\|?*`)
  - Replaces spaces with underscores, normalizes to lowercase
  - Formats date as `_{HHmm}_{yyyyMMdd}.md` (24h zero-padded)
  - Collision handling: appends `_2`, `_3`, etc. before `.md` extension
- **Example:** `invoice.pdf` + `2026-08-06T17:38:00` → `invoice_1738_20260806.md`

### 2. I18N Keys Added
- **Files:** `src/locales/en.json`, `src/locales/id.json`
- **Keys:**
  - `preview.copyBtn`: "Copy Markdown" / "Salin Markdown"
  - `preview.openFolderBtn`: "Open Folder" / "Buka Folder"
  - `toast.copySuccess`: "Markdown copied to clipboard!" / "Markdown disalin ke clipboard!"
  - `toast.openFolderDemo`: Demo mode notification text

### 3. Preview Panel UI Update
- **File:** `src/components/layout/panels/PreviewPanel.tsx`
- **Layout Change:** Right column (70%) now flex-column:
  - Top: Action Header (conditionally rendered when `job.status === 'completed'`)
  - Bottom: Markdown Preview (`flex-1`, `overflow-y-auto`)
- **Action Header Features:**
  - Two buttons aligned right: `[📋 Copy]` and `[📂 Open Folder]`
  - Copy button: Uses `navigator.clipboard.writeText()` + Sonner success toast
  - Open Folder button: Triggers demo info toast (no real file system access)

### 4. Tests Updated & Added
- **Naming Utility:** 29 exhaustive Vitest unit tests covering:
  - Basic transformation, date formatting, collision handling
  - Edge cases (empty strings, unicode, special chars, timezones)
- **PreviewPanel:** 6 new integration tests verifying:
  - Action header visibility based on job status
  - Clipboard API invocation and toast display
  - Demo toast trigger on Open Folder click

---

## Test / Typecheck / Build Results

| Command | Result | Notes |
|---------|--------|-------|
| `npm run test -- --run` | ✅ 398/398 passing | Baseline was 362; +36 new tests |
| `npm run typecheck` | ✅ PASS | Zero errors after fixing `global` → `window` in test |
| `npm run build` | ✅ PASS | Built in 771ms, ~450KB JS output |

---

## Files Changed Summary

**New Files:**
- `src/lib/naming.ts` (56 lines)
- `src/lib/naming.test.ts` (187 lines)

**Modified Files:**
- `src/components/layout/panels/PreviewPanel.tsx` (+~40 lines)
- `src/components/layout/panels/PreviewPanel.test.tsx` (+~80 lines)
- `src/locales/en.json` (+4 keys)
- `src/locales/id.json` (+4 keys)

**Obsidian Updates:**
- Updated: `second-brain/00-Current-State.md`
- Created: `second-brain/01-Agent-Memory/Phase-6/slice-20.4-naming-and-actions.md`

---

## Non-Goals Confirmed NOT Implemented
- ❌ In-app Markdown editing (right panel remains read-only)
- ❌ Real file system saving or Node.js `fs` modules
- ❌ Complex fake Windows paths (`C:\...`)
- ❌ Settings modal (deferred to Slice 20.5)
