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
            self._app_root_injected = True
            self._app_root_from_base_dir = False
        elif base_dir is not None:
            self._app_root = self._base_dir
            self._app_root_injected = False
            self._app_root_from_base_dir = True
        else:
            self._app_root = self._resolve_app_root()
            self._app_root_injected = False
            self._app_root_from_base_dir = False

    @staticmethod
    def _resolve_base_dir() -> Path:
        env_home = os.environ.get("SCAN2TEXT_HOME")
        if env_home:
            return Path(env_home).resolve()

        # Frozen executable (PyInstaller): sys.executable points to .exe
        if getattr(sys, "frozen", False):
            return Path(sys.executable).parent

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

    @staticmethod
    def _resolve_models_dir() -> Path:
        """Resolve models directory by priority.

        Priority:
          1. env SCAN2TEXT_MODELS_DIR if set
          2. frozen: grandparent when models/ exists there
          3. frozen: parent when models/ exists there
          4. dev root (cwd)
        """
        # Priority 1: env var
        env = os.environ.get("SCAN2TEXT_MODELS_DIR")
        if env:
            return Path(env).resolve()

        frozen = getattr(sys, "frozen", False)

        if frozen:
            exe_dir = Path(sys.executable).parent

            # Priority 2: true grandparent (two levels up) if models/ exists there
            project_root = exe_dir.parent.parent
            if (project_root / "models").is_dir():
                return project_root

            # Priority 3: parent (one level up) if models/ exists there
            parent = exe_dir.parent
            if (parent / "models").is_dir():
                return parent

            # Priority 4: exe-adjacent if models/ exists there
            if (exe_dir / "models").is_dir():
                return exe_dir

        # Priority 4: dev root (cwd, same as original app_root behavior)
        if frozen:
            return Path(sys.executable).parent
        return Path.cwd()

    @property
    def models_dir(self) -> Path:
        """Resolve models directory by priority (env → frozen grandparent → parent → dev).

        When app_root is explicitly injected, models_dir = app_root/models.
        When app_root derived from base_dir, models_dir = base_dir/models.
        When fully auto-resolved, priority: env SCAN2TEXT_MODELS_DIR → frozen checks → dev root.

        Raises RuntimeError listing probed paths if SCAN2TEXT_MODELS_DIR
        points to a non-existent directory.
        """
        env = os.environ.get("SCAN2TEXT_MODELS_DIR")

        # Env var always takes highest priority
        if env:
            resolved = Path(env).resolve()
            if not resolved.is_dir():
                paths = [f"  SCAN2TEXT_MODELS_DIR={env}"]
                if getattr(sys, "frozen", False):
                    exe_dir = Path(sys.executable).parent
                    paths.append(f"  frozen grandparent={exe_dir.parent.parent}/models")
                    paths.append(f"  frozen parent={exe_dir.parent}/models")
                    paths.append(f"  frozen exe-adjacent={exe_dir}/models")
                paths.append(f"  dev root={Path.cwd()}/models")
                raise RuntimeError(
                    "Models directory not found.\nProbed locations:\n"
                    + "\n".join(paths)
                )
            return resolved

        # Injected app_root or derived from base_dir
        if self._app_root_injected or self._app_root_from_base_dir:
            return self.app_root / "models"

        # Fully auto-resolved: use priority-based resolution
        resolved = self._resolve_models_dir()
        return resolved / "models"

    def resolve_model_path(self, relative: str) -> Path:
        """Resolve a model path relative to the models directory (Rule 8)."""
        p = Path(relative)
        if p.is_absolute():
            return p
        return self.models_dir / p.name

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
