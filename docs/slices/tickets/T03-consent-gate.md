## Parent

Spec #3 — Cloud engine.

## What to build

A consent gate that opens before the first cloud job of a session and tells the user exactly what is about to leave their machine: which provider and model, how many files, how large in total, which region, and the fact that the provider logs traffic under its own terms. The user chooses Send, Cancel, or process the batch on the CPU instead. Nothing leaves the machine before that choice.

## Decisions

D-12 (consent content, once per session, and the three choices), D-13 (a file over the threshold with no key is blocked with one toast offering to add a key or process on CPU anyway), D-05 (the eight-megabyte threshold), D-07 (the thresholds live in the backend and are exposed through the API).

## Acceptance criteria

- [ ] Dropping a file over the threshold opens a consent modal before any page is sent.
- [ ] The modal names the provider, the model, the file count, the total size, the region, and the provider's logging of traffic.
- [ ] The modal offers Send, Cancel, and a checkbox that processes the batch on the CPU instead, and the override applies to the whole batch.
- [ ] Consent is asked once per session; later cloud jobs in that session do not repeat it.
- [ ] With no key configured, one toast offers to add an API key or to process on CPU anyway, and the file is not dead-ended.
- [ ] The route is decided per file, so a mixed batch routes each file on its own size.
- [ ] Both language files carry the new strings, and the new elements carry test identifiers.

## Blocked by

T02 — Save a cloud profile and prove the model works.
