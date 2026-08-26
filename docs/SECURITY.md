# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | Yes       |
| < 1.0   | No        |

## Reporting a Vulnerability

Scan2Text is a local-first desktop application. The threat model assumes the backend binds to
`127.0.0.1` only and has no network exposure unless a user explicitly reconfigures their firewall
or sets up port forwarding.

### How to report

1. **GitHub Security Advisories (preferred):** open the repository → **Security** tab →
   "Report a vulnerability".
2. **Email:** wp.arc.labs@gmail.com

### What to include

- Description of the vulnerability
- Steps to reproduce
- Impact assessment (if known)
- Suggested fix (optional)

### Disclosure timeline

- Acknowledgment: within 48 hours
- Investigation: within 1 week
- Fix or mitigation plan: within 2 weeks for critical findings, 1 month for moderate/low severity
- Public disclosure: after the fix is available in a release

## Threat Model

Scan2Text operates under a **local-first threat model**:

1. **Loopback binding.** The FastAPI backend binds exclusively to `127.0.0.1:47351` — never to a
   routable interface — so the API is unreachable from other machines by default.
2. **Minimal outbound traffic.** No outbound calls except the user-initiated feedback form and the
   model downloader fetching from the URLs published in `version.json`. There is no telemetry, no
   analytics, no crash reporting.
3. **Log redaction.** Logs contain no file names, no paths, no document content. `PrivacyFilter`
   performs regex-based redaction of path-like patterns and long text blocks, and a structured
   formatter enforces an allow-list of fields (extension, byte count, page count, duration, error
   code, model version, timestamp).
4. **Binary integrity.** Downloaded model files are verified against SHA256 hashes in
   `version.json` before use; downloads stream to a `.part` file and are renamed atomically only
   after size verification.
5. **Unauthenticated local API — accepted trade-off.** No authentication exists by design for
   local-first use. If port 47351 were exposed by a firewall, `/api/health` would leak only
   operational info, but `/process` could be abused to consume disk and CPU. Token-based auth and
   code-enforced binding are the designated countermeasures if network exposure is ever introduced
   (see Recommendations).

### Known non-issues

- The feedback button opens a Google Form URL — intentional and user-initiated only. (The current
  build ships a placeholder URL, not a production form.)
- The model downloader fetches from GitHub Releases — URLs are static and verified by SHA256.
- Permissive CORS is scoped to a loopback-only server (ADR-008 addendum) and is not exploitable
  remotely while the loopback binding holds.

## Recommendations

- **Rotate any GitHub personal access token used by local tooling**, as standard credential
  hygiene, regardless of whether it was ever committed.
- **Keep `.dsh/` and the second-brain strategy folders out of any public repository.** These hold
  local tooling state and internal planning material; verify exclusion before making the repo
  public.
- **Model redistribution confirmed.** OvisOCR2 is Apache-2.0 (ATH-MaaS, no upstream NOTICE file);
  bartowski GGUF quantizations carry no extra restrictions (CEO verified 2026-08-23). Public
  mirrors may redistribute the model weights under these terms.
- **Add token-based authentication only if the backend is ever exposed beyond loopback.** Until
  then, keep the `127.0.0.1` binding enforced and document the firewall risk to users.
