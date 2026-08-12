# PyInstaller Bundle Spike — Result: SUCCESS

Date: 2026-08-11
Spike: `spike_pyinstaller.py` → `backend-spike.exe`
Python: 3.12.9 (locked via `py -3.12`)
llama_cpp: 0.3.34

## What Happened

1. Created `tools/spike_pyinstaller.py` — imports `sys`, prints version; imports `llama_cpp`, prints version; prints `SPIKE_COMPLETE`.
2. Installed PyInstaller 6.22.0 into the locked Python 3.12 env.
3. First bundle (`--onefile --name backend-spike`) succeeded but runtime failed with:
   ```
   llama_cpp IMPORT_FAILED: [WinError 3] The system cannot find the path specified:
   'C:\\Users\\user\\AppData\\Local\\Temp\\_MEI80322\\llama_cpp\\lib'
   ```
   PyInstaller detected the extra DLL search directories but did NOT collect the `.dll` files from `llama_cpp/lib/` into the archive.
4. Second bundle with `--collect-all llama_cpp` (which auto-generates a `.spec` using `PyInstaller.utils.hooks.collect_all('llama_cpp')`) produced a working exe.
5. Runtime output confirmed success:
   ```
   Python 3.12.9 (tags/v3.12.9:fdb8142, Feb  4 2025, 15:27:58) [MSC v.1942 64 bit (AMD64)]
   llama_cpp 0.3.34
   SPIKE_COMPLETE
   ```
   No "DLL load failed" errors.

## Key Files

- `tools/spike_pyinstaller.py` — retained for future reference
- `backend-spike.spec` — generated spec file using `collect_all('llama_cpp')`; retains the hook pattern needed for any future PyInstaller build
- `build/` and `dist/` — cleaned up per slice protocol

## Build Command That Worked

```powershell
py -3.12 -m PyInstaller --onefile --name backend-spike --collect-all llama_cpp tools/spike_pyinstaller.py
```

The critical difference from the first attempt: `--collect-all llama_cpp` forces PyInstaller to bundle all `.dll` files from `llama_cpp/lib/` (ggml.dll, llama.dll, mtmd.dll, etc.) into the PKG archive so they are extractable at runtime from the temp folder.

## Recommendation

**Proceed with Tauri (Option B).** PyInstaller can successfully bundle `llama-cpp-python` including its C++ DLLs into a standalone Windows executable. The spike proves the packaging path is viable without needing Electron's heavier Chromium footprint.

Tauri remains the preferred option because:
- Smaller binary size (no embedded browser)
- Lower memory footprint
- Native OS integration
- The C++ engine bundling problem is solved
