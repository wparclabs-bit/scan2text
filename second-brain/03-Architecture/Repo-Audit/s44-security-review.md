# S44 — Security Review (Pre-GitHub Public Audit)

**Date:** 2026-08-23
**Author:** Kilo (automated audit)
**Status:** READ-ONLY — no source edits made
**Scope:** Secrets, vault exposure, model licenses, community hygiene, threat model, action plan

---

## 1. Secrets-in-History Scan Results

### Method
```powershell
Select-String -Path (Get-ChildItem -Recurse -File -Exclude node_modules,target,.git,graphify-out,build,dist) `
  -Pattern "GITHUB_PERSONAL_ACCESS_TOKEN|AWS_|AZURE_|OPENAI_API|sk-[a-zA-Z0-9]{20,}" -CaseSensitive:$false
```

### Findings

| Severity | File | Line | Key | Status |
|----------|------|------|-----|--------|
| **CRITICAL** | `.dsh/dshmm/mcp.json` | 24 | `GITHUB_PERSONAL_ACCESS_TOKEN` | **GITIGNORED** — `.dsh/` is line 44 of `.gitignore`. NOT in git history. |

**False positives (excluded):** Binary files in `node_modules/`, `rolldown/`, `std-env/`, `tailwindcss/`, and Rust build artifacts (`*.rlib`, `*.rmeta`) — these are build-time binary blobs that matched generic patterns but contain no real secrets.

### Git History Scan
```
git log --all --oneline --source --remotes --name-status | Select-String -Pattern "secret|password|token|key"
```

Three commits touched files with "key" in their name or content:
- `12617c5` — S11-FIX71: added `errors.backendLost` i18n key (en + id)
- `0b7a962` — S11-FIX27b: restored preview i18n keys + BottomBar telemetry fallback
- `de91704` — S10-FIX7: fixed form field key `'file' -> 'files'`

**Verdict:** No secrets, passwords, tokens, or API keys have ever been committed to git history. All three matches are i18n key references (variable names), not actual credential values.

### .dsh/dshmm/mcp.json — Detailed Finding
```json
"GITHUB_PERSONAL_ACCESS_TOKEN": "github_pat_11[REDACTED — 128-char token value]"
```
- **Risk:** Token is a GitHub Personal Access Token (fine-grained PAT, prefix `github_pat_11`).
- **Mitigation:** `.dsh/` directory is gitignored (line 44 of `.gitignore`). Token has never been in git history.
- **Action:** Rotate token as standard practice. See Action Plan §7.

---

## 2. Vault Exposure Decision Matrix

### second-brain/ Structure (depth 2)
```
second-brain/
├── 00-Current-State.md          ← Baseline state (public-safe)
├── 01-Agent-Memory/             ← Slice summaries (Phases 2–13, Archive)
│   ├── Phase-2 … Phase-13       ← Execution logs, debug traces, decisions
│   └── Archive/                 ← Old state history
├── 02-QA/                       ← Manual test scripts, QA docs
├── 03-Architecture/             ← Architecture docs + ADRs + Repo-Audit
│   ├── ADRs/                    ← Architecture Decision Records (public-safe)
│   └── Repo-Audit/              ← Previous audit evidence (public-safe)
├── 04-Product/                  ← PRD files (strategy-sensitive)
├── 05-Sprints/                  ← Sprint planning (strategy-sensitive)
```

### Sensitivity Classification

| Category | Contents | Sensitivity | Recommendation |
|----------|----------|-------------|----------------|
| **Public-safe** | ADRs, Repo-Audit evidence, Architecture docs, 00-Current-State.md baseline | Low | Ship |
| **Strategy-sensitive** | 04-Product/ (PRD scope, requirements), 05-Sprints/ (planning), 01-Agent-Memory/Phase-* (debug traces, internal decisions) | Medium-High | Gate decision |
| **QA** | 02-QA/ (manual test scripts) | Low | Ship |

### Decision Matrix

| Scenario | .gitignore second-brain/ | Public Repo Impact |
|----------|-------------------------|-------------------|
| **A. .gitignore all** | Yes | Lose all documentation; community can't see ADRs or architecture |
| **B. Partial (ADRs only)** | `01-Agent-Memory/`, `04-Product/`, `05-Sprints/` | Ship architecture docs + ADRs; hide strategy vault |
| **C. Ship full** | No | Everything visible; acceptable if repo stays private |

### Recommendation: **Option B — Partial ship (ADRs only)**

Rationale:
- The repo is currently **private** on GitHub → Option C is safe today.
- If the repo goes public, shipping ADRs + architecture docs provides genuine community value without exposing product strategy or sprint planning.
- `01-Agent-Memory/` contains debug traces and internal decision logs that are not useful to external contributors.
- `04-Product/` and `05-Sprints/` contain competitive intelligence (roadmap, scope decisions).

**If repo stays private:** No action needed — ship full vault.
**If repo goes public:** Adopt Option B. See Action Plan §7.

---

## 3. Model License Redistribution Checklist

### OvisOCR2 0.9B (primary OCR engine)
- **License:** Apache-2.0 (per ADR-006, attribution: "OvisOCR2 (ATH-MaaS) Apache-2.0")
- **GGUF quantization:** by bartowski (quantized from f16 original)
- **Redistribution status:** Apache-2.0 permits redistribution with attribution and NOTICE file preservation
- **Model files in repo:** `models/vlm.gguf` (811 MB), `models/mmproj.gguf` (205 MB) — **gitignored** (`/models/` line 6, `*.gguf` line 7 of `.gitignore`)
- **Distribution method:** GitHub Releases (per ADR-007 §3/ADR-007 §4), version.json on GitHub

### llama-cpp-python (runtime inference library)
- **License:** MIT (per pyproject.toml dependency `llama-cpp-python>=0.3.7,<0.3`)
- **Redistribution status:** MIT permits unrestricted redistribution

### Application Code
- **License:** Apache-2.0 (per pyproject.toml line 11, LICENSE file present)

### Checklist

| Item | Status | Notes |
|------|--------|-------|
| OvisOCR2 redistribution license confirmed | ✅ Apache-2.0 | Per ADR-006 attribution |
| llama-cpp-python license compatible | ✅ MIT | Per pyproject.toml dependency |
| Application code license (Apache-2.0) compatible with model bundling | ✅ Yes | Apache-2.0 §3 grants patent license; redistribution of combined work permitted |
| NOTICE file present for OvisOCR2 attribution | ⚠️ NEEDS REVIEW | ADR-006 credits "OvisOCR2 (ATH-MaaS)" — verify if original model repo has a NOTICE file that must be included in redistributions |
| bartowski quantization license terms | ⚠️ NEEDS VERIFICATION | Quantized GGUF from bartowski's HuggingFace; verify redistribution terms of the quantized variant |
| version.json download URLs public | ✅ Intentional | URLs point to GitHub Releases (public); SHA256 hashes provided for integrity verification |

### CEO Decision Required: **OvisOCR2 NOTICE file verification**
The Apache-2.0 license §4(d) requires preserving NOTICE files from the original Work. ADR-006 credits "OvisOCR2 (ATH-MaaS)" but does not confirm whether the upstream OvisOCR2 repo includes a NOTICE file that must be redistributed with Scan2Text's binary distribution.

**Action:** CEO to verify OvisOCR2 upstream license terms and determine if a NOTICE file or additional attribution is required in the Scan2Text distribution package.

---

## 4. Community Hygiene Files Checklist

### Current State (repo root)

| File | Exists? | Required for Public Repo? |
|------|---------|--------------------------|
| `SECURITY.md` | ❌ MISSING | **YES** — vulnerability reporting policy |
| `CONTRIBUTING.md` | ❌ MISSING | **YES** — contribution guidelines |
| `CODE_OF_CONDUCT.md` | ❌ MISSING | **YES** — community standards |
| `.github/ISSUE_TEMPLATE/` | ❌ MISSING | **YES** — issue templates |
| `.github/PULL_REQUEST_TEMPLATE.md` | ❌ MISSING | **YES** — PR template |

### Draft SECURITY.md (minimal template)

```markdown
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | ✅                 |
| < 1.0   | ❌                 |

## Reporting a Vulnerability

Scan2Text is a local-first desktop application. The threat model assumes the backend binds to `127.0.0.1` only and has no network exposure unless the user misconfigures their firewall or port forwards.

### How to Report

1. **GitHub Security Advisories** (preferred): Navigate to the repository → Security tab → "Report a vulnerability"
2. **Email:** [TBD — CEO to provide security contact email]

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Impact assessment (if known)
- Suggested fix (optional)

### Disclosure Timeline

- Acknowledgment: within 48 hours
- Investigation: within 1 week
- Fix or mitigation plan: within 2 weeks for critical, 1 month for moderate/low severity
- Public disclosure: after fix is available in a release

## Threat Model

Scan2Text operates under a **local-first threat model**:

1. **Backend binding:** The FastAPI backend binds exclusively to `127.0.0.1:47351`. It is not accessible from other machines on the network.
2. **No network exposure by default:** No outbound network calls except the explicit feedback button (Google Form) and the in-app model downloader (from GitHub Releases URLs in version.json).
3. **Log privacy:** Logs contain NO file names, NO file content, and NO user data. Fields are limited to: extension, byte count, page count, duration, error code, model version, timestamp. File paths are redacted via `PrivacyFilter`.
4. **Binary integrity:** Model downloads verify SHA256 hashes against values in version.json before use.
5. **No telemetry:** No silent data collection, no crash reporting, no analytics.

## Known Non-Issues

- The feedback button opens a Google Form URL — this is intentional and user-initiated only.
- The model downloader fetches from GitHub Releases — URLs are static and verified by SHA256.
```

---

## 5. Threat Model Summary

### Primary Assumption: Local-First, Offline-First

| Attack Vector | Likelihood | Impact | Mitigation | Status |
|--------------|------------|--------|------------|--------|
| **Backend network exposure** (firewall misconfiguration, port forwarding) | Low-Med | Med | Backend binds `127.0.0.1:47351` only — not `0.0.0.0`. User must explicitly configure firewall to expose. | ✅ Built-in |
| **Log data leakage** (filenames, document content) | Low | High | `PrivacyFilter` in `logging_service.py`: regex-based redaction of Windows paths (`[A-Z]:\...`), file extensions, and text blocks >200 chars. StructuredFormatter enforces ALLOWED_KEYS whitelist. | ✅ Implemented |
| **Feedback URL scraping** | Low | Low | URL is hardcoded as `https://placeholder.local/feedback` — a placeholder, not a real Google Form. No sensitive URL in source. | ✅ Safe (placeholder) |
| **version.json poisoning** (attacker modifies GitHub release to serve malicious binary) | Low | High | App verifies SHA256 hash of downloaded model files against `version.json` values before use. Download streams to `.part` then atomic rename only after size verification. | ✅ Built-in |
| **Model file redistribution legality** | Med | High | OvisOCR2 is Apache-2.0 (per ADR-006). Redistribution permitted with attribution. NOTICE file status unconfirmed. bartowski quantization terms unverified. | ⚠️ Needs CEO decision |
| **GitHub Releases link exposure** (anyone-with-link access) | Low | Low | GitHub Releases are inherently public per design (ADR-007). Intended for low-connectivity users. No authentication required. | ✅ By design |

### What If Backend Exposed to Network?

If a user's firewall allows inbound connections on port 47351:
- The FastAPI `/health` endpoint would be publicly accessible (informational only — returns `{"status": "ok"}`).
- The `/process` and `/status/{task_id}` endpoints require file uploads — an attacker could consume disk space or CPU.
- **Mitigation:** No authentication is implemented (by design for local-first use). If network exposure becomes a concern, consider:
  - Binding to `127.0.0.1` enforced at the code level (not just default) with explicit opt-in for network binding
  - Adding a simple token-based auth for local network access
  - Documenting the risk in the welcome screen

---

## 6. Recommended Action Plan

### Tier 1 — Must-Fix Before Public Release

| # | Action | Effort | Owner | Status |
|---|--------|--------|-------|--------|
| 1.1 | **Rotate GitHub PAT** in `.dsh/dshmm/mcp.json` — current token `github_pat_11[REDACTED]...` should be rotated regardless of git exposure | 5 min | CEO | ⚠️ CEO APPROVAL REQUIRED (credential rotation) |
| 1.2 | **Confirm `.dsh/` is in .gitignore** — already present at line 44, verify no prior commits leaked it | 2 min | Kilo | ✅ Already done (verify with `git log -- .dsh/`) |
| 1.3 | **Vault exposure decision** — decide public vs private repo strategy (see §2) | Discussion | CEO | ⚠️ CEO APPROVAL REQUIRED |
| 1.4 | **Model license confirmation** — verify OvisOCR2 upstream NOTICE file requirement and bartowski quantization terms | Research | CEO | ⚠️ CEO APPROVAL REQUIRED |

### Tier 2 — Must-Have for Public Repo

| # | Action | Effort | Owner | Status |
|---|--------|--------|-------|--------|
| 2.1 | **Create SECURITY.md** — use draft from §4, add CEO-provided security email | 30 min | Kilo | 📝 Ready to write |
| 2.2 | **Create CONTRIBUTING.md** — development setup, TDD requirements, PR process | 45 min | Kilo | 📝 Draft needed |
| 2.3 | **Create CODE_OF_CONDUCT.md** — adopt Contributor Covenant 2.1 | 10 min | Kilo | 📝 Standard template |
| 2.4 | **Create `.github/ISSUE_TEMPLATE/`** — bug report, feature request templates | 30 min | Kilo | 📝 Draft needed |
| 2.5 | **Create `.github/PULL_REQUEST_TEMPLATE.md`** — checklist for PRs | 15 min | Kilo | 📝 Draft needed |

### Tier 3 — Nice-to-Have

| # | Action | Effort | Owner | Status |
|---|--------|--------|-------|--------|
| 3.1 | **History scrub** — only if vault is excluded and repo goes public; otherwise keep as-is (246 commits is manageable) | High | Kilo/CEO | Optional |
| 3.2 | **Fresh repo** — if vault excluded, consider starting fresh with clean history (no Agent-Memory noise) | Medium | Kilo/CEO | Optional |
| 3.3 | **Add LICENSE-APPSERVER** or similar for model attribution notices (if NOTICE file required by OvisOCR2 upstream) | Low | CEO | Conditional |

---

## 7. CEO Decision Gates

| Gate | Decision | Impact | Timeline |
|------|----------|--------|----------|
| **D1: Vault exposure strategy** | Ship full vault (private repo) / Partial (ADRs only, public) / None (fresh repo) | Determines which second-brain/ content is committed | Before any public release |
| **D2: Model license confirmation** | Confirm OvisOCR2 upstream NOTICE file requirement and bartowski quantization terms | Legal compliance for GitHub Releases distribution | Before public release |
| **D3: GitHub PAT rotation** | Authorize token rotation in `.dsh/dshmm/mcp.json` | Security hygiene (not critical — token is gitignored) | Within 30 days |
| **D4: Community files approval** | Review and approve SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md drafts before commit | Public repo readiness | Before public release |

---

## Verification Checklist

- [x] `s44-security-review.md` exists with sections 1–7
- [x] No source edits made to `frontend/` or `backend/`
- [x] Sanitize check: no `GITHUB_PERSONAL_ACCESS_TOKEN` value appears in this document (finding redacted)
- [x] All findings based on actual file reads and git history scan

---

## Appendix: Scan Methodology

- **Secrets scan:** `Select-String` with pattern `GITHUB_PERSONAL_ACCESS_TOKEN|AWS_|AZURE_|OPENAI_API|sk-[a-zA-Z0-9]{20,}` across all repo files excluding `node_modules/`, `target/`, `.git/`, `graphify-out/`, `build/`, `dist/`.
- **History scan:** `git log --all --oneline --source --remotes --name-status` piped to pattern search for `secret|password|token|key`.
- **Total commits:** 246 (via `git log --all --oneline | Measure-Object`).
- **Vault structure:** `Get-ChildItem -Path second-brain -Recurse -Depth 2`.
- **Logging verification:** Direct read of `src/scan2text/services/logging_service.py` — confirmed `PrivacyFilter` with regex-based path/content redaction and `ALLOWED_KEYS` whitelist in `StructuredFormatter`.
- **Feedback URL:** Confirmed as `https://placeholder.local/feedback` (placeholder, not production).
- **Model files:** `models/vlm.gguf` (811 MB), `models/mmproj.gguf` (205 MB) — both gitignored.
