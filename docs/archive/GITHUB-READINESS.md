# GitHub Readiness

## Current state

The repository is **private**. Shipping the full `second-brain/` vault is acceptable only while it
stays private. Every item below gates a public release.

**CEO decision (2026-08-23):** The repo stays private for now. The full second-brain vault ships
while private. A fresh repository with a different username is planned for the public launch at
app v1.1. The partial-ship strategy remains a future option if desired.

**Incident closure (2026-08-27):** A fine-grained PAT was accidentally exposed and revoked; a new
fine-grained PAT scoped to wparclabs-bit/scan2text with Contents: Read and write was issued and
Credential Manager updated. 81 MB packaging ZIPs were found in git history; `git filter-repo
--path-glob '*.zip' --invert-paths --force` purged them from all commits; clean history was
force-pushed (`+352f46e...fbbd187 main -> main`). Local repo is now ~24 MB. GitHub Releases
assets remain untouched. Repo remains private.

## Going-public checklist

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | License alignment | Done | Apache-2.0 throughout: `LICENSE`, `pyproject.toml`, Cargo manifest, all docs. The legacy README claimed MIT — superseded by the rewritten README. |
| 2 | Secrets review | Done | Full-tree and git-history scans found no committed secrets; the only hit is tooling state in `.dsh/`, which is gitignored and absent from history. Rotate the tooling PAT anyway (see [SECURITY.md](SECURITY.md) Recommendations). |
| 3 | Second-brain vault exposure | **Decided** | Repo stays private; full vault ships while private. A fresh repo + different username planned for public launch at v1.1. Partial-ship strategy (gitignore `01-Agent-Memory/`, `04-Product/`, `05-Sprints/`; keep ADRs, architecture docs, Repo-Audit evidence, `00-Current-State.md`, and `02-QA/`) remains a future option. |
| 4 | Community files | Partial | `SECURITY.md` done (this docs set). Still pending: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant suggested), `.github/ISSUE_TEMPLATE/`, `.github/PULL_REQUEST_TEMPLATE.md`. |
| 5 | Model-weights redistribution terms | **Resolved** | OvisOCR2 base model is Apache-2.0 (ATH-MaaS, no upstream NOTICE file). Bartowski GGUF quantizations carry no extra restrictions (CEO verified 2026-08-23). Distribution on GitHub Releases. |
| 6 | Git history review | **Resolved** | ~246 commits scanned; matches for credential-like keywords are i18n variable names, not secrets. 2026-08-27: history rewritten via git filter-repo; binaries purged; post-rewrite history re-pushed clean. |
| 7 | Tooling hygiene | Pending | Confirm `.dsh/` remains untracked (`git log -- .dsh/` returns nothing) and keep it ignored in any public state. |

## Public launch plan (Option A — CEO locked 2026-08-27)

- **Clean history pushed to current repo** (done 2026-08-27): `git filter-repo` purged *.zip
  artifacts; force-pushed clean history to wparclabs-bit/scan2text.
- **Develop v1.1 here** — starting with the FILE_TOO_COMPLEX tooltip fix and any additional
  polish. The current repo IS the launch repo; no migration needed.
- **Flip public at v1.1** — repo becomes public at app v1.1 release on this repo.
- The full second-brain vault ships as-is while the repo is private. Vault exposure decision
  deferred (CEO 2026-08-27).

## CEO locked decisions (2026-08-27)

- The current repo (wparclabs-bit/scan2text) IS the fresh clean-history launch repo; the
  fresh-repo migration is retired.
- Public flip happens at v1.1 on the current repo with rewritten clean history.
- Full second-brain vault ships as-is while private; vault exposure decision deferred.
- Binaries belong on GitHub Releases, never in the git tree (AGENTS.md §8).

## Known issue to note at release

v1.0.0 ships with one accepted defect: when the backend rejects a file as `FILE_TOO_COMPLEX`, the
queue-row tooltip shows a generic failure message instead of the translated specific reason. The
file is still correctly rejected and logged. The fix — mapping the `FILE_TOO_COMPLEX` error code to
its i18n string in the queue tooltip path — is targeted for **v1.1** and should be called out in
the v1.1 release notes.
