# Spec 1 — Continuous integration and delivery

## Problem Statement

As the maintainer of Scan2Text, I want every change verified automatically on a machine that matches the platform we ship, so that a failing test, a type error, a broken build, or a malformed slice document is caught before review instead of during a release.

Today there is no automated pipeline at all. The operating manual lists five verification gates — targeted test, full suite, typecheck, build, and cargo check — and every one of them is run by hand. A pull request that would fail the build looks identical to one that is healthy until a person spends ten minutes discovering otherwise.

## Solution

As the maintainer of Scan2Text, I want a GitHub Actions workflow that installs the same toolchains we use locally, runs the five verification gates plus the slice-document checker on every pull request and every push, and produces a draft release artifact that a human publishes, so that the repository has one objective answer to "is this change safe to ship".

The workflow runs on a Windows runner, carries no secret and no API key, and exercises the Cloud provider seam through its fake implementation so that the whole suite stays hermetic.

## User Stories

1. As a maintainer, I want a workflow to run on every pull request, so that regressions are caught before merge rather than after release.
2. As a maintainer, I want the workflow to run on a Windows runner, so that a green result describes the platform we actually ship.
3. As a maintainer, I want the frontend test suite to run in CI, so that the same gate I run locally is enforced for every contributor.
4. As a maintainer, I want the frontend typecheck to run in CI, so that type errors never reach review.
5. As a maintainer, I want the frontend production build to run in CI, so that a bundling failure is caught immediately.
6. As a maintainer, I want the backend test suite to run in CI, so that service and API regressions are caught.
7. As a maintainer, I want the Rust check to run in CI, so that the desktop shell is verified to compile.
8. As a maintainer, I want the slice-document checker to run in CI, so that the handoff template is enforced mechanically instead of by convention.
9. As a maintainer, I want the checker to run before the slower gates, so that a malformed document fails the workflow fast.
10. As a maintainer, I want CI to install only the backend test dependency subset, so that the workflow is fast and deterministic on Windows.
11. As a maintainer, I want the heavy local-inference runtime deliberately excluded from CI, so that the workflow never depends on a native build that takes an hour or fails.
12. As a maintainer, I want the workflow to carry no secret and no API key, so that a compromised workflow cannot spend money or read a document.
13. As a maintainer, I want the provider seam exercised through its fake implementation in CI, so that cloud behaviour is verified without network access.
14. As a maintainer, I want dependency caches for the frontend and the Python environment, so that a run finishes in minutes rather than tens of minutes.
15. As a contributor, I want the failing test name printed in the workflow output, so that I can fix the failure without reproducing it locally first.
16. As a contributor, I want the workflow to run on push as well as on pull requests, so that a broken direct push is still visible.
17. As a reviewer, I want the workflow result visible on the pull request, so that review starts from a known state.
18. As a reviewer, I want the slice-document check to run before human review, so that an incomplete slice never reaches a reviewer.
19. As a reviewer, I want every gate to be a separate named step, so that I can see which gate failed without reading raw logs.
20. As a release manager, I want the frozen artifact built automatically on a tag, so that the slow packaging step is not a local chore.
21. As a release manager, I want the artifact attached to a draft release, so that I decide what is published.
22. As a release manager, I want publishing to require a deliberate human action, so that a broken build is never pushed to users automatically.
23. As a maintainer, I want the workflow to fail loudly when a gate cannot run, so that a green result always means every gate actually ran.
24. As a maintainer, I want the toolchain versions pinned to the ones the operating manual mandates, so that a green run is reproducible.
25. As a maintainer, I want the product version read from the authoritative version source, so that the release artifact and the application report the same number.
26. As a model agent working inside a slice, I want the gate list in CI to be identical to the gate list in the slice document, so that "done" means the same thing in both places.

## Implementation Decisions

- The programme has four specs rather than the three originally recorded, because continuous integration is scoped separately and published first (D-53, extending D-50).
- One workflow file runs on a Windows runner only (D-56). A Linux runner would need a different desktop dependency stack and its green result would say little about the shipped platform.
- The workflow installs the frontend toolchain, the backend test dependency subset, and the Rust toolchain, matching the versions the operating manual locks (D-57, D-46).
- The backend dependency list is the test subset only: pytest, httpx, pytest-asyncio, fastapi, uvicorn, pydantic, python-multipart, pillow, psutil, requests, pypdfium2. The heavy local-inference runtime is excluded on purpose, and the workflow carries a comment explaining that the adapter imports it lazily inside the worker so the suite never touches it (D-57).
- No job receives a secret and no provider key exists in the environment. The provider seam is satisfied by its fake implementation, so the cloud tests run unchanged (D-23).
- The workflow has five jobs: documentation check, frontend checks, backend checks, Rust check, and a tag-triggered release job. Any failing gate fails the workflow; no gate continues on error.
- The documentation check runs the slice-document checker, which uses only the Python standard library and fails on a missing section, a missing "read the operating manual" line, a missing list of RED tests, or missing verification commands (D-48).
- The release job builds the frozen artifact on a tag and attaches it to a draft release. Publication stays a human action (D-58).
- The release job reads the product version from the authoritative version source, which is the packaging manifest, so the artifact, the health endpoint, and the application agree (D-41).
- The frontend and Python dependency caches are keyed on the lock files, so a lock-file change invalidates its cache.
- Gate output is truncated to its last lines in the pull request summary, keeping the summary readable while the full log stays available.

## Testing Decisions

- A good test in this area asserts observable behaviour of the workflow: which gates run, on which runner, and what the workflow does when a gate fails. It never asserts on the workflow file's formatting.
- The slice-document checker is written test-first against the standard library and its own unit tests run inside the workflow, so the gate is trusted before it is trusted to gate others.
- The first verification is a deliberate failure on a scratch branch: one gate is broken on purpose to prove the workflow reports that gate and fails the run.
- The provider seam's fake implementation is the only provider used in CI, so the suite remains hermetic and no test touches the network (D-23).
- Prior art: the existing frontend scripts and the existing backend suite are reused unchanged. The workflow calls them; it never re-implements them.
- The checker script follows the repository's test-first rule, with its failing test written and run before the implementation (D-52).

## Out of Scope

- Linux or macOS runners, and any Linux desktop build.
- Signed installers, code signing, and notarisation.
- Automatic publication on a tag; publishing is manual by decision (D-58).
- Any secret management for a provider key, because no key exists in CI.
- Coverage thresholds, performance budgets, and flaky-test quarantine.
- Branch protection rules. The workflow exists and is visible; requiring it as a merge condition is a repository setting the owner can turn on separately.
- Deployment of the artifact to any hosting service.

## Further Notes

- A Windows runner costs roughly twice a Linux runner on GitHub's billing. The single-runner decision buys accuracy at that price (D-56).
- The workflow does not replace the local gates. The five gates still run locally during a slice; CI is the shared, objective record (D-46).
- The hosted provider's production licence remains open, but it does not affect this spec: no provider is contacted by CI (D-54).
