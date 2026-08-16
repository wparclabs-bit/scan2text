# DOC-03 — AGENTS.md + AGENTS-CTO.md Token Safety Cap Update

**Date:** 2026-08-13
**Slice:** DOC-03
**Type:** Doc-only

## What Changed

Three stale token-cap values replaced with CEO-locked 45k/35k values:

1. **AGENTS.md §3.2** — `input + output <= 90k tokens per slice, input target <= 70k` → `input + output <= 45k tokens per slice, input target <= 35k`
2. **AGENTS.md §3.3** — `Protect the 90k token safety cap at all times.` → `Protect the 45k token safety cap at all times.`
3. **AGENTS-CTO.md §7 Preflight Checklist** — `Input + output estimated <= 90k tokens per slice` → `Input + output estimated <= 45k tokens per slice`

**second-brain/00-Current-State.md** updated with one-line entry noting the cap update.

## Key Decisions

- CEO locked decision: reduce AI context safety cap from 90k to 45k tokens per slice (input + output), input target from 70k to 35k.
- If exceeded, STOP and request a slice split.
- No other content in either file modified.

## Open Questions

None.
