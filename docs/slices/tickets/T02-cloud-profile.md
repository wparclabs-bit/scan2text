## Parent

Spec #3 — Cloud engine.

## What to build

A cloud profile the user creates in Settings, with their own API key stored in the operating system's credential store, and a connection test that proves the configured model can actually read an image before any document is sent. The Cloud engine is off until the user turns it on.

## Decisions

D-10 (credential store, no new dependency), D-11 (the key never enters settings, the frontend, browser storage, logs, or toasts), D-14 (enable toggle separate from key presence), D-19 (capability test, not reachability), D-31 (one settings home, no new shell surfaces), D-40 (opt-in beta, off by default), D-03 (the local engine stays fixed; the Profile is the only extension point).

## Acceptance criteria

- [ ] Settings holds a profile with a base URL, a model identifier, and a key, and shows only a key identifier and the last four characters.
- [ ] The key is written to and read from the operating system's credential store, and never appears in the settings payload, the frontend, browser storage, logs, or toasts.
- [ ] The Cloud engine toggle is off by default and turning it off does not delete the key; deleting the key is a separate action.
- [ ] The Cloud section is labelled Beta.
- [ ] The connection test sends one small image plus text and reports the model, its vision capability, the latency, and a per-document cost estimate.
- [ ] A model that cannot read images is rejected by the test rather than at the first job.
- [ ] Both language files carry the new strings, and the new elements carry test identifiers.

## Blocked by

T01 — Measure a real provider band.
