# S11-DIAG-MODEL-RUNTIME-EVIDENCE-1 — Slice Summary

**Date:** 2026-08-20
**Status:** STATE_NOT_REPRODUCED
**Goal:** Collect minimal runtime evidence to determine whether the deployed app sees the models folder, what settings say, whether the backend is running, and what the health endpoint reports.

## Findings

### MODEL FOLDER EVIDENCE
| Path | Exists |
|---|---|
| `D:\Scan2Text\models` | **Yes** |
| `D:\Scan2Text\models_backup` | **No** |

GGUF files in `models/`:
- `vlm.gguf` — 811,843,498 bytes (~774 MB)
- `mmproj.gguf` — 204,987,079 bytes (~195 MB)

### SETTINGS EVIDENCE
File: `D:\Scan2Text\settings\settings.json`
- `max_pdf_pages`: **150** (policy limit is 50 per FR-03/FR-06)
- `output_dir`: `D:\Scan2Text\output`
- `language`: `auto`
- `theme`: `dark`
- `cpu_threads`: 0
- `n_threads`: 0
- `model_path`: "" (empty — auto-discovery expected)
- `mmproj_path`: "" (empty — auto-discovery expected)

### LOG EVIDENCE
`D:\Scan2Text\logs\app.log` — **NOT FOUND**. No log file present.

### BACKEND/HEALTH EVIDENCE
- **Processes:** No `Scan2Text` or `scan2text-backend` processes running.
- **Health endpoint** (`http://127.0.0.1:47351/api/health`): **Unavailable** — connection actively refused. Backend is not running.

## Conclusion

**STATE_NOT_REPRODUCED.** The baseline condition ("D:\Scan2Text\models renamed to models_backup") is not present. The `models` folder exists with both GGUF files intact, and `models_backup` does not exist. The backend is not running and no app.log is present. Either the state was restored or never existed in this form.

## Next Diagnostic Direction
To reproduce the original failure (app processes documents despite models being absent):
1. Rename `D:\Scan2Text\models` to `D:\Scan2Text\models_backup` again.
2. Launch `Scan2Text.exe` and observe behavior.
3. Restart backend and check health endpoint.
4. Capture app.log for model-load evidence.
