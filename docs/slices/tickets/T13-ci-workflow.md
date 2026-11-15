## Parent

Spec #2 — Continuous integration and delivery.

## What to build

A continuous integration workflow that verifies every change on a Windows runner exactly as the operating manual does, and produces a draft release artifact when a tag is pushed. It carries no secret and no provider key.

## Decisions

D-53 (scope and position of this work), D-56 (Windows runner only), D-57 (backend test dependency subset), D-58 (draft release, manual publication), D-46 (the five gates), D-41 (one authoritative version), D-23 (provider seam fake).

## Acceptance criteria

- [ ] The workflow runs on every push and every pull request, on a Windows runner, with the toolchain versions the operating manual locks.
- [ ] Five named jobs report the frontend tests, the typecheck, the build, the backend tests, and the Rust check; any failing gate fails the run and no gate continues on error.
- [ ] The checker runs as its own job before the slower gates.
- [ ] The backend job installs the test dependency subset only, with a comment explaining that the local-inference runtime is excluded because the suite never imports it.
- [ ] No secret and no provider key exists in the workflow; the provider seam's fake implementation satisfies the cloud tests.
- [ ] A tag builds the frozen artifact and attaches it to a draft release, and nothing publishes automatically.
- [ ] The release job reads the product version from the authoritative packaging manifest.

## Blocked by

T00 — A checker validates every slice document.
