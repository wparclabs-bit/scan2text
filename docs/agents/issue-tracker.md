# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`.
- **Read an issue**: `gh issue view <number> --json number,title,body,labels,comments`.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with `--label` and `--state` filters.
- **Make an issue a sub-issue of a parent**: `gh issue create --parent <parent> ...`, or `gh issue edit <parent> --add-sub-issue <child>` afterwards (`gh` 2.94+). Older `gh`: `gh api --method POST repos/<owner>/<repo>/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>`. Without sub-issues, put `Part of #<parent>` at the top of the child body.
- **Comment on an issue**: `gh issue comment <number> --body "..."`.
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`.
- **Close**: `gh issue close <number> --comment "..."`.

Infer the repo from `git remote -v`; `gh` does this automatically inside the clone.

## Blocking

GitHub's native issue dependencies are the canonical way to record a blocker:

```
gh api --method POST repos/wparclabs-bit/scan2text/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>
```

The blocker id is the numeric **database id** (`gh api repos/wparclabs-bit/scan2text/issues/<n> --jq .id`), not the `#number`. Where dependencies are unavailable, put a `Blocked by: #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

## Token limitation in this repository

The `gh` credential in this environment is a fine-grained personal access token that can **create** issues but cannot **modify** them. Verified: `gh issue create` succeeds, while applying a label (`addLabelsToLabelable`), adding a comment, changing state, and deleting an issue all return `403` or `404`.

Consequences:

- Publish issues **without** `--label`. Passing `--label` fails after the issue is created, leaving an unlabelled issue and a confusing error.
- Apply labels afterwards in the browser. On the repository's Issues page, tick the checkboxes of the new issues and use the **Labels** menu to apply `ready-for-agent` to all of them in one action.
- Never write a workflow that depends on commenting, closing, or editing a published issue through the CLI.

## Scan2Text rules

- **Public-safe bodies.** No internal jargon, no absolute local paths, no secrets, no personal data. The repository is public.
- **Every ticket has a slice document.** The issue holds status and acceptance criteria; the execution-ready slice document lives in `docs/slices/` and is cross-referenced by ID. Do not paste the whole plan into the issue.
- **Cite decision IDs.** Bodies reference `docs/slices/DECISIONS.md` entries rather than restating reasoning.
- **Specs are published before tickets.** `/to-spec` publishes specs; `/to-tickets` breaks them into vertical tracer bullets with blockers.

## When a skill says "publish to the issue tracker"

Create a GitHub issue, with the `ready-for-agent` label when the skill asks for it.

## When a skill says "fetch the relevant ticket"

Read it as in **Read an issue** above.
