"""Boot guard — kill stale scan2text-backend.exe on port before binding.

Called once at backend startup (cli.py::main) before Uvicorn binds.
Rules (ADR-008):
  - Port free                          → proceed
  - Port held by scan2text-backend.exe → kill it, then proceed
  - Port held by anything else         → loud error, exit non-zero
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

import psutil

logger = logging.getLogger("scan2text.prod")

# Match the executable basename used by the Tauri bundle.
_BACKEND_EXE_NAMES = {"scan2text-backend.exe", "scan2text-backend"}


def _is_ours(exe_path: str) -> bool:
    """Return True when *exe_path* belongs to our own backend."""
    return Path(exe_path).name in _BACKEND_EXE_NAMES


def boot_guard(port: int) -> None:
    """Enforce single-instance ownership of *port*.

    Returns None on success. Exits non-zero when a foreign process owns the
    port.
    """
    ours_pids: list[int] = []
    foreign: psutil.Process | None = None

    for proc in psutil.process_iter(["pid", "exe", "name", "status"]):
        # Never classify or kill the current process. The frozen backend exe's
        # own process name matches _BACKEND_EXE_NAMES, so a bare scan would add
        # os.getpid() to ours_pids and then kill the live process (exit 15).
        if proc.pid == os.getpid():
            continue
        try:
            if proc.status() == psutil.STATUS_ZOMBIE:
                continue
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

        try:
            exe = proc.exe() or ""
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
        if not _is_ours(exe):
            continue

        # Our own process — likely a stale previous run.
        ours_pids.append(proc.pid)

    # Check for foreign ownership via connection table.
    try:
        for conn in psutil.net_connections(kind="inet"):
            if conn.laddr.port != port or conn.status != "LISTEN":
                continue
            try:
                owner = psutil.Process(conn.pid)
                owner_exe = owner.exe() or ""
                if _is_ours(owner_exe):
                    ours_pids.append(conn.pid)
                else:
                    foreign = owner
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
    except psutil.AccessDenied:
        logger.warning("boot_guard: access denied reading net_connections")

    if foreign is not None:
        try:
            foreign_exe = foreign.exe() or ""
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            foreign_exe = "<access-denied>"
        logger.error(
            "Port %d is held by foreign process %s (PID %d). "
            "Cannot start Scan2Text backend.",
            port,
            foreign_exe,
            foreign.pid,
        )
        sys.exit(1)

    for pid in ours_pids:
        try:
            proc = psutil.Process(pid)
            logger.info("Killing stale scan2text-backend.exe (PID %d)", pid)
            proc.kill()
            proc.wait(timeout=5)
        except Exception as exc:
            logger.warning("Failed to kill stale PID %d: %s", pid, exc)
