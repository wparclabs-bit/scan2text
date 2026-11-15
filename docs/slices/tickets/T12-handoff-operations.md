## Parent

Spec #5 — Handoff and operations.

## What to build

The repository stops contradicting itself and the work can be handed over cleanly. The slice-document template and its checker are enforced, a privacy notice states what the cloud engine sends and what it never sends, the duplicated decision records are merged and the new ones written, the product version has one authoritative source, the health endpoint has one path, the backend and the frontend agree on the status values, the ignore rules are repaired, the stray tracked artefacts are cleaned up, and the local model files are named in the interface.

## Decisions

D-41 (one authoritative version), D-42 to D-52 (the handoff system: public-safe slice documents, the decision log, the fourteen-section template, the state snapshot, the named RED tests and the five gates, the house-rules block, the checker, the tracker cross-reference, the four specs, the ticket split, and the definition of done), D-55 (merge the two records sharing one number, write the two new ones), D-12 (the privacy notice mirrors the consent content), D-54 (the provider's licence terms remain open and the notice is written against the trial terms).

## Acceptance criteria

- [ ] The slice-document checker is in place and every existing slice document satisfies it.
- [ ] A privacy notice states what the cloud engine sends, what it never sends, where the key is stored, and the provider's own logging terms.
- [ ] The two decision records sharing one number are merged, and the new records for the cloud engine and for key storage and consent are written.
- [ ] The product version has one authoritative source, and a test asserts the health endpoint reports exactly that value.
- [ ] The health endpoint has one documented path, and the documentation and the code agree.
- [ ] The backend and the frontend expose the same set of status values.
- [ ] The malformed ignore rule is repaired, and the stray tracked artefacts are removed or relocated.
- [ ] The local model files are named in the interface.
- [ ] The state file is updated with the new baseline, the open items, and the remaining inconsistencies.
- [ ] The work is committed, and a slice document for this ticket exists with its handoff notes.

## Blocked by

T04 — A file over 8 MB becomes Markdown through the cloud engine, T07 — A digital PDF converts from its text layer without OCR, and T10 — The fixture suite gates both paths.
