# Spec 4 — Handoff and operations

## Problem Statement

As the owner of this project, I want any engineer or any model to pick up a planned piece of work and execute it without asking me a question, so that progress does not depend on one person holding the whole design in their head.

As the owner, I also want the repository to stop contradicting itself — a version number reported by three places, a health endpoint under two paths, a status value the two halves of the application disagree about, a model name never shown in the interface — so that the application never tells a user something untrue.

## Solution

As the owner, I want every piece of work to be described by a committed, public-safe slice document that names its decisions, its exact tests, its files, its verification commands, and its handoff notes, so that execution is mechanical and the next person starts warm.

Alongside it, a single decision log holds the reasoning, a standard-library checker enforces the document format, the issue tracker holds status while the document holds execution detail, and the architecture decision records are consolidated so that the project's history reads as one story.

## User Stories

1. As the owner, I want each planned piece of work to have a committed slice document, so that it survives a session, a machine, or a person.
2. As the owner, I want the slice document to name the decisions it relies on, so that the reasoning is traceable without duplicating it.
3. As the owner, I want one decision log holding the full reasoning, so that two documents can never drift apart.
4. As the owner, I want a handoff guide describing how a slice is executed, so that every model follows the same procedure.
5. As the owner, I want the slice document to list the files to change, so that the executor does not wander.
6. As the owner, I want the slice document to list the files not to touch, so that the known ghost-edit failures cannot recur.
7. As the owner, I want the slice document to name the exact failing tests to write first, so that the test-first rule is auditable rather than claimed.
8. As the owner, I want the slice document to state the expected test counts before and after, so that a partial implementation is visible.
9. As the owner, I want the slice document to list the five verification commands with their expected results, so that "done" is mechanical.
10. As the owner, I want a checker script that fails when a slice document is incomplete, so that the format cannot drift within two slices.
11. As the owner, I want the checker written with the standard library only and test-first, so that it adds no dependency and follows the same rule as everything else.
12. As the owner, I want the issue tracker to hold status and acceptance criteria while the slice document holds execution detail, so that each artifact does what it is good at.
13. As the owner, I want the two cross-referenced by identifier, so that neither can be found without the other.
14. As the owner, I want the issue bodies to be public-safe prose, so that nothing internal leaks into a public repository.
15. As the owner, I want a rolling state file recording the current baseline, the planned work, the open questions, and the known inconsistencies, so that a human can read one file to know where things stand.
16. As the owner, I want the product version to have exactly one authoritative source, so that the application, the health endpoint, and the release agree.
17. As the owner, I want the health endpoint available at one canonical path, so that scripts and documentation stop disagreeing.
18. As the owner, I want the backend and the frontend to agree on the set of status values, so that a job never reaches a state one half cannot describe.
19. As the owner, I want the local model files named in the interface, so that the user knows what is running.
20. As the owner, I want the duplicated architecture decision records merged and the new ones written, so that the decision history is continuous.
21. As the owner, I want a privacy notice describing what the application sends and what it never sends, so that the Cloud engine can ship with an honest statement.
22. As the owner, I want the leftover scratch files and tracked test artefacts cleaned or explicitly kept, so that the repository has no accidental debris.
23. As the owner, I want the repository's own documentation to match its behaviour, so that a new contributor is not misled.
24. As a model agent, I want the operating manual read first and a short house-rules block in the slice document, so that I cannot break the rules unknowingly.
25. As a model agent, I want the slice document to open with a state snapshot, so that I know the baseline I must not regress.

## Implementation Decisions

- Slice documents live in the public documentation tree and are committed. They contain no internal jargon, no absolute local paths, and no secrets (D-42).
- The decision log holds the full reasoning; each slice document restates the decisions it depends on by identifier with a one-line summary (D-43).
- Every slice document uses one fixed template with fourteen sections, including the files to touch, the files not to touch, the exact RED tests, the verification commands with expected results, the new interface strings in both languages, the private-vault update, and the handoff notes (D-44).
- Every slice document opens with a state snapshot — baseline test counts, last commit, open blockers — which the executing model refreshes at the end. One rolling state file is updated after every slice (D-45).
- Each slice names its RED tests exactly and the expected counts before and after, and lists the five gates: targeted test, full suite, typecheck, build, and Rust check (D-46).
- Each slice carries a five-line house-rules block and points to the operating manual as the source of truth, which is read first (D-47).
- The handoff guide is the execution contract. The checker script uses only the Python standard library, is written test-first, and fails when a slice document is missing a section, the read-the-manual line, the RED test list, or the verification commands (D-48).
- The issue tracker is GitHub Issues with the agent-ready label. The tracker holds status and acceptance criteria; the slice document holds execution detail; both cross-reference by identifier (D-49).
- The programme is split into four specs — continuous integration and delivery, Cloud engine, Document quality, and Handoff and operations — published in dependency order. The handoff spec is this one (D-50, D-53).
- The work is split into twelve vertical tracer bullets. The first, the spike, and the seventh, the text layer, have no blockers and can run in parallel (D-51).
- The definition of done for a handoff is: RED confirmed failing, the five gates pass, the new baseline count recorded, test identifiers and both language strings present, the private-vault summary written, the slice snapshot and handoff notes updated, the checker script passes, and the work is committed. Layout-visible changes additionally need a screenshot for manual review (D-52).
- The packaging manifest is the single authoritative version. The backend reports it, the frontend reads the backend's health version, and the current disagreement between the three values is resolved (D-41).
- The health endpoint is moved to the path the operating manual documents, with the previous path either removed or kept as a compatibility alias rather than left to drift (D-33 context: the operating manual is the authority).
- The backend and frontend status values are reconciled into one set, and the stray tracked artefacts — throwaway import scripts, a test image with an absolute local path — are removed or relocated, with the repository's ignore rules repaired (D-34, and the inconsistency list in the state file).
- The local model files are named in the interface, so the user can see what is actually running (D-02, D-33).
- The two architecture decision records sharing one number are merged, and the new records for the Cloud engine and for key storage and consent are written (D-55).
- A privacy notice is published that states what the Cloud engine sends, what it never sends, the key storage mechanism, and the provider's own logging terms, matching the consent dialog (D-12, D-54).
- The waiting colour and the palette rules are added to the operating manual and to the palette lock test in the same slice that introduces the waiting state, not before (D-33).
- The issue tracker constraint that the current credential cannot modify published issues is recorded in the tracker documentation, so that publishing never depends on a capability the environment does not have (D-49).

## Testing Decisions

- A good test asserts that the artefact is complete and correct: a slice document has every required section, the checker fails on a document that is missing one, and the state file's claims match the repository.
- The checker script is written test-first: its failing test is written and run before its implementation, and its own suite runs inside continuous integration (D-48, D-52).
- The checker validates structure, not prose: section presence and order, the read-the-manual line, a non-empty RED test list, non-empty verification commands, and the presence of the handoff notes section.
- The consistency work is verified by tests that read the source of truth: one test asserts the version reported by the health endpoint equals the packaging manifest's version, and another asserts the backend and frontend status sets are equal (D-41, D-34).
- The interface work is verified through the existing frontend test setup: both language files gain the same keys, and the new elements carry test identifiers (D-36).
- The handoff guide and the state file are documentation, and are verified by the checker and by a review pass rather than by unit tests.
- Prior art: the repository's existing test layout, its i18n injection in tests, and the standard-library-only style already used for small scripts.
- No test requires a network connection, a provider key, or a private vault path, so every artefact in this spec is verifiable on a fresh machine (D-53).

## Out of Scope

- Rewriting the existing public documentation set beyond the inconsistencies named in the state file.
- Moving the private vault into the public repository, or publishing the architecture decision records that the owner has kept private.
- Changing the locked Command Center layout, the palette, the batch limits, or the output naming rules.
- A general-purpose document generator, a template engine for slice documents, or a generator that produces slices automatically.
- Publishing the owner's real documents as test fixtures, in any form (D-39).
- Publishing the provider key, its descriptor, or any credential material in the repository (D-10, D-11).
- Automatic branch protection, pull-request automation, or merge queues; the continuous-integration spec covers the workflow only.
- Migrating the issue tracker away from GitHub, and changing the label vocabulary.

## Further Notes

- The inconsistency list in the rolling state file is the work list for this spec. Each entry names the ticket that owns it, so nothing here is ambiguous.
- The two duplicated decision records and the two new ones are the only architecture-record work in this programme; everything else the Cloud engine needs is already captured in the decision log (D-55).
- The provider's production licence remains open and the privacy notice's wording depends on it. The notice is written to describe the trial terms accurately and is revised when a production licence exists (D-54).
- Twelve tickets, one slice document each, and every slice committed is the visible output of this spec. The measure of success is that a ticket can be handed to another model with no further explanation.
