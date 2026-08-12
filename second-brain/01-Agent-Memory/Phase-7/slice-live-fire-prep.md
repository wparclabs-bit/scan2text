# Slice: Live-Fire-Prep-Dummy-Files

Date: 2026-08-11
Phase: Phase 7 (Real Backend)
Slice: live-fire-prep
Baseline: S8.7a + S8.7b complete; version.json schema locked.
Goal: Generate dummy model files with exact SHA256 hashes for live-fire download testing.

## What Changed

- Created `tools/prep_dummy_gdrive.py` — automation script that generates dummy `.gguf` files and prints copy-paste-ready JSON snippets.
- Generated `tools/dummy_models/vlm.gguf` (5 MB, SHA256 `c036cbb7...`)
- Generated `tools/dummy_models/mmproj.gguf` (2 MB, SHA256 `5647f05e...`)

## Key Decisions

- Script uses `py -3.12` as locked interpreter per Phase 7 lesson.
- Dummy files are zeroed bytes — fast to generate, deterministic hashes.
- JSON output keys match exactly what `ModelDownloaderService.start_download()` reads from `version.json`: `app_version`, `app_download_url`, `model_version`, `model_download_url`, `model_sha256`, `model_size_bytes`, `release_notes`.
- `model_version` is derived from filename stem (e.g., `vlm.gguf` → `model_version: "vlm"`), which the downloader uses to name the local file `{model_version}.gguf`.
- Two standalone valid JSON blocks printed (one per model); each is independently copy-pasteable into `version.json`. No separator lines between blocks (those made concatenated output invalid JSON).
- Placeholder IDs use `{STEM_UPPER}_ID` pattern (e.g., `PLACEHOLDER_VLM_ID`, `PLACEHOLDER_MMPROJ_ID`) — no "ZIP" references per ADR-006 raw .gguf lock.

## Test Coverage

- No new application code; no tests added.
- Verification: `Get-ChildItem tools/dummy_models` confirms exact sizes (5242880 / 2097152 bytes).
- Script runs clean with `py -3.12 tools/prep_dummy_gdrive.py`.

## Manual GDrive Upload Steps (CEO)

1. Upload `tools/dummy_models/vlm.gguf` and `tools/dummy_models/mmproj.gguf` to Google Drive as shareable links.
2. Extract the file ID from each share link (the long alphanumeric string after `/d/` or `id=`).
3. Convert GDrive share links to direct download URLs:
   ```
   https://drive.google.com/uc?export=download&id=<FILE_ID>
   ```
   or equivalently:
   ```
   https://drive.google.com/uc?id=<FILE_ID>&export=download
   ```
4. Copy the JSON snippet for the model you want to test first into `version.json`, replacing `PLACEHOLDER_VLM_ID` or `PLACEHOLDER_MMPROJ_ID` with the actual GDrive file ID.
5. Run the backend and trigger a download via `POST /api/download/start`.
6. After testing one model, swap the JSON snippet for the other model and repeat.

## Open Questions

- None. Ready for CEO manual upload and live-fire test.
