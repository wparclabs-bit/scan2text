"""Production runtime helper — frozen-exe detection and defaults.

When the backend is bundled with PyInstaller, this module provides
the correct host, port, and executable-directory resolution so that
the frozen binary binds 127.0.0.1:47351 and resolves paths relative
to the directory containing scan2text-backend.exe.
"""

from __future__ import annotations

import sys
from pathlib import Path


def is_frozen() -> bool:
    """Return True when running as a PyInstaller-frozen executable."""
    return getattr(sys, "frozen", False) is True


def frozen_exe_dir() -> Path:
    """Return the directory containing the frozen executable.

    Raises RuntimeError if called outside a frozen context.
    """
    if not is_frozen():
        raise RuntimeError("frozen_exe_dir() requires a frozen executable")
    return Path(sys.executable).parent


def get_port() -> int:
    """Return the production port (47351) when frozen, 8000 otherwise."""
    if is_frozen():
        return 47351
    return 8000


def get_host() -> str:
    """Always bind to localhost for local-first security."""
    return "127.0.0.1"
