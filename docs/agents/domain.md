# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`docs/GLOSSARY.md`** — the vocabulary. This repo keeps it under `docs/` rather than at the repository root, by decision.
- **ADRs**: `second-brain/03-Architecture/ADRs/` in the private vault. They are deliberately not published. Read the ones that touch the area you are working in.
- **`docs/slices/DECISIONS.md`** — the decision log. Entries carry IDs (`D-nn`); cite the ID rather than restating the reasoning.

If any of these files do not exist, **proceed silently**. Do not flag their absence and do not suggest creating them upfront.

## File structure

Single-context repository. One glossary, one set of ADRs, one product vocabulary:

```
/
├── AGENTS.md                       (operating manual; ignored by git, mirrored in the private vault)
├── docs/
│   ├── GLOSSARY.md                 (canonical vocabulary)
│   ├── agents/                     (this folder: tracker, labels, domain rules)
│   └── slices/                     (decision log, handoff guide, state, slice documents)
└── second-brain/03-Architecture/ADRs/   (private; ADR-001 onward)
```

## Use the glossary's vocabulary

When output names a domain concept — an issue title, a proposal, a hypothesis, a test name, a slice document — use the term as defined in `docs/GLOSSARY.md`. Do not drift to synonyms the glossary explicitly avoids.

The glossary distinguishes **Provider**, **Model**, **Local model files**, **Engine**, **Recipe**, **Profile**, **Route**, **Job**, **Batch**, **Band**, **Column segment**, and **Cloud consent**. The repository's older usage of "model" for the local GGUF pair is captured as "Local model files".

If a concept you need is not in the glossary, that is a signal: either the project does not use that language (reconsider) or there is a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-006 (Ovis engine swap and its locked recipe), but worth reopening because…_

The ADRs most likely to matter:

| ADR | Area |
|---|---|
| ADR-006 | Ovis engine swap: the locked recipe, one full-page image per page, no tiling, and the rule that recipe and geometry travel together |
| ADR-007 | Feedback queue, CPU budget, welcome screen, distribution, log privacy (two files share this number; merging them is tracked as D-55) |
| ADR-008 | Tauri desktop shell and packaging |
| ADR-009 | PyInstaller binary exclusion filter |

New decisions for the Cloud engine work belong in ADR-010 (engine, routing, profiles) and ADR-011 (key storage and consent), both still to be written.
