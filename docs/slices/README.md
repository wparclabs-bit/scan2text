# Slice Documents

How the Cloud engine work is planned, specified, split, and executed. Read this index first, then follow the pipeline below.

## Pipeline

| Step | Command | Produces |
|---|---|---|
| 1 | `/setup-matt-pocock-skills` | Tracker and triage labels for this repository (done) |
| 2 | `/to-spec` | Four specs, each citing decision IDs from `DECISIONS.md` (done: issues #2 to #5) |
| 3 | `/to-tickets` | Fifteen vertical tickets in dependency order, published to the tracker (done: issues #6 to #20) |
| 4 | slice documents | One `TNN-slug.md` per ticket, in the template below |
| 5 | execute | Code, tests, documentation, commit |

## Files here

| File | Purpose |
|---|---|
| `DECISIONS.md` | Every decision with its ID and reasoning. The single source of truth. |
| `HANDOFF-GUIDE.md` | How to execute a slice and hand it to another model. |
| `STATE.md` | Current state, baseline counts, planned work, open items. |
| `specs/` | The four specs, local copies of issues #2 to #5. |
| `tickets/` | The fifteen tickets, local copies of issues #6 to #20. |
| `TNN-*.md` | Executed slice documents: `T00-checker-script.md`, `T01-provider-spike.md`, `T08-geometry-tables.md`, `T13-ci-workflow.md`, `T14-deterministic-timing.md`. Each is validated by `scripts/check_slice_docs.py`. |
| `README.md` | This index. |

## Starting a slice

1. Read `AGENTS.md` first. It owns the house rules.
2. Read the slice document for your ticket.
3. Read the decision IDs it cites in `DECISIONS.md`.
4. Read `STATE.md` for the current baseline.
5. Follow `HANDOFF-GUIDE.md`.

## Ticket list

Fifteen vertical tracer bullets. Each cuts a complete path through the layers, and each is demoable on its own. T00, T01, T07, and T14 have no blockers and can run in parallel. Executed so far: T00 (the checker), T01 (the provider spike), T13 (the CI workflow, blocked by T00 and now green), and T14 (the deterministic timing test).

| Ticket | Title | Blocked by | Issue |
|---|---|---|---|
| T00 | A checker validates every slice document | none | #6 |
| T01 | Measure a real provider band | none | #7 |
| T07 | A digital PDF converts from its text layer without OCR | none | #8 |
| T13 | CI runs the five gates on every change | T00 | #9 |
| T02 | Save a cloud profile and prove the model works | T01 | #10 |
| T03 | The first cloud job asks consent | T02 | #11 |
| T04 | A file over 8 MB becomes Markdown through the cloud engine | T03 | #12 — **done, T04-cloud-conversion.md** |
| T05 | A provider failure parks the job with a reason and a retry | T04 | #13 |
| T06 | The user can cancel a long cloud job | T04 | #14 |
| T08 | A 45-column table is rebuilt from geometry | T07 | #15 - **done, T08-geometry-tables.md** |
| T09 | A scanned wide table is stitched from column segments | T08 | #16 |
| T10 | The fixture suite gates both paths | T04, T08 | #17 |
| T11 | Spend is visible | T04 | #18 |
| T12 | Handoff docs, ADRs, privacy, versioning | T04, T07, T10 | #19 |
| T14 | A timing test stops depending on how fast the machine is | none | #20 - **done, T14-deterministic-timing.md** |

## Slice document naming

`TNN-slug.md`, for example `T03-cloud-routing.md`. Each document uses the fourteen-section template in `HANDOFF-GUIDE.md`, and `scripts/check_slice_docs.py` validates it before each commit.

## Rules for everything in this folder

- Public-safe: no internal jargon, no absolute local paths, no secrets, no personal data.
- Decision IDs come from `DECISIONS.md`. Change the log first, then the slice.
- The five gates are: targeted test, full suite, typecheck, build, cargo check.
