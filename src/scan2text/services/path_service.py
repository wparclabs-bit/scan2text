"""Path service — resolves all runtime paths through a single entry point.

Enforces Rule 8 (No hardcoded paths) from the AIASD rules.
"""

from __future__ import annotations

import os
import sys
from datetime import datetime
from pathlib import Path


class PathService:
    """Resolves all file paths relative to the base directory.

    Default base directory resolution order:
    1. If environment variable SCAN2TEXT_HOME is set, use it.
    2. If running as a frozen executable, use a directory beside the executable.
    3. Otherwise, for development, use cwd / ".scan2text".
    """

    # Windows reserved names that must not be used as stems.
    _RESERVED_NAMES = frozenset(
        [
            "CON", "PRN", "AUX", "NUL",
            *[f"COM{i}" for i in range(1, 10)],
            *[f"LPT{i}" for i in range(1, 10)],
        ]
    )

    def __init__(self, base_dir: str | None = None, app_root: str | None = None) -> None:
        if base_dir is not None:
            self._base_dir = Path(base_dir).resolve()
        else:
            self._base_dir = self._resolve_base_dir()

        if app_root is not None:
            self._app_root = Path(app_root).resolve()
        elif base_dir is not None:
            self._app_root = self._base_dir
        else:
            self._app_root = self._resolve_app_root()

    @staticmethod
    def _resolve_base_dir() -> Path:
        env_home = os.environ.get("SCAN2TEXT_HOME")
        if env_home:
            return Path(env_home).resolve()

        # Frozen executable (PyInstaller): sys.executable points to .exe
        if getattr(sys, "frozen", False):
            return Path(sys.executable).parent / "scan2text-data"

        return Path.cwd() / ".scan2text"

    @staticmethod
    def _resolve_app_root() -> Path:
        env_home = os.environ.get("SCAN2TEXT_HOME")
        if env_home:
            return Path(env_home).resolve()
        if getattr(sys, "frozen", False):
            return Path(sys.executable).parent
        return Path.cwd()

    # --- Properties --------------------------------------------------------

    @property
    def base_dir(self) -> Path:
        return self._base_dir

    @property
    def app_root(self) -> Path:
        return self._app_root

    @property
    def settings_path(self) -> Path:
        return self.base_dir / "settings" / "settings.json"

    @property
    def output_dir(self) -> Path:
        return self.base_dir / "output"

    @property
    def logs_dir(self) -> Path:
        return self.base_dir / "logs"

    @property
    def log_file(self) -> Path:
        return self.logs_dir / "app.log"

    @property
    def models_dir(self) -> Path:
        return self.app_root / "models"

    def resolve_model_path(self, relative: str) -> Path:
        """Resolve a model path relative to the app/install root (Rule 8)."""
        p = Path(relative)
        if p.is_absolute():
            return p
        return self.app_root / relative

    @property
    def assets_dir(self) -> Path:
        return self.app_root / "assets"

    # --- Directory creation ------------------------------------------------

    def ensure_runtime_dirs(self) -> None:
        """Create required subdirectories if they don't exist."""
        for d in (
            self.settings_path.parent,
            self.output_dir,
            self.logs_dir,
            self.models_dir,
        ):
            d.mkdir(parents=True, exist_ok=True)

    # --- Filename helpers --------------------------------------------------

    @staticmethod
    def sanitize_filename(name: str) -> str:
        """Convert a filename stem to Windows-safe form.

        Removes or replaces invalid Windows filename characters:
          < > : " / \ | ? *
        and control characters. Rejects Windows reserved names.
        """
        import re

        # Remove invalid characters
        cleaned = re.sub(r'[<>:"/\\|?*]', "", name)
        # Remove control characters
        cleaned = "".join(ch for ch in cleaned if ord(ch) >= 32 or ch == "\t")
        # Collapse whitespace
        cleaned = re.sub(r"\s+", "_", cleaned).strip("_")

        # Handle reserved names
        upper = cleaned.upper()
        if upper in PathService._RESERVED_NAMES:
            cleaned = f"{cleaned}_scan"

        return cleaned or "unknown"

    def resolve_output_path(
        self, source_path: Path | str, desired_stem: str | None = None
    ) -> Path:
        """Return a unique output path for the given source file.

        Naming convention (per 05-output-naming-addendum):
          {stem}_{HHmm}_{yyyyMMdd}.md

        Collision rule: append _2, _3, ... until an unused name is found.
        Never overwrites; never merges.
        """
        source_path = Path(source_path)
        if desired_stem is None:
            desired_stem = self.sanitize_filename(source_path.stem)

        if not desired_stem or all(ch == "." for ch in desired_stem):
            desired_stem = "unknown"

        now = datetime.now()
        time_tag = now.strftime("%H%M")
        date_tag = now.strftime("%Y%m%d")
        base_name = f"{desired_stem}_{time_tag}_{date_tag}"

        candidate = self.output_dir / f"{base_name}.md"
        if not candidate.exists():
            return candidate

        suffix = 2
        while True:
            collision_name = f"{base_name}_{suffix}.md"
            collision_path = self.output_dir / collision_name
            if not collision_path.exists():
                return collision_path
            suffix += 1


# Module-level default instance (used by tests via patch).
_default_instance = PathService()
