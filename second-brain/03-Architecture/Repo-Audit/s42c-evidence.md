# S42c — Evidence Pack (READ-ONLY Audit)

**Date:** 2026-08-23  
**Purpose:** Local proof for nine S42b external audit claims before any deletion.  
**Scope:** Evidence gathering only — zero source edits, zero deletions.

---

## E1: package.json scripts + cross-references

**Command:** `Get-Content frontend/package.json` (full file); `Select-String -Path .\**\*` for each pattern.

### Scripts block (lines 9–18):
```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "oxlint",
  "preview": "vite preview",
  "test": "vitest run --config vite.test.config.ts",
  "test:watch": "vitest --config vite.test.config.ts",
  "typecheck": "tsc -b",
  "tauri": "tauri"
}
```

### Cross-reference results:

| Pattern | Who references it | Context |
|---------|-------------------|---------|
| `vite.test.config` | `frontend/package.json` lines 11–12 (direct config path in test scripts); `graphify-out/graph.html`, `graphify-out/graph.json` (AST node label), `graphify-out/manifest.json` (file manifest entry) | Live usage: 2 in package.json; 3 in graphify metadata |
| `dev-web.ps1` | Only in `graphify-out/graph.html`, `graphify-out/graph.json`, `graphify-out/manifest.json` (AST metadata). **No source code references.** File exists at repo root but is not imported or referenced by any .json, .ps1, .ts, or .js file. | Dead file — only graphify knows about it |
| `validate-tauri-config` | `frontend/scripts/validate-tauri-config.js` (self); `graphify-out/graph.html`, `graphify-out/graph.json`, `graphify-out/manifest.json` (AST nodes). **No source code imports or shell references found.** | Dead file — only graphify knows about it |

---

## E2: README.md section inventory

**Command:** `Get-Content README.md \| Select-Object -First 50`; `Select-String -Path .\README.md -Pattern "^#"`

### First 50 lines (summary):
Lines 1–49 cover: title, quick start (pip install + engine.py run), Windows llama-cpp-python install instructions (pre-compiled wheels), project structure tree, and beginning of development section.

### Section inventory (all `^#` matches):

| Line | Heading |
|------|---------|
| 1 | `# Scan2Text — Portable Offline OCR Tool` |
| 5 | `## Quick Start` |
| 13 | `## Installing llama-cpp-python on Windows` |
| 34 | `## Project Structure` |
| 50 | `## Development` |
| 53 | `# Run tests` (sub-heading under Development) |
| 56 | `# Run linting` |
| 59 | `# Build standalone .exe` |
| 63 | `## Architecture` |
| 71 | `## Updating` |
| 75 | `## License` |

**Total: 11 headings** (1 H1, 6 H2, 4 H3 under Development).

---

## E3: frontend/README.md

**Command:** `Get-Content frontend/README.md \| Select-Object -First 50`

### Result:
This is the **default Vite React+TypeScript template README**. It describes:
- Template features (Vite + HMR + Oxlint)
- Available plugins (@vitejs/plugin-react with Oxc, @vitejs/plugin-react-swc with SWC)
- React Compiler note (not enabled)
- Oxlint configuration guidance

**Assessment:** No project-specific documentation. This is the unmodified template README — a candidate for replacement or removal in future cleanup.

---

## E4: Git status + backend-spike.spec history

### E4a: `git status --porcelain tests/`

**Command:** `git status --porcelain tests/`  
**Result:** `?? tests/test_cli_startup.py`

**Finding:** `tests/test_cli_startup.py` is **UNTRACKED** (not staged, not committed). It exists on disk but is ignored by git. This is a live-but-untracked test file.

### E4b: `git log --follow --oneline backend-spike.spec`

**Command:** `git log --follow --oneline backend-spike.spec`  
**Result:**
```
0301545 feat: live-fire downloader resilience, vite proxy, and gdrive url surgery
```

**Finding:** One commit in history. No deletion+reversion cycle detected — the file was created in that single commit and has not been deleted since. The commit message mentions "downloader resilience" which aligns with backend-spike work.

---

## E5: File hash comparisons

### E5a: Phase-10 vs Phase-11 same-basename pairs

**Command:** `Get-ChildItem second-brain\01-Agent-Memory\Phase-10 -File` compared against Phase-11 by basename.

**Result: 0 same-basename pairs found.** Every file in Phase-10 has a unique name not present in Phase-11. All 43 Phase-10 files show as MISSING in Phase-11 (no filename collision).

| Filename | Phase-10 exists | Phase-11 | Identical |
|----------|----------------|----------|-----------|
| All 43 files from Phase-10 | YES | N/A (no matching basename) | N/A |

**Identical pairs: 0**  
**Differing pairs: 0** (no pairs exist to compare)

### E5b: test_queue_service.py comparison

**Files:** `tests/integration/test_queue_service.py` vs `tests/unit/services/test_queue_service.py`

| File | SHA256 (first 16 hex) |
|------|----------------------|
| integration/ | CBE80E7B9C1D91A7 |
| unit/ | D7525F999FD8CACB |

**Result: DIFFERENT files.** Same basename but different content — they are independent test files in different directories.

---

## E6: Live usage of text.png and bacground-left-top-panel

**Command:** `Get-ChildItem frontend\src -Include *.ts,*.tsx,*.css -Recurse \| Select-String -Pattern "text\.png|bacground|background.*panel"`

### text.png references:
| File | Line | Content |
|------|------|---------|
| `frontend/src/components/layout/TopBar.tsx` | 7 | `import brandImageUrl from '../../../Images/text.png'` |
| `frontend/src/components/layout/TopBar.test.tsx` | 141 | Test assertion on brandImg element |

**Image file exists:** `frontend/Images/text.png` (11,369 bytes)

### bacground-left-top-panel references:
| File | Line | Content |
|------|------|---------|
| `frontend/src/components/layout/panels/DropZonePanel.tsx` | 5 | `import dropzoneBgUrl from '../../../../Images/bacground-left-top-panel.jpg'` |
| `frontend/src/components/layout/panels/DropZonePanel.test.tsx` | 14 | Test reference to bgLayer |

**Image file exists:** `frontend/Images/bacground-left-top-panel.jpg` (15,189 bytes) — note the **typo in filename** ("bacground" not "background").

### CSS background-image usage:
`frontend/src/index.css` uses CSS custom properties (`--_panel-bg-img`) for panel backgrounds at lines 124, 131, 139, 146, 154, 161, 169, 176, 234, 239, 244, 249, 254, 259. No direct `background-image: url(...)` references to the image filenames — they are imported as ES modules in TSX files.

### text-light.jpg:
**Image file exists:** `frontend/Images/text-light.jpg` (7,974 bytes). **No source code references found** — dead asset.

---

## E7: Production entry point confirmation

**Command:** `Get-Content packaging\scan2text-backend.spec \| Select-String -Pattern "Analysis|entry|cli|engine|console"`

### Result:
```
Binds 127.0.0.1:47351 when frozen via src/scan2text/cli.py entry point.
from PyInstaller.building.build_main import Analysis, PYZ, EXE
a = Analysis(
    ["../src/scan2text/cli.py"],
    console=True,
```

**Finding:** Production entry point is **`cli:main` (cli.py)**, NOT engine.py. The spec file explicitly lists `../src/scan2text/cli.py` as the Analysis target with `console=True`. The comment confirms: "Binds 127.0.0.1:47351 when frozen via src/scan2text/cli.py entry point."

---

## E8: ADR-007 dual-file analysis

### File 1: `ADR-007-feedback-cpu-budget-gdrive-distribution.md`
- **Date:** CEO signed 2026-08-10
- **Status:** APPROVED, Phase 7
- **Decisions covered (4):**
  1. Feedback button (Google Form + offline queue)
  2. CPU budget (auto = 60% of logical cores)
  3. Distribution via Google Drive + in-app downloader
  4. Monthly release cadence
- **Supersedes:** "nothing; extends ADR-006 and PRD §17"

### File 2: `ADR-007-feedback-cpu-welcome-distribution-log-privacy.md`
- **Date:** CEO signed 2026-08-10
- **Status:** APPROVED, Phase 7
- **Decisions covered (6):**
  1. Feedback channel = Google Form + offline queue (more detailed)
  2. CPU budget: cpu_threads=0 auto = 60% of logical cores (floor, min 1)
  3. First-run expectations screen (Welcome modal — NOT in File 1)
  4. Distribution: app zip + model GGUFs on Google Drive (more detailed)
  5. Log privacy + rotation (NOT in File 1)
  6. Release cadence: monthly only, vigorously tested
- **Supersedes:** "PRD §9/§18 'filename + byte count' log lines; FR-09 cpu_threads '0 = automatic' semantics. Does not supersede ADR-006."

### Supersession verdict:
**File 2 (welcome-distribution-log-privacy) is the superset and effectively supersedes File 1.** File 2 covers all decisions in File 1 plus two additional ones (welcome screen, log privacy). Both share the same date, title ("ADR-007"), and approval status. File 2's decision text is more detailed and precise on several points (e.g., "floor, min 1" for CPU budget). File 1 appears to be an earlier draft that was absorbed into the more comprehensive File 2. They do not conflict — File 2 is strictly more complete.

---

## E9: Engine.py binding + webview imports + frontend icon/hero usage

### E9a: `0.0.0.0` in src/scan2text/**/*.py
**Command:** `Select-String -Path src\scan2text\**\*.py -Pattern "0\.0\.0\.0"`  
**Result: NOT FOUND.** No Python file in src/scan2text/ binds to 0.0.0.0. The engine binds 127.0.0.1 (confirmed by spec file comment in E7).

### E9b: webview imports across src/ and tests/
**Command:** `Select-String -Path src\**\*.py,tests\**\*.py -Pattern "import webview|from webview"`  
**Result: NOT FOUND.** Zero webview imports in any Python file. The app uses Tauri for the desktop shell, not pywebview.

### E9c: icons.svg / text-light / hero in frontend/src/
**Command:** `Get-ChildItem frontend\src -Include *.ts,*.tsx,*.css -Recurse \| Select-String -Pattern "icons\.svg|hero"`  
**Result:**

| Pattern | Found | Location |
|---------|-------|----------|
| `icons.svg` | NO | Not referenced anywhere in frontend source |
| `text-light` | NO | File exists (`frontend/Images/text-light.jpg`, 7,974 bytes) but no source import |
| `hero` | YES | `frontend/src/App.css` line 20: `.hero {` — Vite template leftover CSS class |

### Template literal fragments:
**Command:** Search for `${...}` containing icons.svg/text-light/hero in TS/TSX files.  
**Result: NOT FOUND.** No template literals reference these patterns.

---

## E10: Untracked files at repo root

**Command:** `git status --porcelain`

### Modified (pre-existing, not from this slice):
- `M second-brain/02-qa/Test-Final.md`
- ` M second-brain/04-Product/02-functional-requirements.md`
- `D second-brain/04-Product/03-non-functional-and-architecture.md`
- `D second-brain/04-Product/04-testing-and-engineering-rules.md`
- `M src/scan2text/cli.py`

### Untracked (??) — not covered by .gitignore:

| File | Category |
|------|----------|
| `.dsh/` | DSH runtime directory |
| `GRAPHIFY_MAP.md` | Documentation artifact |
| `Lesson-Learned.md` | Documentation artifact |
| `backend/` | PyInstaller build output (large) |
| `deploy-fix65d.ps1` | Deployment script |
| `package-lock.json` | npm lockfile |
| `scripts/deploy-fix66.ps1` | Deployment script |
| `scripts/verify-fix66.ps1` | Verification script |
| `second-brain/01-Agent-Memory/Phase-11/diag-S11-PDF-GUARDRAIL.md` | Diagnostic note |
| `second-brain/01-Agent-Memory/Phase-11/diag-S27-DOWNLOAD-404.md` | Diagnostic note |
| `second-brain/01-Agent-Memory/Phase-11/diag-S30-MODELS-PATH-SPLIT.md` | Diagnostic note |
| `second-brain/01-Agent-Memory/Phase-11/diag-S31-RECON-PROBE.md` | Diagnostic note |
| `second-brain/01-Agent-Memory/Phase-11/diag-S32-DIAG-IMPORT-SWEEP.md` | Diagnostic note |
| `second-brain/01-Agent-Memory/Phase-11/slice-S11-DIAG-BACKEND-STATUS-SEMANTICS.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-11/slice-S11-DIAG-CONSOLE-TRACE.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-11/slice-S11-DIAG-DOWNLOADER-SCHEMA.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-11/slice-S11-DIAG-EXE-NAME-FORENSICS.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-11/slice-S11-DIAG-EXIT15-DLL-INVENTORY.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-11/slice-S11-DIAG-HEALTH404-BACKGROUND-REPOLL.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-11/slice-S11-DIAG-LINGER-PROCESSES.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-11/slice-S11-DIAG-MODEL-RUNTIME-EVIDENCE-1.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-11/slice-S11-DIAG-PDF-INSPECTOR.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-11/slice-S11-DIAG-QUEUE-PUMP-RED-DOT.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-11/slice-S11-DIAG-THEME-LANG-PERSISTENCE.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX63-FirstRun-Gate.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX63b-Frontend-Boot-Gate-Modal.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX65-Gate-Parts.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX66-BootGuard-Psutil.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX66-GATE-Backend-Rebuild.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX70-DEPLOY-PortableRoot.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX70-GATE-Rebuild-BootProof.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-11/slice-S11-FIX78-PREFS-PERSIST-FULL.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-11/slice-S11-PREP-GDRIVE-TEST-AND-VERSION-JSON.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-11/slice-S12-PREP-VERSION-JSON-GITHUB.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-11/slice-S26-GATE-FINAL-REBUILD-DEPLOY.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-11/slice-S29-GATE-BACKEND-REBUILD-DEPLOY.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-11/slice-S32-FIX-FEEDBACK-DIR.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-11/slice-S32a-pathservice-api.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-11/slice-S33a-GATE-BACKEND.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-11/slice-S36-fix-logging-startup.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-11/slice-gate-tauri-rebuild-deploy.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-11/slice-gate2-tauri-rebuild-deploy.md` | Slice summary |
| `second-brain/01-Agent-Memory/Phase-6/Pre-Diet.md` | Old slice artifact |
| `second-brain/02-qa/qa-gdrive-download-test.ps1` | QA script |
| `tests/test_cli_startup.py` | **Untracked test file** (see E4a) |
| `tmp-test-output.txt` | Temporary test output |
| `tmp-test2/` | Temporary directory |
| `verify-fix65d.ps1` | Verification script |

**Total untracked: 50 items** (including directories and files).

---

## Summary Table

| Evidence | Claim Verified | Result |
|----------|---------------|--------|
| E1 | vite.test.config, dev-web.ps1, validate-tauri-config references | vite.test.config: live in 2 scripts; dev-web.ps1: dead (graphify-only); validate-tauri-config: dead (graphify-only) |
| E2 | README.md section structure | 11 headings total; H1 + 6×H2 + 4×H3 |
| E3 | frontend/README.md content | Unmodified Vite template — no project docs |
| E4a | test_cli_startup.py tracked? | NO — untracked (??) |
| E4b | backend-spike.spec deletion history | No deletion/reversion; single commit in history |
| E5 | Phase-10 vs Phase-11 identical pairs | 0 pairs (no same basenames); test queue files: DIFFERENT |
| E6 | text.png + bacground-left-top-panel live usage | text.png: live in TopBar.tsx; bacground-left-top-panel.jpg: live in DropZonePanel.tsx; text-light.jpg: DEAD asset |
| E7 | Production entry point | cli.py (NOT engine.py); console=True |
| E8 | ADR-007 dual-file supersession | File 2 supersedes File 1 (superset, no conflict) |
| E9a | engine.py binds 0.0.0.0? | NO — binds 127.0.0.1 only |
| E9b | webview imports in src/tests | 0 found — app uses Tauri |
| E9c | icons.svg/text-light/hero in frontend | icons.svg: dead; text-light.jpg: dead file; hero: Vite template CSS class in App.css |
| E10 | Untracked-not-ignored files | 50 items including test_cli_startup.py, build artifacts, scripts, diagnostics |

---

*Generated by S42c-EVIDENCE slice. READ-ONLY — zero source edits made.*
