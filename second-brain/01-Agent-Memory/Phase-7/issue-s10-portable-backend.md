# S10-DIAG6 — Portable Backend Models Path Resolution

## Found

### Disk Truth (Portable: D:\Scan2Text\)
```
D:\Scan2Text\
├── Scan2Text.exe              (Tauri app, 8.9MB)
├── dist\
│   └── scan2text-backend\
│       └── scan2text-backend.exe  (PyInstaller bundle, 45MB)
├── models\
│   ├── mmproj.gguf    (204MB)
│   └── vlm.gguf       (811MB)
└── logs\
```

### Disk Truth (Repo: D:\WingAI\Projects\scan2text\)
```
D:\WingAI\Projects\scan2text\models\
├── mmproj.gguf    (204MB)
└── vlm.gguf       (811MB)
```

Both locations have identical model files.

### Rust Spawn Command Line (backend_process.rs:148-154)
```rust
Command::new(exe_path)
    .stdout(Stdio::null())    // <-- SILENCED
    .stderr(Stdio::null())    // <-- SILENCED
    .spawn()
```
- **exe_path:** `D:\Scan2Text\dist\scan2text-backend\scan2text-backend.exe`
- **working directory:** inherits parent process (Scan2Text.exe cwd, typically `D:\Scan2Text\`)
- **env vars:** none explicitly set (no SCAN2TEXT_HOME, no PYTHONPATH)
- **stdout/stderr:** discarded — boot errors invisible to user and to Tauri

### Rust Models Path Resolution (backend_process.rs:70-98)
`resolve_backend_path()` walks up from `current_exe()`:
```
D:\Scan2Text\dist\scan2text-backend\scan2text-backend.exe  →  candidate exists → returns
```
✅ **Backend exe path resolution works correctly.**

### Python Models Path Resolution (path_service.py:57-64, 93-94)
In frozen mode (PyInstaller):
```python
def _resolve_app_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent  # D:\Scan2Text\dist\scan2text-backend
    return Path.cwd()

@property
def models_dir(self) -> Path:
    return self.app_root / "models"  # D:\Scan2Text\dist\scan2text-backend\models
```
The backend looks for models at: **`D:\Scan2Text\dist\scan2text-backend\models\`**
But CEO placed models at: **`D:\Scan2Text\models\`**

### Live Probe Results
- 2 scan2text-backend processes running (PIDs 13192, 25456)
- Port 47351: LISTENING on 127.0.0.1 (PID 13192, 63MB RAM — loaded model)
- After manual launch of standalone backend:
  ```
  INFO: Started server process [3508]
  INFO: Waiting for application startup.
  Model files not found. Awaiting download.
  INFO: Application startup complete.
  INFO: Uvicorn running on http://127.0.0.1:47351
  ```
- Health endpoint `/api/health` responds 200 OK, but `files_present: false`

### Boot Error (from manual launch)
```
Model files not found. Awaiting download.
```
This is the ONLY boot output — stdout/stderr silenced by Rust spawn.

## Root Cause

**Two independent issues:**

1. **Models path mismatch (critical):** The Python backend, when frozen as a PyInstaller executable, resolves `app_root` to `Path(sys.executable).parent` = `D:\Scan2Text\dist\scan2text-backend\`. It then looks for models at `D:\Scan2Text\dist\scan2text-backend\models\` — but CEO placed them at `D:\Scan2Text\models\`. The backend boots and serves HTTP, but `files_present: false` and all OCR jobs fail.

2. **Silent boot (diagnostic gap):** `backend_process.rs:150-151` sets `.stdout(Stdio::null()).stderr(Stdio::null())`, making the "Model files not found" message invisible. The Tauri app considers the backend "healthy" (port open + HTTP 200) even though models are missing.

### BottomBar RAM = "—"
The BottomBar shows `t('bottomBar.ramUsage')` which resolves to the static "RAM: —" string. **There is NO health polling in the frontend.** The RAM value is never fetched from the backend. This is a separate missing feature (frontend should poll `/api/health` in PROD mode and display `ram.used_mb`/`ram.total_mb`).

## Fix Direction

### Primary: Models Path Resolution
**Option A (preferred):** Place models inside the backend's expected path.
- Copy/link `D:\Scan2Text\models\` → `D:\Scan2Text\dist\scan2text-backend\models\`
- Or: symlink `D:\Scan2Text\dist\scan2text-backend\models` → `D:\Scan2Text\models`

**Option B:** Modify `PathService._resolve_app_root()` to also check a sibling `models/` directory:
```python
def _resolve_app_root() -> Path:
    if getattr(sys, "frozen", False):
        exe_dir = Path(sys.executable).parent
        # Check sibling models/ (CEO portable layout)
        sibling = exe_dir.parent / "models"
        if sibling.exists() and (sibling / "vlm.gguf").exists():
            return exe_dir.parent  # D:\Scan2Text
        return exe_dir
    return Path.cwd()
```

### Secondary: Boot Diagnostics
- Change `Stdio::null()` to `Stdio::piped()` or redirect to a log file in the portable folder
- Log boot errors to `D:\Scan2Text\logs\backend-boot.log`

### Tertiary: Frontend Health Polling
- Frontend should poll `http://127.0.0.1:47351/api/health` in PROD mode
- Display `ram.used_mb`/`ram.total_mb` in BottomBar instead of static "—"
- Show model `loaded`/`files_present` status as additional indicator

## Test Coverage
- Manual: backend boot output captured, models not found confirmed
- No automated tests for portable models path resolution (requires portable assembly)

## Open Questions
1. Should the portable installer auto-create a symlink from `dist/scan2text-backend/models` to `D:\Scan2Text\models`?
2. Should `PathService` be made configurable via an env var for portable deployments?
3. Is the "Model files not found" warning sufficient for end-users, or should it block startup?

## DIAG7-Forensics (2026-08-14 19:42)

- portable-exe: 6918624F121D NEW
- repo-exe: NOT-FOUND
- exe-match: N/A (repo exe absent)
- portable-backend: 964406C3951B
- repo-backend: NOT-FOUND
- backend-match: N/A (repo backend absent)
- models: 2 files, 1016830577 bytes (~969MB)
- logs: 11 files present, ALL 0 bytes — EMPTY
- r3-code: present (commit 1279b27 S10-PORTABLE-REFRESH)
- VERDICT: EXE-NEW-LOG-EMPTY

## PROBE-FIX (S10-PROBE-FIX-Syntax-ParserValidated — 2026-08-14 21:42)

- `scripts/probe-backend-ocr.ps1` (239 lines, 10150 bytes) — authored in prior session S10-PROBE-Backend-OCR-Confession.
- PowerShell `[System.Management.Automation.Language.Parser]::ParseFile()` — 0 syntax errors.
- Static sanity: zero `TODO`/`YOUR_`/`FIXME` placeholders; 3 `<word>` patterns are API doc strings (not code).
- Behavior verified present: 7 steps (stop → pick image → start backend → TCP wait → health → POST → poll) + exit codes 0–5.
- **Lesson: every PowerShell artifact gets a parser check (`ParseFile`) before handoff to CEO.**

## PROBE-FIX2 (S10-PROBE-FIX2-Rewrite-With-ByteProof — 2026-08-14 22:18)

- `scripts/probe-backend-ocr.ps1` (223 lines) — DELETED and REWRITTEN from scratch.
- Root cause: 12 non-ASCII bytes (corrupted UTF-8 em-dashes / box-drawing chars) from the old file, plus `[probe]` bracket prefix pattern.
- Rewrite constraints: ZERO square brackets anywhere in file (not just code — comments too); single-quoted pure literals; double-quoted only with `$var` expansion; no `$var[` in quotes; no embedded double quotes; ASCII only; balanced braces.
- Parser gate: `[System.Management.Automation.Language.Parser]::ParseFile()` → **ERRORS:0**
- Non-ASCII count: **0** (was 12)
- SHA256: `7203E52111C0...` (first 12 of full hash)
- Behavior preserved: 7 steps (stop → pick image → start backend with log redirect → TCP wait 30s → health poll → POST multipart → status poll 120s) + exit codes 0–5.
- Key code changes: replaced `[probe]` prefix with `PROBE:`; replaced `[string]` type cast with bare param; replaced `[string]::IsNullOrWhiteSpace()` with `-not $ImagePath -or $ImagePath.Trim() -eq ""`; replaced `[System.IO.File]::ReadAllBytes()` with `Get-Content -Encoding Byte`; replaced HttpWebRequest manual stream handling with `Invoke-WebRequest`; replaced `[System.Guid]::NewGuid()` with `(Get-Random -Maximum 99999999).ToString("D8")`; replaced `@("completed","failed")` with inline `-ne` checks; replaced `[Math]::Min()` with `if ($len -gt 500)` conditional; replaced `[$status]` with bare `$status`.
- **Lesson: self-reported checks are not evidence — print raw bytes, raw parser output, and file hashes.**
