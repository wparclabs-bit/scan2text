# Slice 11.5 Summary: Agent Memory System + ADRs

## What Was Created

This slice built the memory infrastructure that all future agent slices will rely on. Instead of re-reading the entire codebase every time a new slice starts, agents now have a small set of entry-point files that summarize everything they need to know.

### Files Created

| File | Purpose |
|------|---------|
| `AGENTS.md` | Project overview, stack, commands, engineering rules, and the memory protocol every slice must follow |
| `CLAUDE.md` | One-line redirect telling any Claude-based agent to read `AGENTS.md` first |
| `second-brain/00-Current-State.md` | Living document tracking completed slices, active decisions, current contract issues, and the next slice's goal |
| `second-brain/02-Architecture/decisions/001-optimistic-ui.md` | Records why we show file cards before the backend responds |
| `second-brain/02-Architecture/decisions/002-websockets-over-polling.md` | Records why we push progress updates instead of polling |
| `second-brain/02-Architecture/decisions/003-platform-agnostic-file-upload.md` | Records why we use multipart upload instead of sending local file paths |
| `second-brain/03-Product/prd.md` | Product requirements document describing the user flow and key constraints |

## Why This Memory System Exists

Without a memory system, every new agent slice would need to:
- Read the entire codebase to understand what exists
- Re-derive architectural decisions that were already made
- Miss context about what was completed in previous slices

This creates wasted tokens, inconsistent decisions, and lost knowledge between sessions. The memory system solves this by:

1. **Centralizing project context** in `AGENTS.md` so agents know the stack, commands, and rules immediately.
2. **Tracking state** in `00-Current-State.md` so agents know where the project stands without reading old summaries.
3. **Recording decisions** as ADRs so the reasoning behind choices is preserved for future reference.
4. **Enforcing a protocol** that requires every slice to read these files before starting work.

## How Future Slices Should Use It

Every new slice must:

1. **Read `AGENTS.md`** — understands the project, stack, commands, and rules.
2. **Read `second-brain/00-Current-State.md`** — knows what's done, what's active, and what comes next.
3. **Read only the ADRs listed in the slice prompt** — gets relevant architectural context without reading everything.
4. **Update `second-brain/00-Current-State.md`** if state changes — keeps the living document accurate.

This keeps each slice's context window small while preserving all important project knowledge across slices.
