## Parent

Spec #3 — Cloud engine.

## What to build

Visible spending: an estimated cost for the document before it is sent, and a running total for the session so the user can see what the cloud engine has cost them. There is no hard cap, because the user owns the key and the bill.

## Decisions

D-24 (a per-job estimate before sending, a per-session counter, no hard dollar cap in the first release).

## Acceptance criteria

- [ ] An estimated cost is shown before a cloud job is sent, based on the page count and the profile's model.
- [ ] A session counter accumulates the cost of completed cloud jobs and is visible while the application is open.
- [ ] The counter starts at zero each time the application starts, and is never persisted.
- [ ] No hard spending limit is imposed, and no test asserts a job being stopped for cost.
- [ ] The estimate comes from the connection test's measured figures rather than a hard-coded rate.
- [ ] Both language files carry the new strings, and the new elements carry test identifiers.

## Blocked by

T04 — A file over 8 MB becomes Markdown through the cloud engine.
