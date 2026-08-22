# S27-DIAG-DOWNLOAD-404 — Root Cause Report

**Date:** 2026-08-23  
**Slice:** S27 (Phase 11)  
**Status:** ROOT CAUSE IDENTIFIED — BLOCKED pending remediation  
**Baseline:** S26 deployed  

---

## Executive Summary

The downloader modal appears (S24 verified) but backend log shows:
```
Download failed for vlm.gguf: HTTP Error 404: Not Found
```

**Root cause:** GitHub Release with tag `OCR` and assets `vlm.zip`/`mmproj.zip` does not exist or is not accessible from the deployed environment. Additionally, even if URLs resolved, the downloader saves ZIP archives as `.gguf` without extraction, rendering them unusable by the engine.

---

## Evidence Block 1: Deployed version.json Raw Content

**Location:** `D:\Scan2Text\version.json`

```json
{
  "vlm_download_url": "https://github.com/wPAILabs/scan2text/releases/download/OCR/vlm.zip",
  "vlm_sha256": "3fba6d94312e550575a92d55cffb8d75997bf68a9f133c92ab6ad7f0bf2bc93e",
  "vlm_size_bytes": 811843498,
  "mmproj_download_url": "https://github.com/wPAILabs/scan2text/releases/download/OCR/mmproj.zip",
  "mmproj_sha256": "7e371704e8f3c88638830e52866dfa88b2fd383155e3a0f9484e4ce037fdd42f",
  "mmproj_size_bytes": 204987079
}
```

**Repo-source version.json** (`D:\WingAI\Projects\scan2text\version.json`): Identical content.

---

## Evidence Block 2: Exact Requested URL String

**Code path:** `src/scan2text/services/model_downloader_service.py`

| Line | Code | Purpose |
|------|------|---------|
| 21-24 | `_MODEL_SPECS = [("vlm", "vlm.gguf"), ("mmproj", "mmproj.gguf")]` | Hardcoded output filenames |
| 141 | `url = version_data.get(f"{key_prefix}_download_url")` | Reads URL from version.json |
| 151 | `"filename": key_prefix + ".gguf"` | Hardcoded `.gguf` extension |
| 175 | `url = model_cfg["url"]` | Uses URL from version.json (`.zip`) |
| 191-192 | `urlopen(req)` | Downloads from `.zip` URL |
| 245 | `logger.error("Download failed for %s: %s", filename, exc)` | Logs error with `.gguf` filename |

**URL constructed:** `https://github.com/wPAILabs/scan2text/releases/download/OCR/vlm.zip`  
**Error message shows:** `vlm.gguf` (output filename, not URL path)

---

## Evidence Block 3: Per-URL Status Codes

| URL | Status | Notes |
|-----|--------|-------|
| `https://github.com/wPAILabs/scan2text/releases/download/OCR/vlm.zip` | **404 Not Found** | Release tag `OCR` does not exist or assets not uploaded |
| `https://github.com/wPAILabs/scan2text/releases/download/OCR/mmproj.zip` | **404 Not Found** | Same root cause |
| `https://github.com/wPAILabs/scan2text/releases/download/OCR/vlm.gguf` | **404 Not Found** | Confirms release/assets absent |

**GitHub base connectivity:** `https://github.com` returns 200 OK (network functional).  
**API probe:** `GET /repos/wPAILabs/scan2text/releases/tags/OCR` returns 404.

---

## Evidence Block 4: File:Line Citations

### URL Construction
- **`model_downloader_service.py:141`** — Reads `vlm_download_url` from version.json
- **`model_downloader_service.py:151`** — Hardcodes `"filename": key_prefix + ".gguf"`
- **`model_downloader_service.py:22-24`** — `_MODEL_SPECS` tuples define fixed `.gguf` targets

### Zip-Extraction Handling
- **`grep zipfile src/**/*.py`** → **No matches found**
- **`grep ZipFile src/**/*.py`** → **No matches found**
- **`grep extract src/**/*.py`** → 7 matches, all in `postprocess_service.py` (image crop extraction, unrelated)

**Conclusion:** Zero zipfile import/usage exists in the downloader or any backend service.

### Test Evidence
- **`tests/unit/services/test_model_downloader_service.py:355-391`** — `TestFixedTargetNames` class explicitly tests that `.zip` URLs write to `.gguf` files (S12 design decision)
- **Line 387-388:** `assert (models_dir / "vlm.gguf").exists()` — test passes with mocked ZIP data

---

## Root Cause Analysis

### Primary Cause: GitHub Release Absent
The GitHub Release with tag `OCR` and assets `vlm.zip`/`mmproj.zip` **does not exist** (or is not accessible). All three URL probes return 404 from GitHub's servers.

### Secondary Cause: Design Flaw — No Zip Extraction
Even if the release existed, the downloader has a **critical design flaw**:
1. Downloads ZIP archive from `.zip` URL
2. Saves it as `vlm.gguf` (no extraction)
3. Engine attempts to load `vlm.gguf` as GGUF binary → fails

**This was intentional per S12** (`TestFixedTargetNames` validates `.zip` → `.gguf` mapping), but **S12 never implemented extraction logic**. The assumption that engines can read ZIP files named `.gguf` is incorrect.

---

## Fix Design (No Code Changes in This Slice)

### Option A: Publish Release + Add Extraction (Recommended)
1. **Upload assets** to GitHub Release `OCR` tag as `vlm.zip` and `mmproj.zip`
2. **Add zipfile extraction** to `model_downloader_service.py`:
   - After download, detect `.zip` extension in URL
   - Extract archive to `models/` directory
   - Verify extracted file matches expected SHA256/size
3. **Update version.json** to include extraction metadata if needed

### Option B: Change version.json to Direct GGUF URLs
1. **Upload raw `.gguf` files** to GitHub Release (if preferred by CEO)
2. **Update version.json** URLs to point to `.gguf` assets
3. **No code changes** required (downloader already handles `.gguf` URLs)

### Option C: Hybrid — Zip Alias with Extraction
1. Keep `.zip` URLs in version.json (CEO locked decision)
2. Add extraction logic to downloader
3. Extract to `.gguf` filename (preserves S12 design)

---

## Verification Checklist

- [x] Deployed version.json dumped and documented
- [x] Repo-source version.json located and compared
- [x] Graphify query executed for downloader URL logic
- [x] `model_downloader_service.py` read and annotated
- [x] Zipfile search completed (zero matches)
- [x] All three URLs probed with status codes recorded
- [x] Root cause stated in one sentence
- [x] Fix design documented (no code changes)
- [x] Git status clean (zero source files modified)

---

## Related Artifacts

- `second-brain/01-Agent-Memory/Phase-11/slice-S12-FIX-DOWNLOADER-PATH-TARGETS.md` — S12 fix that added `TestFixedTargetNames`
- `second-brain/01-Agent-Memory/Phase-11/slice-S11-DIAG-DOWNLOADER-SCHEMA.md` — S11 downloader schema diagnosis
- `second-brain/03-Architecture/ADRs/ADR-007-model-downloader-design.md` — CEO locked decisions (if exists)

---

## Final Status

**BLOCKED** — Waiting on CEO decision: publish GitHub Release assets OR change version.json to direct GGUF URLs. No source edits made per slice constraints.
