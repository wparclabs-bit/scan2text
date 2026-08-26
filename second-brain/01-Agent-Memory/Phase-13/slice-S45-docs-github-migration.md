# Slice S45 — Docs GitHub Migration

**Date:** 2026-08-24
**Phase:** 13
**Status:** COMPLETE

## Context

Today's CEO locked three decisions that override older ADR-007 assumptions about Google Drive:

1. **AI model binaries are hosted on GitHub Releases** (not Google Drive). GitHub Releases handles 1GB+ GGUF files without the 100MB HTML warning page issue that plagued GDrive.
2. **Security contact email is wp.arc.labs@gmail.com** (replaces placeholder).
3. **Repo strategy is Option A:** Create fresh private repo NOW, push clean history, develop v1.1 there, flip public at v1.1.

## Tasks Completed

### 1. AGENTS.md Section 8
- Changed "Binaries on GDrive, version.json on GitHub (ADR-007)" → "Binaries on GitHub Releases, version.json on GitHub (ADR-007)"

### 2. ADR-007 (main)
- Updated decision text: "app zip + model GGUFs on Google Drive" → "app zip + model GGUFs on GitHub Releases"
- Updated consequences: "GDrive distribution removes need for large GitHub Releases" → "GitHub Releases handles 1GB+ GGUF files without the 100MB HTML warning page issue"

### 3. docs/GITHUB-READINESS.md
- Item 5: "Distribution stays on Google Drive regardless" → "Distribution on GitHub Releases"
- Public launch plan: Updated to Option A (Create fresh private repo now under new username, push clean history, develop v1.1 there, flip public at v1.1)

### 4. docs/SECURITY.md
- Replaced `[VERIFY: security contact email]` with `wp.arc.labs@gmail.com`
- Updated threat model: "The model downloader fetches from Google Drive" → "The model downloader fetches from GitHub Releases"

### 5. README.md
- Updated install step: "Download the portable ZIP from the Scan2Text Google Drive folder" → "Download the portable ZIP from the Scan2Text GitHub Releases page"

### 6. docs/ARCHITECTURE.md
- Updated update mechanism: "Application ZIPs and model GGUF files are hosted on Google Drive" → "Application ZIPs and model GGUF files are hosted on GitHub Releases"

### 7. docs/BUILD-AND-RELEASE.md
- Updated release flow: "Upload to Google Drive" → "Upload to GitHub Releases"
- Updated caveat: "Google Drive caveat" → "GitHub Releases note" with explanation about 100MB HTML warning page issue

### 8. second-brain/04-Product/02-functional-requirements.md
- Updated §8: "binaries on GDrive" → "binaries on GitHub Releases"
- Updated §13: "hosted on Google Drive; download_url points to GDrive" → "hosted on GitHub Releases; download_url points to GitHub Releases"

### 9. second-brain/03-Architecture/Repo-Audit/s44-security-review.md
- Updated distribution method: "Google Drive" → "GitHub Releases"
- Updated threat model: "from GDrive URLs in version.json" → "from GitHub Releases URLs in version.json"
- Updated known non-issues: "fetches from Google Drive" → "fetches from GitHub Releases"
- Updated threat table: "GDrive link exposure" → "GitHub Releases link exposure"
- Updated CEO decision gate: "Legal compliance for GDrive distribution" → "Legal compliance for GitHub Releases distribution"

### 10. second-brain/03-Architecture/Repo-Audit/s42d-docs-fact-pack.md
- Updated §4e: "binaries on GDrive" → "binaries on GitHub Releases"

### 11. second-brain/03-Architecture/Repo-Audit/s42c-evidence.md
- Updated File 1 evidence: "Distribution via Google Drive + in-app downloader" → "Distribution via GitHub Releases + in-app downloader"
- Updated File 2 evidence: "Distribution: app zip + model GGUFs on Google Drive" → "Distribution: app zip + model GGUFs on GitHub Releases"

### 12. second-brain/00-Current-State.md
- Updated phase to S45-DOCS-GITHUB-MIGRATION (COMPLETE)
- Updated date to 2026-08-24
- Added S45 summary to status and changelog

## Files Not Modified (Historical)

The following files contain historical GDrive/Google Drive mentions in Phase-7 and Phase-11 agent memory slices. These are left unchanged as they document past decisions and work:
- `second-brain/01-Agent-Memory/Phase-7/slice-8-7c-dual-model-schema.md`
- `second-brain/01-Agent-Memory/Phase-7/slice-8-6-distribution.md`
- `second-brain/01-Agent-Memory/Phase-7/slice-live-fire-prep.md`
- `second-brain/01-Agent-Memory/Phase-7/slice-8-2-doc-lock.md`
- `second-brain/01-Agent-Memory/Phase-11/slice-S11-DIAG-DOWNLOADER-SCHEMA.md`
- `second-brain/01-Agent-Memory/Phase-11/slice-S11-PREP-GDRIVE-TEST-AND-VERSION-JSON.md`
- `second-brain/01-Agent-Memory/Phase-11/slice-S12-PREP-VERSION-JSON-GITHUB.md`
- `second-brain/02-QA/qa-gdrive-download-test.ps1`

## Verification

- `Select-String -Path "docs\*.md", "README.md", "AGENTS.md" -Pattern "GDrive|Google Drive"` returns only one match in `docs\BUILD-AND-RELEASE.md:67` which is the new explanatory text about why we switched ("...that affected Google Drive"). This is a historical reference, not a current GDrive hosting mention.
- `Select-String -Path "docs\SECURITY.md" -Pattern "wp.arc.labs@gmail.com"` returns one match at line 20.

## Outcome

All documentation now reflects the three CEO locked decisions. No source code was touched. The ADR-007 superseded file (`ADR-007-feedback-cpu-budget-gdrive-distribution.md`) was left as-is since it is marked SUPERSEDED and serves as historical record.
