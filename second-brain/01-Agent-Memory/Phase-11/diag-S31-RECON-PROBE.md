# S31-RECON-PROBE — Reconciled Root-Cause Analysis

**Date:** 2026-08-23  
**Type:** READ-ONLY DIAGNOSIS  
**Status:** BLOCKED pending remediation (fix design ready)

---

## VERBATIM TASK OUTPUTS

### Task 1 — Import Check

```
Traceback (most recent call last):
  File "<string>", line 1, in <module>
  File "D:\WingAI\Projects\scan2text\src\scan2text\engine.py", line 9, in <module>
    import webview
ModuleNotFoundError: No module named 'webview'
[exit code: 1]
```

**Even if `webview` were installed**, a second failure would follow at line 49:
`from scan2text.services.path_service import get_paths` → `ImportError: cannot import name 'get_paths'` (function does not exist in source).

---

### Task 2 — engine.py Pattern Matches (first 50)

```
LineNumber  Line
----------  ----
        49         from scan2text.services.path_service import get_paths
        50         paths = get_paths()
        53         logger.info("Scan2Text starting (root=%s)", paths.exe_root)
        57             model_path = paths.models_dir / "ovisocr2-q8.gguf"
        58             mmproj = paths.models_dir / "mmproj.gguf"
```

Only 5 matches — all within the `startup()` event handler (lines 47–61).

---

### Task 3 — path_service.py Structure

```
LineNumber  Line
----------  ----
        32     def __init__(self, base_dir: str | None = None, app_root: str | None = None) -> None:
        52     def _resolve_base_dir() -> Path:
        57         # Frozen executable (PyInstaller): sys.executable points to .exe
        59             return Path(sys.executable).parent
        64     def _resolve_app_root() -> Path:
        69         # sys.executable points to backend/scan2text-backend.exe → parent.parent = portable root.
        71             return Path(sys.executable).parent.parent
        77     def base_dir(self) -> Path:
        81     def app_root(self) -> Path:
        85     def settings_path(self) -> Path:
        91     def feedback_dir(self) -> Path:
        97     def _resolve_portable_root() -> Path:
       100         Walks up from exe_dir (exe_dir, exe_dir.parent, exe_dir.parent.parent)
       104         exe_dir = Path(sys.executable).parent
       106         for cand in (exe_dir, exe_dir.parent, exe_dir.parent.parent):
       113     def _resolve_output_dir() -> Path:
       122     def output_dir(self) -> Path:
       128     def logs_dir(self) -> Path:
       134     def log_file(self) -> Path:
       138     def _resolve_models_dir() -> Path:
       155             exe_dir = Path(sys.executable).parent
       158             project_root = exe_dir.parent.parent
       163             parent = exe_dir.parent
       173             return Path(sys.executable).parent
       177     def models_dir(self) -> Path:
       195                     exe_dir = Path(sys.executable).parent
       196                     paths.append(f"  frozen grandparent={exe_dir.parent.parent}/models")
       197                     paths.append(f"  frozen parent={exe_dir.parent}/models")
       214     def resolve_model_path(self, relative: str) -> Path:
       222     def assets_dir(self) -> Path:
       227     def ensure_runtime_dirs(self) -> None:
       240     def sanitize_filename(name: str) -> str:
       263     def resolve_output_path(
```

**Critical absence:** No `get_paths()` function. No `ensure_dirs()` method. Only `ensure_runtime_dirs()` exists (line 227).

---

### Task 4 — Git History

```
c981dad fix: S24-FIX-PATHSERVICE-PORTABLE-ROOT-ANCHOR — _resolve_app_root() now anchors on locked layout (exe_dir.parent.parent) instead of fragile models/ presence
37109b0 fix(backend): align packaged app_root with portable root for version.json lookup
e8b2736 fix(S11-FIX30): unify portable-root resolver — _resolve_output_dir delegates to _resolve_portable_root
072e211 fix(S11-FIX28b): portable settings/logs/feedback paths resolve to root in frozen mode
58f1b34 S10-FIX14: Frozen output_dir resolves to portable root (Option A)
92a960c S10-DIAG11: Fix path math (exe_dir.parent→parent.parent) + eradicate GLM-OCR ghost name
9ec60d0 S10-DIAG9: PathService resolve_model_path uses models_dir (TDD)
4f806fc S9.2+S9.2a: Docs role-split + standalone backend artifact
```

**`git status --short src`:** (empty — working tree clean)

**Key history:**
- Commit `37109b0` correctly changed `_resolve_app_root()` to use `_resolve_portable_root()`.
- Commit `c981dad` (S24) **reverted** this to `Path(sys.executable).parent.parent` — introducing the math error.
- `get_paths` was **never** in path_service.py in this repo's history (git log -S confirms). The function referenced in engine.py does not exist in source.

---

### Task 5 — Disk Truth

```
D:\ root directories:
.pnpm-store, ai_workspace, Old Miting AI, Samsung Gw, Scan2Text, SteamLibrary, Tools, WingAI
backend-boot.log1.txt, backend-boot.log2.txt, backend-boot.log3.txt, backend-boot.log4.txt

Models on disk:
D:\Scan2Text\models\mmproj.gguf    204,987,079 bytes
D:\Scan2Text\models\vlm.gguf       811,843,498 bytes
D:\Scan2Text\models_backup\mmproj.gguf  204,987,079 bytes
D:\Scan2Text\models_backup\vlm.gguf     811,843,498 bytes

Backend logs:
Name                  LastWriteTime
----                  -------------
backend-boot.log1.txt 8/21/2026 3:54:34 PM
backend-boot.log2.txt 8/21/2026 4:46:26 PM
backend-boot.log3.txt 8/21/2026 5:56:22 PM
backend-boot.log4.txt 8/21/2026 6:16:55 PM
```

**Confirmed:** `D:\models` does NOT exist. No `ovisocr2-q8.gguf` exists anywhere on D:\. Models are `vlm.gguf` + `mmproj.gguf`.

**Feedback dir on disk:** `D:\Scan2Text\backend\feedback\pending\` and `D:\Scan2Text\backend\feedback\sent\` — confirms FeedbackService writes to backend/ instead of portable root.

**Binary string scan:** The deployed binary does NOT contain the strings `get_paths`, `ovisocr2`, or `ensure_dirs` — confirming source/binary divergence (binary was built from a different code snapshot).

---

## RECONCILED ROOT-CAUSE STATEMENT

**Five independent bugs, all in source code, all prevent correct frozen-runtime operation:**

1. **S24 math error in `_resolve_app_root()` (path_service.py:71):** Changed from `Path(sys.executable).parent` (correct — portable root) to `Path(sys.executable).parent.parent` (wrong — drive root `D:\`). The locked layout has `backend/` as a *subdirectory* of the portable root, so one `.parent` reaches `D:\Scan2Text`, two `.parent`s reach `D:\`. S22's commit `37109b0` had correctly switched to `_resolve_portable_root()`; S24's commit `c981dad` incorrectly replaced it with raw `parent.parent`.

2. **Missing `get_paths()` function (path_service.py):** Engine.py line 49 imports `get_paths` which does not exist in source. PathService has a module-level `_default_instance` (line 300) but no accessor function. This causes `ImportError` on any code path that imports engine.py.

3. **Missing `ensure_dirs()` method (path_service.py):** Engine.py line 51 calls `paths.ensure_dirs()` but the method is named `ensure_runtime_dirs()` (line 227). This would cause `AttributeError` if reached.

4. **Wrong model filename (engine.py:57):** References `ovisocr2-q8.gguf` but the actual model on disk is `vlm.gguf`. The mmproj filename (`mmproj.gguf`) is correct.

5. **FeedbackService uses `base_dir` instead of `feedback_dir` (feedback_service.py:24):** `base = self._paths.base_dir` resolves to `exe_dir` (= `backend/`) in frozen mode, so feedback files land in `D:\Scan2Text\backend\feedback\` instead of the locked-layout-correct `D:\Scan2Text\feedback\`. Confirmed by disk inspection — `backend\feedback\pending\` and `backend\feedback\sent\` exist on disk.

**S30 contradictions resolved:**
- *"S30 claims HEAD would ImportError"* → **CONFIRMED TRUE.** Two separate ImportErrors: `webview` (dev env) and `get_paths` (source absence). Tests pass because they test path_service in isolation and never import engine.py.
- *"S30 math on _resolve_app_root() contradicts locked layout"* → **CONFIRMED.** `parent.parent` = `D:\` (drive root), not `D:\Scan2Text` (portable root). S24's fix is the inverse of correct.
- *"Source/binary divergence: binary references get_paths()/exe_root/ovisocr2-q8.gguf"* → **PARTIALLY WRONG.** Binary byte-scan shows NONE of these strings — binary was built from a different code snapshot. Source code HAS all three issues.

---

## FINAL FIX DESIGN

### File 1: `src/scan2text/services/path_service.py`

**Line 71** — Fix S24 math error:
```python
# BEFORE:
    return Path(sys.executable).parent.parent
# AFTER:
    return Path(sys.executable).parent
```
Rationale: In locked layout, `sys.executable` = `D:\Scan2Text\backend\scan2text-backend.exe`. `.parent` = `D:\Scan2Text` (portable root). `.parent.parent` = `D:\` (drive root, wrong).

**Line 299–300** — Add `get_paths()` accessor:
```python
# BEFORE:
_default_instance = PathService()
# AFTER:
_default_instance = PathService()


def get_paths() -> PathService:
    """Return the module-level default PathService instance."""
    return _default_instance
```

**Line 227** — Add `ensure_dirs` as alias for `ensure_runtime_dirs`:
```python
# Add after ensure_runtime_dirs method:
    # Alias for backward compatibility with engine.py startup.
    ensure_dirs = ensure_runtime_dirs
```

### File 2: `src/scan2text/engine.py`

**Line 57** — Fix model filename:
```python
# BEFORE:
    model_path = paths.models_dir / "ovisocr2-q8.gguf"
# AFTER:
    model_path = paths.models_dir / "vlm.gguf"
```

### File 3: `src/scan2text/services/feedback_service.py`

**Line 24–26** — Use `feedback_dir` property instead of manual construction:
```python
# BEFORE:
    base = self._paths.base_dir
    pending = base / "feedback" / "pending"
    sent = base / "feedback" / "sent"
# AFTER:
    feedback_root = self._paths.feedback_dir
    pending = feedback_root / "pending"
    sent = feedback_root / "sent"
```

### File 4: Logging paths

`PathService.logs_dir` already correctly uses `_resolve_portable_root()` (line 130), so logging paths are correct. No change needed.

### Model filenames HEAD must use

- `vlm.gguf` (811,843,498 bytes) — VLM engine model
- `mmproj.gguf` (204,987,079 bytes) — multimodal projector

### Clean rebuild assessment

**A clean rebuild alone does NOT fix the issue.** The source code bugs (wrong model filename, missing `get_paths`, wrong `parent.parent` math, FeedbackService base_dir) must be fixed first. After applying the 4 file edits above, a clean PyInstaller rebuild will produce a correct binary.

### Git status

Current working tree is clean (`git status --short src` = empty). All fixes are design-only at this stage.

---

## FILES CHANGED (design only — no edits made)

| File | Lines | Change |
|------|-------|--------|
| `src/scan2text/services/path_service.py` | 71 | `parent.parent` → `parent` |
| `src/scan2text/services/path_service.py` | 300 | Add `get_paths()` function |
| `src/scan2text/services/path_service.py` | 227 | Add `ensure_dirs` alias |
| `src/scan2text/engine.py` | 57 | `ovisocr2-q8.gguf` → `vlm.gguf` |
| `src/scan2text/services/feedback_service.py` | 24–26 | Use `feedback_dir` property |
