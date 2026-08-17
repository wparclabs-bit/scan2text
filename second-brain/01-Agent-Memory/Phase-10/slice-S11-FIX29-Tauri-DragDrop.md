# S11-FIX29 — Tauri DragDrop Passthrough

## What Changed
- `frontend/src-tauri/tauri.conf.json`: Added `"fileDropEnabled": false` to `app.windows[0]`
- `frontend/scripts/validate-tauri-config.js`: Added assertion #8 — `app.windows[0].fileDropEnabled === false`

## Key Decisions
- **Config key is `fileDropEnabled`** (not `dragDropEnabled` as hypothesized in the slice prompt). Confirmed via Tauri v1 docs at https://v1.tauri.app/v1/api/config/#windowconfig — the same key exists in Tauri v2 with identical semantics.
- **Default is `true`**: Tauri webview consumes OS-level file drop events before they reach the DOM. Setting to `false` disables this interception, allowing HTML5 `onDrop`/`onDragOver` handlers to fire normally.
- **No source code changes** to `FileDropZone.tsx` — the existing HTML5 drag-and-drop wiring was already correct; only the Tauri config blocked it in the packaged app.
- **Validator assertion #8** added to prevent regression — any future change that removes or flips `fileDropEnabled` will fail the gate script.

## context7 Doc Quote (Tauri v1 Config Docs)
> **`fileDropEnabled`** — boolean — default: `true`
> Whether the file drop is enabled or not on the webview. By default it is enabled.
> Disabling it is required to use drag and drop on the frontend on Windows.

Source: https://v1.tauri.app/v1/api/config/#windowconfig (WindowConfig section)

## Test Coverage
- `validate-tauri-config.js` assertion #8: asserts `app.windows[0].fileDropEnabled === false` (RED→GREEN confirmed)
- All 630 existing frontend tests pass unchanged — no behavioral regression in HTML5 drag-and-drop logic
- No new test files added (slice is config-only; no DOM/logic changes)

## Open Questions
- FIX32: Rebuild Tauri shell (`npx tauri build --no-bundle`) and swap into portable `D:\Scan2Text\` — CEO must manually verify OS file drops now reach the dropzone in the packaged exe.
- Tauri v2 docs confirm identical key/semantics; no version-specific concern.

## Verification
```powershell
cd frontend
node scripts/validate-tauri-config.js     # ALL CHECKS PASSED (8/8)
npm run test                              # 630 passed, 0 failures
npm run typecheck                         # zero errors
npm run build                             # success
Select-String tauri.conf.json fileDropEnabled  # line 20: "fileDropEnabled": false
```
