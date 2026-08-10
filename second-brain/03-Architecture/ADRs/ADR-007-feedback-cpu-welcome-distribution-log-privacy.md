# ADR-007 — Feedback channel, CPU budget, expectations screen, distribution & model acquisition, log privacy

Status: APPROVED (CEO signed 2026-08-10) · Phase: 7

## Context

Post-port hardening for shipping v1 to non-technical, low-connectivity users; CEO grill answers 2026-08-10.

## Decisions

### 1. Feedback channel = Google Form + offline queue

Icon-only button in BottomBar RIGHT zone, immediately LEFT of Share, translated tooltip. Online click opens FEEDBACK_FORM_URL (placeholder constant until CEO provides the form). Offline click opens in-app dialog (single textarea + optional contact) saving a timestamped file to feedback/pending/. On launch, if online and pending files exist: translated toast with action opens the pre-filled form URL and moves the file to feedback/sent/. NO silent auto-send (NFR-02; the user always presses submit in the form).

### 2. CPU budget: cpu_threads=0 (auto) = 60% of logical cores (floor, min 1)

Explicit values still override; worker priority stays lowered. Why: OCR must not freeze the user's PC; accuracy over speed (NFR-03).

### 3. First-run expectations screen (NOT legal T&C)

Plain "Welcome to Scan2Text" notice. Two-step first-run wizard: step 1 expectations notice, step 2 output folder picker (existing FR-01). Notice shows on EVERY launch until the user checks "Don't show again" (persisted as hide_welcome_notice in settings.json); re-openable from Settings. Bullets (EN + ID):
(a) works fully offline; your files never leave this PC;
(b) no accounts, no telemetry, no document content or file names in logs;
(c) big or dense files can take several minutes; the app stays responsive;
(d) output is best-effort Markdown — always double-check important numbers.

### 4. Distribution: app zip + model GGUFs on Google Drive

(anyone-with-link); version.json stays GitHub-hosted; download_url points to GDrive. First run with missing models: in-app downloader streams from GDrive into models/ with progress + cancel and verifies expected byte size; failure → translated error + retry. Manual zip replacement remains supported.

### 5. Log privacy + rotation

Logs contain NO file names and NO content; fields = extension + byte count + page count + duration + error/warning code + model version + timestamp. Rotation size-based: maxBytes 1 MB, backupCount 1 (app.log + app.log.1). Why: a size cap makes disk exhaustion impossible; calendar deletion depends on human memory.

### 6. Release cadence: monthly only, vigorously tested

(LTS mindset).

## Consequences

- Feedback channel lowers barrier for non-technical users while preserving NFR-02 privacy (no silent upload).
- CPU cap prevents PC freeze during OCR — usability trade-off favors retention over raw speed.
- GDrive distribution removes need for large GitHub Releases; version.json remains the source of truth for update checks.
- Monthly cadence reduces release overhead; each release must pass full QA gate before shipping.
- Size-based log rotation guarantees bounded disk usage regardless of usage pattern.
- Welcome expectations screen sets realistic accuracy/performance expectations upfront, reducing support burden.

Supersedes: PRD §9/§18 "filename + byte count" log lines; FR-09 cpu_threads "0 = automatic" semantics. Does not supersede ADR-006.
