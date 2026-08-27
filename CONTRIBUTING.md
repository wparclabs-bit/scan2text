# Contributing to Scan2Text

Thank you for your interest in contributing! Scan2Text is a local-first, offline,
CPU-only OCR tool that converts images and PDFs to Markdown. This document outlines
the process for contributing.

## Reporting Bugs

Before filing a bug report, search existing issues to avoid duplicates.

When filing a new issue, use the **Bug Report** template (`.github/ISSUE_TEMPLATE/bug_report.md`).
Include:

- A clear, descriptive title.
- Steps to reproduce the issue.
- Expected vs. actual behavior.
- Environment details (OS, app version).

## Pull Request Process

All pull requests must pass the following gates before review:

1. **TDD** — Write the failing test first (RED), then the minimal implementation (GREEN),
   then refactor only after GREEN is confirmed. See the `/tdd` skill for the full
   methodology.
2. **Typecheck** — Run `npm run typecheck` and confirm **0 errors**.
3. **Build** — Run `npm run build` and confirm success.
4. **CEO Manual Verification** — Confirm the change works on a local build. UI/layout
   changes require a CEO screenshot.

Pull requests that skip any of these gates will be rejected.

## Local Development Rules

These rules are non-negotiable:

- **PowerShell only** — All scripts and commands must use PowerShell syntax. No bash.
- **Python locked to `py -3.12`** — Never use bare `python`. The system default may be
  3.14+ which lacks native wheels for `llama-cpp-python`.
- **TDD mandatory** — Every code, script, and config change must follow the RED→GREEN→
  REFACTOR cycle. Use the `/tdd` skill.
- **No frontend/backend source changes in doc-only slices** — Doc-only slices must not
  touch `frontend/` or `backend/` source.
- **i18n** — All new UI strings must be added to both `src/locales/en.json` and
  `src/locales/id.json`. Inject via `initI18n()` in tests.
- **No hardcoded paths** — Never hardcode `D:\` or any absolute Windows path in frontend
  code. Use Vite relative imports.

## Architecture Notes

- The shell is a fixed `inset-0` Tauri window (Command Center v1.7). Content never
  resizes panels; fractions decide layout.
- State is Zustand memory-only. Jobs never persist. `localStorage` is used only for
  theme and language.
- Backend contract: `POST /process → task_id`, `GET /status/{task_id}`, `GET /health`.
- The coffee & paper palette is locked (see `AGENTS.md` section 6). Purple is retired.

## Definition of Done

- [ ] Tests written and passing (GREEN)
- [ ] Typecheck: 0 errors (`npm run typecheck`)
- [ ] Build: success (`npm run build`)
- [ ] `00-Current-State.md` updated
- [ ] CEO Manual Verification completed (if UI/layout change)
- [ ] No scope creep beyond the slice prompt

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you
agree to uphold this code.
