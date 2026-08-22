# S44 — Security Review (Pre-GitHub Public Audit)

**Date:** 2026-08-23
**Type:** READ-ONLY audit — no source edits
**Output:** `second-brain/03-Architecture/Repo-Audit/s44-security-review.md`

## Summary

Completed a comprehensive pre-GitHub security audit of the Scan2Text repository. This is a doc-only slice that reads existing files and git history without modifying any source code.

## Key Findings

1. **Secrets:** 1 CRITICAL finding — GitHub PAT in `.dsh/dshmm/mcp.json` (line 24). Token is gitignored via `.dsh/` entry in `.gitignore` line 44. No secrets have ever been committed to git history (246 commits scanned).

2. **Vault exposure:** second-brain/ contains strategy-sensitive content (04-Product/, 05-Sprints/, Phase-* debug traces). Recommendation: ship full vault if repo stays private; ship partial (ADRs only) if public.

3. **Model licenses:** OvisOCR2 0.9B is Apache-2.0 (per ADR-006). llama-cpp-python is MIT. Application code is Apache-2.0. Redistribution permitted but NOTICE file verification needed for OvisOCR2 upstream.

4. **Community hygiene:** All 5 standard files missing — SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, .github/ISSUE_TEMPLATE/, .github/PULL_REQUEST_TEMPLATE.md. Draft SECURITY.md provided in report.

5. **Threat model:** Local-first confirmed. Backend binds 127.0.0.1:47351 only. Logging service implements PrivacyFilter (regex path/content redaction) + ALLOWED_KEYS whitelist. Feedback URL is placeholder (`placeholder.local`). version.json SHA256 verification in place.

## CEO Decision Gates

- **D1:** Vault exposure strategy (private/full/partial/fresh repo)
- **D2:** Model license confirmation (OvisOCR2 upstream NOTICE file)
- **D3:** GitHub PAT rotation authorization
- **D4:** Community files approval before public release

## Action Plan

- Tier 1: PAT rotation, vault decision, model license confirmation
- Tier 2: Create SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, issue/PR templates
- Tier 3: History scrub (optional), fresh repo (optional)
