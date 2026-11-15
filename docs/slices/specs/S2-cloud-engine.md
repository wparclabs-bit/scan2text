# Spec 2 — Cloud engine

## Problem Statement

As a user with a large or dense document, I want the application to convert it with a strong vision model instead of my small local model, so that multi-page scans, financial tables, and wide spreadsheets come out accurately.

As a privacy-conscious user, I want to know exactly what leaves my machine, which company receives it, and under whose terms, so that I can decide to send or to keep processing on my own CPU. Today the application only ever runs a small model locally, so a difficult document either produces a poor result or nothing useful at all.

## Solution

As a user, I want the application to offer an optional Cloud engine that I enable myself, that I fund with my own API key, and that I approve per session before anything is sent, so that large documents are converted well without the application ever holding a key on my behalf or sending data without my explicit consent.

Files over 8 MB route to the Cloud engine; files up to 8 MB stay on the Local engine. The route is decided per file. A consent dialog names the provider, the model, the file count, the total size, the region, and the fact that the provider logs traffic under its own terms. The API key is stored in Windows Credential Manager, and the application remembers only a key id and the last four characters.

## User Stories

1. As a user, I want a large PDF to be converted by a strong vision model, so that I get an accurate result instead of a poor local one.
2. As a user, I want files up to 8 MB to stay on my own machine, so that ordinary documents never leave the device.
3. As a user, I want the route decided per file rather than per batch, so that a mixed batch is handled correctly.
4. As a user, I want to be told which engine will handle each file before it starts, so that I know where the work happens.
5. As a user, I want a consent dialog before the first Cloud job of a session, so that I am not surprised by data leaving the device.
6. As a user, I want the consent dialog to name the provider and the model, so that I know who receives my document.
7. As a user, I want the consent dialog to name the number of files and the total size, so that I know the scale of what is sent.
8. As a user, I want the consent dialog to name the region the data is processed in, so that I can judge the jurisdiction.
9. As a user, I want the consent dialog to state that the provider logs traffic under its own terms, so that I understand the privacy consequence.
10. As a user, I want the consent dialog to offer Send and Cancel, so that declining is as easy as accepting.
11. As a user, I want a checkbox to process the batch on my CPU instead, so that a missing key never blocks me.
12. As a user, I want to enter my own API key in Settings, so that the application never asks me to trust someone else's key.
13. As a user, I want my key stored in the operating system's credential store, so that it is encrypted and not sitting in a settings file.
14. As a user, I want the application to show only the last four characters of my key, so that I can confirm which key is active without exposing it.
15. As a user, I want a Cloud engine toggle that is off by default, so that a saved key never silently enables sending.
16. As a user, I want to be able to turn the Cloud engine off without deleting my key, so that I can disable it temporarily.
17. As a user, I want a separate action to delete my key, so that removing the credential is deliberate.
18. As a user, I want a connection test that checks the model can actually read an image, so that a text-only model is rejected before I pay for pages.
19. As a user, I want the connection test to report the model, its vision capability, the latency, and an estimated per-document cost, so that I can judge the setup.
20. As a user, I want a clear message and a "fix key" action when the key is rejected, so that I know what to do.
21. As a user, I want quota errors to fail immediately rather than retry, so that I am not billed for repeated failures.
22. As a user, I want rate limits and transient server errors to retry a few times, so that a brief outage does not lose my job.
23. As a user, I want a job that cannot finish to stop in a waiting state with the reason and a retry button, so that nothing is silently lost.
24. As a user, I want the application never to switch engines on its own, so that my document is never sent somewhere I did not approve.
25. As a user, I want to cancel a running Cloud job, so that a long document does not trap me.
26. As a user, I want to be told that cancelling may still incur a charge, so that I understand the provider may finish the work anyway.
27. As a user, I want to see an estimated cost before the send and a running total for the session, so that spending stays visible.
28. As a user, I want a cloud icon in the queue row for Cloud jobs, so that I can tell which engine produced a row.
29. As a user, I want the status dot to keep meaning status only, so that I can read progress at a glance.
30. As a user, I want the reason for a waiting job in its tooltip, in my own language, so that I know what to fix.
31. As a user, I want the Cloud output saved with the same naming and in the same folder as local output, so that nothing about my workflow changes.
32. As a user, I want the Preview panel to show the Markdown without metadata, so that I read my document, not bookkeeping.
33. As a user, I want the copied Markdown to exclude metadata too, so that pasting it elsewhere stays clean.
34. As a user, I want the application's limits explained in one message per batch, so that I learn the rules once instead of failing repeatedly.
35. As a user, I want the whole interface in English and Indonesian, so that I can use it in my own language.
36. As a user, I want a file over 50 MB rejected with a clear message, so that I know the ceiling.
37. As a user, I want the feature labelled as a beta, so that I know it is new and may change.

## Implementation Decisions

- The Cloud engine speaks only the OpenAI-compatible chat-completions shape. Provider presets and native request shapes are architected for but not built (D-01, D-25).
- The canonical vocabulary is Provider, Model, Local model files, Engine, Recipe, Profile, Route, Job, Batch, Band, Column segment, and Cloud consent (D-02).
- The Local engine stays fixed to the current local model. The Cloud Profile is the only extension point (D-03).
- Each Profile carries its own Recipe — prompt, sampling, geometry. The Cloud Recipe uses the vision sampling recommended for the hosted model, with extended thinking disabled (D-04).
- Routing thresholds live in one backend module and are exposed through the API. The frontend may reject oversized files early for convenience but never decides the route (D-05, D-06, D-07, D-08).
- One active job runs at a time. A Cloud job occupies the queue slot exactly like a Local job (D-09).
- The API key is written to Windows Credential Manager through the platform credential API via the standard library, with a documented encrypted-file fallback. The settings file stores only a key id and the last four characters (D-10).
- The key never enters the settings model, the frontend, browser storage, logs, crash dumps, or toasts (D-11).
- Cloud consent appears once per session at the first Cloud job, naming provider, model, file count, total size, region, and the provider's logging, with Send, Cancel, and a per-batch CPU override (D-12).
- A file over 8 MB with no key configured is blocked with one toast offering to add a key or to process on CPU anyway (D-13).
- Settings gains a Cloud engine section — profile list, base URL, model id, key, connection test, enable toggle — inside the existing Settings dialog, with no new shell surfaces (D-14, D-31).
- A Band is five consecutive pages sent in one request, and the size is a Profile setting (D-15).
- The request carries page images and the extracted text layer together; the consent dialog names both (D-16).
- The Cloud prompt asks for HTML tables, and the existing HTML-to-GFM converter produces the final Markdown. The prompt never asks for bounding-box tags (D-17).
- The prompt is a versioned asset inside the Profile, and its version is recorded in the output metadata (D-18).
- The connection test proves capability, not reachability: one small image plus text, then a report of model id, vision capability, latency, and a per-document cost estimate (D-19).
- The failure taxonomy is fixed: authentication, authorisation, and quota errors fail fast with a specific message and a fix-key action; rate limits, server errors, and timeouts retry three times with backoff and jitter, then park the job; a dead network parks the job. The engine never changes on its own (D-20).
- Polling becomes status-driven with the existing health guard and backoff. One document has a 30-minute ceiling, after which the job parks with a retry button (D-21).
- The user can cancel a running job. The local wait stops, the result is discarded, the upstream request is aborted best-effort, and a toast and tooltip state that the provider may still finish and charge (D-22).
- The provider client is a seam with a fake implementation. No test touches the network (D-23).
- A per-job cost estimate appears before sending, and a per-session spend counter is shown. There is no hard dollar cap in the first release (D-24).
- A Cloud job shows a small cloud icon in the queue row with a tooltip naming the engine and model. The status dot keeps status meanings only (D-32).
- One new waiting colour, a matte warm amber-brown, joins the palette lock test and the palette section of the operating manual when the feature lands (D-33).
- One new status value with a reason field is added on both sides, and specific error codes distinguish rate limiting, network unavailability, and provider authorisation. The pre-existing mismatch between the backend's skipped value and the frontend's set is fixed in the same change (D-34).
- The Preview header keeps exactly two buttons. Provenance is visible in the queue tooltip and in the Markdown file (D-35).
- One aggregated toast per batch states the new limits and the remedy, and the welcome expectations screen and all limit copy are rewritten in English and Indonesian (D-36).
- The Cloud engine ships as an opt-in beta, off by default and labelled Beta in Settings (D-40).

## Testing Decisions

- A good test asserts observable behaviour only: what the API returns, what the store holds, what the user sees. It never asserts on internal call sequences.
- Exactly one new seam is introduced: the provider client, with a fake implementation used by every test that would otherwise reach the network (D-23). No other new seam is added.
- Everything else is exercised through the existing HTTP contract tests for the backend and the existing store tests for the frontend, so the feature is verified at the same level as the current behaviour.
- The fake provider can be scripted to return each failure in the taxonomy — rejected key, quota exhausted, rate limited, server error, timeout, dead network — so every branch of the failure handling has a deterministic test (D-20).
- The store tests cover routing per file, the consent lifecycle, the CPU override, cancellation, the waiting state with its reason, and the session cost counter (D-05, D-12, D-22, D-24).
- The key storage tests assert that the credential is written and read through the platform credential API, and that the settings payload contains only a key id and four characters — never the key (D-10, D-11).
- Both English and Indonesian strings are asserted through the shared i18n setup, and every new testable element carries a test identifier (D-36).
- Prior art: the existing service, route, and store test suites are the pattern; the new tests follow their structure and naming.
- No test requires a network connection, an API key, or a provider account, so the suite runs in continuous integration unchanged (D-53, D-57).

## Out of Scope

- A managed key supplied by the application, or any resale or metering of provider usage.
- Cloud processing for files at or below 8 MB.
- Provider presets beyond one OpenAI-compatible provider, native request shapes, and native PDF upload to the provider (D-01, D-25).
- Distributing or self-hosting the hosted inference stack.
- A spending dashboard beyond a per-session counter and a per-job estimate (D-24).
- Automatic engine fallback when the Cloud engine fails (D-20).
- Any interface language other than English and Indonesian (D-36).
- Changes to output naming, the output folder, or the Open Folder behaviour (D-29).
- Upload progress reporting inside the queue row.

## Further Notes

- The hosted provider's trial terms forbid production use, so a production licence is required before this ships as anything but a beta. The beta discloses the trial terms and the provider's logging of traffic (D-54).
- Whether the hosted endpoint accepts base64-encoded images is documented for self-hosted deployments and unverified for the hosted service. The first slice proves it before anything else is built (D-37).
- The Cloud engine is a Profile, not a branch in the code. Adding a second provider later is configuration plus one adapter, not a rewrite (D-01, D-03).
