# Slice 8.6 — Distribution Setup (Version Manifest & Update Docs)

Date: 2026-08-11
Phase: Phase 7 — S8.6 COMPLETE

## What Changed

- Created `version.json` at repo root with schema: `app_version`, `app_download_url`, `model_version`, `model_download_url`, `model_sha256`, `model_size_bytes`, `release_notes`. All values are placeholders pending CEO upload of binaries to Google Drive.
- Created `docs/UPDATE.md` — user-friendly manual update guide targeting non-technical users. Covers automatic model updates and step-by-step app zip replacement with safety warning about `settings`/`output` folders.
- Added "Updating" section to `README.md` linking to `docs/UPDATE.md`.
- No application code modified.

## Key Decisions

- `version.json` is the single source of truth for both the Model Downloader (S8.7) and any future auto-update logic.
- Placeholder URLs use `https://drive.google.com/PLACEHOLDER_*_ID` pattern; CEO fills real IDs before first release.
- `model_sha256` placeholder (`PLACEHOLDER_HASH_64_CHARS`) will be replaced with actual hash after binary build.
- Update docs use plain language, no technical jargon; target audience is non-technical users per ADR-007.

## Test Coverage

No tests added (doc-only slice). `version.json` validated as valid JSON via read-back.

## Open Questions

- None. S8.7 (Model Downloader UI) will consume this manifest.
