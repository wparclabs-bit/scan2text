# ADR-007 — Feedback channel, CPU budget, GDrive distribution

Status: APPROVED (CEO signed 2026-08-10) · Phase: 7

## Context

Target users are non-technical (GitHub Issues too frictionful); full-CPU OCR makes PCs unusable (churn risk); ~1GB binaries need a free, familiar host for low-connectivity users.

## Decisions

### 1. Feedback button (Google Form + offline queue)

Icon-only button in BottomBar RIGHT zone next to Share, translated tooltip. Online click opens Google Form (FEEDBACK_FORM_URL placeholder until CEO provides). Offline click opens in-app dialog (textarea + optional contact) saving timestamped file to feedback/pending/. On launch, if online and pending files exist: toast with action opens pre-filled form URL and moves file to feedback/sent/. No silent auto-upload (NFR-02).

### 2. CPU budget (auto = 60% of logical cores)

cpu_threads=0 (auto) = 60% of logical cores (floor, min 1); explicit values still override; worker priority stays lowered.

### 3. Distribution via Google Drive + in-app first-run model downloader

App zip + model GGUFs on Google Drive (anyone-with-link); version.json stays GitHub-hosted; download_url points to GDrive. First-run in-app model auto-download: streaming to models/ via .part then atomic rename, expected-size verification, progress + cancel, translated errors.

### 4. Monthly release cadence

Monthly releases only, vigorously tested.

## Consequences

- Feedback channel lowers barrier for non-technical users while preserving NFR-02 privacy (no silent upload).
- CPU cap prevents PC freeze during OCR — usability trade-off favors retention over raw speed.
- GDrive distribution removes need for large GitHub Releases; version.json remains the source of truth for update checks.
- Monthly cadence reduces release overhead; each release must pass full QA gate before shipping.

Supersedes: nothing; extends ADR-006 and PRD §17.
