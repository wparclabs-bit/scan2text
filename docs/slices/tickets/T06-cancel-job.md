## Parent

Spec #3 — Cloud engine.

## What to build

A cancel action for a running cloud job: the local wait stops at once, the result is discarded, the upstream request is aborted as far as the connection allows, and the user is told plainly that the provider may still finish the work and charge for it.

## Decisions

D-22 (cancellation, discarding the result, best-effort upstream abort, and the cost warning).

## Acceptance criteria

- [ ] A running cloud job can be cancelled from the queue row.
- [ ] Cancelling stops the local wait and discards any partial result.
- [ ] The upstream request is aborted on a best-effort basis.
- [ ] A toast and the job tooltip state that the provider may still finish and charge.
- [ ] Cancelling a job that has already finished does not change its result.
- [ ] Both language files carry the new strings, and the new elements carry test identifiers.

## Blocked by

T04 — A file over 8 MB becomes Markdown through the cloud engine.
