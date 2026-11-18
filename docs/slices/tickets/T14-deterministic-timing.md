## Parent

Spec #2 — Continuous integration and delivery, and spec #5 — Handoff and operations.

## What to build

A deterministic test suite that does not depend on how fast the machine running it happens to be. One timing test currently asserts that a ten millisecond delay consumed at least ten milliseconds of wall-clock time, which fails on a loaded runner that measures nine. The workflow then reports a red build for a defect that does not exist in the product.

## Decisions

D-46 (the five gates must mean the same thing everywhere), D-52 (the definition of done for a handoff), and the operating manual's testing rule that fake timers are used for anything that waits.

## Acceptance criteria

- [ ] The delay test drives the timer with fake timers and proves the promise resolves only after the timer advances, instead of measuring elapsed wall-clock time.
- [ ] The delay helper in production code keeps its behaviour unchanged.
- [ ] Every other test that asserts elapsed wall-clock time, or that depends on a real timer, is found and converted to fake timers or given a tolerance that cannot fail on a fast runner.
- [ ] The frontend suite passes three consecutive runs in a row, proving the flake is gone.
- [ ] The slice document exists and passes the slice-document checker, and the state file records the new baseline.

## Blocked by

None (can start immediately).
