# Slice 6.10b — Thumbnail Removal Recovery

## What Changed

- Fixed red test in `scan2text.store.test.ts`: "removeJob cleanup > should call stopProgress on job removal"
- Added `@tailwindcss/typography@0.5.16` to `frontend/package.json` devDependencies
- Mocked `progressManager` module in store test to spy on `stopProgress` while preserving real `startProgress` for progress tests

## Key Decisions

- Root cause: test stubbed `globalThis.stopProgress` but store imported `stopProgress` directly from module — global stub never intercepted the imported reference
- Fix: added `vi.mock('../lib/progressManager')` with `vi.importActual` + spy wrapper that calls through to real implementation, preserving timer behavior for progress tests
- Installed typography in frontend dir (not root) to avoid pulling tailwindcss v4 into the resolve chain

## Test Coverage

- 410/410 tests passing
- typecheck: PASS
- build: PASS

## Open Questions

- None — recovery complete, baseline restored
