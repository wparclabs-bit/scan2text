# S11-PREP-GDRIVE-TEST-AND-VERSION-JSON

**Date:** 2026-08-20
**Phase:** PREP (preparation for downstream download fix)
**Status:** COMPLETE — artifacts authored, QA script ready for CEO execution

## Objective
Author the version.json artifact at the portable ROOT and author a CEO-executed PowerShell QA script that probes GDrive direct-download URL forms.

## Tasks Completed

### Task 1: Disk Truth (Hashes + Sizes)
| File | SHA256 | Size (bytes) |
|---|---|---|
| vlm.gguf | `3FBA6D94312E550575A92D55CFFB8D75997BF68A9F133C92AB6AD7F0BF2BC93E` | 811,843,498 |
| mmproj.gguf | `7E371704E8F3C88638830E52866DFA88B2FD383155E3A0F9484E4CE037FDD42F` | 204,987,079 |

### Task 2: version.json (6-key schema)
Created at two locations with identical content:
- **Portable root:** `D:\Scan2Text\version.json`
- **Repo copy:** `D:\WingAI\Projects\scan2text\version.json`

Schema (exactly 6 keys):
```json
{
  "vlm_download_url": "https://drive.google.com/uc?export=download&confirm=t&id=1K5jfXMnYvc4bHNwxJDKcq8onTB_QRu1A",
  "vlm_sha256": "3FBA6D94312E550575A92D55CFFB8D75997BF68A9F133C92AB6AD7F0BF2BC93E",
  "vlm_size_bytes": 811843498,
  "mmproj_download_url": "https://drive.google.com/uc?export=download&confirm=t&id=1Ql4VjslRZpAK0_9sgVVTeyQQcqtEj9jO",
  "mmproj_sha256": "7E371704E8F3C88638830E52866DFA88B2FD383155E3A0F9484E4CE037FDD42F",
  "mmproj_size_bytes": 204987079
}
```

GDrive IDs (CEO-provided):
- vlm: `1K5jfXMnYvc4bHNwxJDKcq8onTB_QRu1A`
- mmproj: `1Ql4VjslRZpAK0_9sgVVTeyQQcqtEj9jO`

URL form: `https://drive.google.com/uc?export=download&confirm=t&id=FILE_ID`

### Task 3: QA Script
Authored at `second-brain/02-QA/qa-gdrive-download-test.ps1`.

Tests mmproj ONLY, three URL forms in sequence:
1. **Attempt 1 (share URL):** `https://drive.google.com/file/d/1Ql4VjslRZpAK0_9sgVVTeyQQcqtEj9jO/view?usp=sharing`
2. **Attempt 2 (uc no confirm):** `https://drive.google.com/uc?export=download&id=1Ql4VjslRZpAK0_9sgVVTeyQQcqtEj9jO`
3. **Attempt 3 (uc + confirm=t):** `https://drive.google.com/uc?export=download&confirm=t&id=1Ql4VjslRZpAK0_9sgVVTeyQQcqtEj9jO`

For each: reports HTTP status, Content-Length header, actual downloaded size, GGUF magic check (first 4 bytes = `0x47 0x47 0x55 0x46`). Deletes temp file after non-successful attempt.

### Task 4: QA Script NOT executed by Kilo
Script is CEO-executed per protocol.

### Task 5: Obsidian Updated
- `second-brain/00-Current-State.md`: prepended S11-PREP entry, rotated S11-GATE4 to archive.
- `second-brain/01-Agent-Memory/Archive/state-history.md`: appended rotated entry.
- `second-brain/01-Agent-Memory/Phase-11/slice-S11-PREP-GDRIVE-TEST-AND-VERSION-JSON.md`: this file.

## Non-Goals (verified not touched)
- Zero source files modified.
- Zero downloads performed by Kilo.
- No dependency installation.
- No rebuilds.
- No files placed in `D:\Scan2Text\settings`.

## CEO Execution Command
```powershell
pwsh -ExecutionPolicy Bypass -File "D:\WingAI\Projects\scan2text\second-brain\02-QA\qa-gdrive-download-test.ps1"
```

## Verification
- `D:\Scan2Text\version.json` parses as valid JSON with exactly 6 keys.
- Hashes are 64-hex, sizes match `Get-Item` lengths.
- QA script exists at `second-brain/02-QA/qa-gdrive-download-test.ps1`.

## Context
Continuation of S11-DIAG-DOWNLOADER-SCHEMA which identified three root causes: (1) `Path.cwd()` bug, (2) no GDrive >100MB handling, (3) version.json not at portable root. This slice addresses (3) by authoring the correct version.json and preparing QA for (2).
