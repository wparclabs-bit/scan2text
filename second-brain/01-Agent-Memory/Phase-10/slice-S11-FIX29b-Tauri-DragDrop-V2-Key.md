# S11-FIX29b — Tauri DragDrop V2 Key

## What Changed
- `frontend/src-tauri/tauri.conf.json`: Added `"dragDropEnabled": false` to `app.windows[0]` — correct Tauri v2 key per `config.schema.json` (`WindowConfig.dragDropEnabled`, default `true`, type `boolean`).
- `frontend/scripts/validate-tauri-config.js`: Updated assertion #8 — replaced stale v1 key `fileDropEnabled` with correct v2 key `dragDropEnabled`. Comment updated to reflect Tauri v2 semantics.

## Key Decisions
- **Tauri v2 key is `dragDropEnabled`, NOT `fileDropEnabled`.** The v1 key was rejected by the v2 schema in the prior slice (S10-FIX29). The schema at `node_modules/@tauri-apps/cli/config.schema.json` defines:
  ```
  "dragDropEnabled": {
    "description": "Whether the drag and drop is enabled or not on the webview. By default it is enabled.\n\nDisabling it is required to use HTML5 drag and drop on the frontend on Windows.",
    "default": true,
    "type": "boolean"
  }
  ```
- **Default is `true`**: Tauri v2 webview consumes OS-level file drop events before they reach the DOM. Setting to `false` disables this interception, allowing HTML5 `onDrop`/`onDragOver` handlers to fire in the packaged exe.
- **No source code changes** — only config and validator update. The existing HTML5 drag-and-drop wiring in `FileDropZone.tsx` was already correct.
- **Validator assertion #8** now checks `app.windows[0].dragDropEnabled === false` to prevent regression.

## context7 / Schema Doc Quote
Source: `frontend/node_modules/@tauri-apps/cli/config.schema.json` → `definitions.WindowConfig.properties.dragDropEnabled`:
> "Whether the drag and drop is enabled or not on the webview. By default it is enabled. Disabling it is required to use HTML5 drag and drop on the frontend on Windows."

## Test Coverage
- `validate-tauri-config.js` assertion #8: asserts `app.windows[0].dragDropEnabled === false` (RED→GREEN confirmed)
- All 630 existing frontend tests pass unchanged — no behavioral regression
- No new test files added (slice is config-only)

## Open Questions
- FIX32: Rebuild Tauri shell (`npx tauri build --no-bundle`) and swap into portable `D:\Scan2Text\` — CEO must manually verify OS file drops now reach the dropzone in the packaged exe.
- The previous slice summary (S11-FIX29-Tauri-DragDrop) incorrectly cited `fileDropEnabled` as the v2 key; this slice corrects that record.

## Verification
```powershell
cd frontend
node scripts/validate-tauri-config.js     # ALL CHECKS PASSED (8/8)
npm run test                              # 630 passed, 0 failures
npm run typecheck                         # zero errors
npm run build                             # success
Select-String -Path "src-tauri\tauri.conf.json" -Pattern "dragDropEnabled"
  # Line 20: "dragDropEnabled": false
```
