# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec for scan2text-backend.exe.

Output: dist/scan2text-backend/scan2text-backend.exe
Binds 127.0.0.1:47351 when frozen via src/scan2text/cli.py entry point.
"""

import os
from PyInstaller.utils.hooks import collect_all
from PyInstaller.building.build_main import Analysis, PYZ, EXE

exclude_modules = [
    "pytest",
    "unittest",
    "tkinter",
    "matplotlib",
    "scipy",
    "numpy.testing",
]

excludes = [
    *exclude_modules,
    "tests",
    "scan2text.tests",
    "test_*",
]

# Collect llama_cpp native binaries and hidden imports
tmp_ret = collect_all("llama_cpp")
llama_binaries = tmp_ret[1]
llama_hiddenimports = tmp_ret[2]

# Collect PIL (Pillow) assets if present
tmp_ret_pil = collect_all("PIL")
pil_binaries = tmp_ret_pil[1]
pil_hiddenimports = tmp_ret_pil[2]

all_binaries = [*llama_binaries, *pil_binaries]
all_hiddenimports = [*llama_hiddenimports, *pil_hiddenimports]

a = Analysis(
    ["../src/scan2text/cli.py"],
    pathex=[],
    binaries=all_binaries,
    datas=[],
    hiddenimports=all_hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=excludes,
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="scan2text-backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

# Move output into folder structure: dist/scan2text-backend/
dist_dir = os.path.join(os.path.dirname(os.path.abspath("packaging/scan2text-backend.spec")), "..", "dist", "scan2text-backend")
dist_dir = os.path.normpath(dist_dir)
os.makedirs(dist_dir, exist_ok=True)
src_exe = os.path.join(os.path.dirname(os.path.abspath("packaging/scan2text-backend.spec")), "..", "dist", "scan2text-backend.exe")
src_exe = os.path.normpath(src_exe)
dst_exe = os.path.join(dist_dir, "scan2text-backend.exe")
if os.path.isfile(src_exe) and not os.path.isfile(dst_exe):
    import shutil
    shutil.move(src_exe, dst_exe)
