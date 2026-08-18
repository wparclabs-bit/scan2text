# S11-FIX60 — Welcome Screen 20MB Copy + GFM Verify

**Date:** 2026-08-19
**Phase:** Phase 11
**Status:** COMPLETE

## Goal
1. Update Welcome/Expectations modal body text to announce the 20MB file limit in a friendly, casual tone.
2. Verify that `remark-gfm` is properly wired into `MarkdownPreview.tsx` for GitHub Flavored Markdown support.

## Changes

### 1. Welcome Modal Body Text
- **`frontend/src/components/layout/WelcomeModal.tsx`**: Replaced 4 separate bullet `<p>` elements (`bullet1`–`bullet4`) with a single `<p>` rendering `t('welcome.body')`.
- **`frontend/src/locales/en.json`**: Replaced `bullet1`–`bullet4` with `body`:
  > "Turn your scanned documents into editable text — no internet required. Quick heads-up: Files must be under 20MB (that's about 10-20 photos or a short PDF). PDFs can be up to 50 pages. We accept PNG, JPG, WEBP, and PDF. Ready? Drop your files below!"
- **`frontend/src/locales/id.json`**: Same replacement with Indonesian translation:
  > "Ubah dokumen hasil scan Anda menjadi teks yang bisa diedit — tanpa internet. Catatan cepat: File harus di bawah 20MB (sekitar 10-20 foto atau PDF pendek). PDF bisa sampai 50 halaman. Kami menerima PNG, JPG, WEBP, dan PDF. Siap? Jatuhkan file Anda di bawah!"

### 2. Test & i18n Setup Updates
- **`frontend/src/test-setup.ts`**: Updated both `en` and `id` resource objects — replaced `bullet1`–`bullet4` with `body` key in the `welcome` namespace.
- **`frontend/src/components/layout/WelcomeModal.test.tsx`**: Added `initI18n` and `en` imports; called `initI18n({ en: { translation: en } })` in `beforeEach`. Updated the bullet test to assert the new `body` copy (searches for "Turn your scanned documents", "20MB", and "50 pages").

### 3. GFM Verification (no changes needed)
- **`frontend/src/components/layout/panels/MarkdownPreview.tsx`**: Already imports `remarkGfm` (line 2) and passes it via `remarkPlugins={[remarkGfm]}` (line 18). Confirmed wired correctly.

## Verification
- `Select-String "20MB" frontend/src/locales/en.json` → matches found (including new `body` key).
- `Select-String "remarkGfm" frontend/src/components/layout/panels/MarkdownPreview.tsx` → matches on import and usage lines.
- `npm run typecheck` → clean (zero errors).
- `npm run test` → 637 passed, 0 failures.

## Notes
- The old 4-bullet structure was a simple list of features. The new single-paragraph `body` is friendlier and more conversational, matching the CEO's "Friendly & Casual" tone directive for the 20MB announcement.
- GFM was already correctly configured from a prior slice; this verification confirms no regression.
