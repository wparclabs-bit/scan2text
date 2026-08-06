from __future__ import annotations

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path


def setup_logging(log_path: Path | None = None) -> logging.Logger:
    """Configure rotating file + console handlers."""
    log_file = (log_path or _default_log_path()).resolve()
    log_file.parent.mkdir(parents=True, exist_ok=True)

    root = logging.getLogger()
    root.setLevel(logging.INFO)

    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s — %(message)s")

    # File handler (10 MB per file, keep 5 backups)
    fh = RotatingFileHandler(str(log_file), maxBytes=10_485_760, backupCount=5)
    fh.setFormatter(fmt)
    root.addHandler(fh)

    # Console handler
    ch = logging.StreamHandler()
    ch.setFormatter(fmt)
    root.addHandler(ch)

    return root


def _default_log_path() -> Path:
    from scan2text.services.path_service import get_paths
    return get_paths().log_file
