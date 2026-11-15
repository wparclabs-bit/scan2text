## Parent

Spec #3 — Cloud engine.

## What to build

A failure taxonomy that never wastes the user's money and never silently changes engines: an authentication, authorisation, or quota problem fails immediately with a specific message and a way to fix the key; a rate limit, a server error, or a timeout retries a few times and then parks the job; a dead network parks the job. A parked job shows one waiting state whose reason is readable in its tooltip, in both languages.

## Decisions

D-20 (the failure taxonomy and the no-engine-switch rule), D-21 (status-driven polling with a thirty-minute ceiling per document, after which the job parks with a retry), D-33 (the new waiting colour and its palette lock), D-34 (one new status value with a reason, the backend error codes, and the existing mismatch between the backend and frontend status sets).

## Acceptance criteria

- [ ] An authentication, authorisation, or quota error fails immediately, names the cause, and offers a fix-key action.
- [ ] A rate limit, a server error, or a timeout retries three times with backoff and jitter, then parks the job.
- [ ] A dead network parks the job instead of failing it.
- [ ] A parked job exposes a retry action and its reason in the tooltip.
- [ ] The engine never switches by itself, and no test asserts a fallback to another engine.
- [ ] The waiting state appears in exactly one colour, which joins the palette lock test and the palette section of the operating manual.
- [ ] The backend and the frontend use one set of status values, and the previous mismatch is gone.
- [ ] The existing health guard and backoff still apply while polling.

## Blocked by

T04 — A file over 8 MB becomes Markdown through the cloud engine.
