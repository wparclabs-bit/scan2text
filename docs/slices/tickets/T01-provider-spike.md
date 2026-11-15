## Parent

Spec #4 — Document quality.

## What to build

A measured spike against the hosted provider that proves what the cloud path can actually do, and records the figures that decide whether the rest of the plan is viable. The outcome is a written record of accepted input shape, token counts, latency, and cost, judged against the agreed thresholds.

## Decisions

D-37 (what the spike must measure), D-38 (pass thresholds: cost at or below $0.10 per 30-page document, band latency at or below 20 seconds, at least 98% table-cell accuracy, zero malformed tables, zero hallucinated columns), D-15 (five pages per band).

## Acceptance criteria

- [ ] The spike proves whether the hosted endpoint accepts base64-encoded images, and the result is written down either way.
- [ ] Token counts are recorded for a full page and for a table crop at five pages per band.
- [ ] Latency and cost are recorded for a 30-page document.
- [ ] Each threshold is marked as passed or failed, and a failure states which part of the plan changes.
- [ ] The record contains no key, no credential, and no absolute local path, and it is committed so the next slice can rely on it.

## Blocked by

None (can start immediately).
