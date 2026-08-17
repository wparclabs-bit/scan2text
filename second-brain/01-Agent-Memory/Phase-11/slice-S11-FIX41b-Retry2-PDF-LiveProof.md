# S11-FIX41b-Retry2-PDF-LiveProof

## What Changed
- Wrote `.tmp/pdf_probe.py` per slice spec (httpx-based, REAL known.pdf, no pypdfium2 imports).
- Fixed probe endpoint paths: `/api/process` → `/process`, `/api/status/` → `/status/` (confirmed via `/openapi.json`).
- Started `D:\Scan2Text\Scan2Text.exe`; health OK (OvisOCR2 0.9B loaded, worker idle).
- Ran probe: **FAILED** with `FINAL STATUS: {"status": "failed", "error_code": "OCR_FAILED"}`.
- Backend log verbatim: `Job failed for e8af84e79a294a868b00f7d56a67e95f.pdf: name 'pdfium' is not defined [UNKNOWN_ERROR]`
- Root cause: `pypdfium2_raw.bindings` loads `pdfium.dll` via `ctypes.CDLL('./pdfium.dll')` relative to `__file__`. In PyInstaller bundle, DLL is embedded inside the exe, not extracted as a sibling file — loader cannot find it. `import pypdfium2 as pdfium` fails → `NameError: name 'pdfium' is not defined`.
- STOPPED per slice rule: "Any failure = STOP + verbatim traceback. Zero source edits."

## Key Decisions
- Probe script endpoint fix was necessary (slice spec had `/api/process` but actual route is `/process`).
- No source edits made. No pypdfium2 imports in probe.
- Same `name 'pdfium' is not defined` error appeared in prior sessions (see backend-boot.log history) — this is a persistent packaging issue, not a one-off.

## Test Coverage
- Backend: 281 passed, 1 pre-existing failure (`test_health_contract`) — unchanged.
- Frontend: 633 passed, 0 failures. Typecheck clean. Build success.

## Open Questions
1. FIX41a bundled `pdfium.dll` via `collect_all("pypdfium2_raw")` but `pypdfium2_raw.bindings` uses relative-path DLL loading (`./pdfium.dll`) that fails inside PyInstaller's frozen temp directory.
2. Possible fixes (OUT OF SCOPE for this slice — zero source edits): (a) add PyInstaller runtime hook to inject DLL path into `pypdfium2_raw.bindings` loader; (b) patch `bindings.py` `_get_library` to check `sys._MEIPASS`; (c) use `pypdfium2` instead of `pypdfium2_raw` with a custom hook.
3. CEO decision needed on which approach to pursue.

## Status
**BLOCKED** — Packaged backend cannot import `pypdfium2` at runtime (`name 'pdfium' is not defined`). PDF end-to-end proof FAILED. Requires source/spec fix before retry.
