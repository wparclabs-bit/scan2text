# S12-PREP-VERSION-JSON-GITHUB

**Date:** 2026-08-20
**Status:** COMPLETE
**Type:** PREP — Doc-only, zero source edits

## Goal
Rewrite both `version.json` artifacts from dead GDrive confirm=t URLs to GitHub Release zip-aliased URLs. Update the locked-decision register line in AGENTS.md Section 8.

## Changes Made

### version.json (repo root)
**Path:** `D:\WingAI\Projects\scan2text\version.json`

| Key | Old Value | New Value |
|---|---|---|
| `vlm_download_url` | `https://drive.google.com/uc?export=download&confirm=t&id=1K5jfXMnYvc4bHNwxJDKcq8onTB_QRu1A` | `https://github.com/wPAILabs/scan2text/releases/download/OCR/vlm.zip` |
| `vlm_sha256` | `3FBA6D94312E550575A92D55CFFB8D75997BF68A9F133C92AB6AD7F0BF2BC93E` (uppercase) | `3fba6d94312e550575a92d55cffb8d75997bf68a9f133c92ab6ad7f0bf2bc93e` (lowercase) |
| `vlm_size_bytes` | `811843498` | `811843498` (unchanged) |
| `mmproj_download_url` | `https://drive.google.com/uc?export=download&confirm=t&id=1Ql4VjslRZpAK0_9sgVVTeyQQcqtEj9jO` | `https://github.com/wPAILabs/scan2text/releases/download/OCR/mmproj.zip` |
| `mmproj_sha256` | `7E371704E8F3C88638830E52866DFA88B2FD383155E3A0F9484E4CE037FDD42F` (uppercase) | `7e371704e8f3c88638830e52866dfa88b2fd383155e3a0f9484e4ce037fdd42f` (lowercase) |
| `mmproj_size_bytes` | `204987079` | `204987079` (unchanged) |

### version.json (portable root)
**Path:** `D:\Scan2Text\version.json` — identical changes as above.

### AGENTS.md Section 8
Replaced locked-decision line:
- **Old:** `Binaries on GDrive, version.json on GitHub (ADR-007).`
- **New:** `Model binaries on GitHub Releases (zip-aliased); version.json on GitHub + portable root (ADR-007).`

### second-brain/00-Current-State.md
- Prepend S12 PREP entry to Recent Changelog.
- Rotated oldest entry (S11-DIAG-THEME-LANG-PERSISTENCE) to `Archive/state-history.md`.

## Verification
- Both files parse via `ConvertFrom-Json` — valid JSON confirmed.
- Exactly 6 keys present in each file.
- Both `*_size_bytes` values are Int64 (integer type).
- Both `*_sha256` values are 64-character lowercase hex strings, validated against `[0-9a-f]{64}` regex.
- Files are byte-identical (JSON-compressed comparison confirms equality).

## Non-Goals (not touched)
- No source code edits.
- No deploy script edits (deferred to GATE slice).
- No downloads of model binaries.
- No rebuilds.

## Artifacts
- `D:\WingAI\Projects\scan2text\version.json`
- `D:\Scan2Text\version.json`
- `AGENTS.md` (Section 8 locked-decision line updated)
- `second-brain/00-Current-State.md` (changelog rotated)
- `second-brain/01-Agent-Memory\Archive\state-history.md` (oldest entry appended)
