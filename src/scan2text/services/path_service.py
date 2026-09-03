"""Path service — resolves all runtime paths through a single entry point.

Enforces Rule 8 (No hardcoded paths) from the AIASD rules.
"""

from __future__ import annotations

import os
import sys
from datetime import datetime
from pathlib import Path


class PathService:
    """Resolves all file paths through a single portable home contract.

    Home resolution priority (S63a):
    1. SCAN2TEXT_HOME environment variable, if set.
    2. If frozen PyInstaller: portable root = parent of backend executable folder.
    3. Dev fallback: repo root (NOT cwd-based, NOT .scan2text subdir).

    All core paths (settings, logs, output, models, feedback) derive from this
    single home, never from current working directory, never under backend/.
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
            self._base_dir = self.resolve_home()

        if app_root is not None:
            self._app_root = Path(app_root).resolve()
            self._app_root_injected = True
            self._app_root_from_base_dir = False
        elif base_dir is not None:
            self._app_root = self._base_dir
            self._app_root_injected = False
            self._app_root_from_base_dir = True
        else:
            self._app_root = self.resolve_home()
            self._app_root_injected = False
            self._app_root_from_base_dir = False

    @staticmethod
    def resolve_home() -> Path:
        """Resolve the portable home directory.

        Priority:
        1. SCAN2TEXT_HOME environment variable, if set.
        2. Frozen PyInstaller: portable root = parent of backend executable folder.
        3. Dev fallback: repo root (NOT cwd-based, NOT .scan2text subdir).
        """
        env_home = os.environ.get("SCAN2TEXT_HOME")
        if env_home:
            return Path(env_home).resolve()

        # Frozen executable (PyInstaller): portable root = parent of backend exe folder
        if getattr(sys, "frozen", False):
            return Path(sys.executable).parent.parent

        # Dev fallback: repo root (CEO 2026-09-03, Option A)
        repo_root = Path(__file__).resolve().parents[3]
        return repo_root

    @staticmethod
    def _resolve_base_dir() -> Path:
        """Deprecated: use resolve_home() instead."""
        return PathService.resolve_home()

    @staticmethod
    def _resolve_app_root() -> Path:
        """Deprecated: use resolve_home() instead."""
        return PathService.resolve_home()

    # --- Properties --------------------------------------------------------

    @property
    def base_dir(self) -> Path:
        return self._base_dir

    @property
    def app_root(self) -> Path:
        return self._app_root

    @property
    def settings_path(self) -> Path:
        """Settings path: home/settings/settings.json."""
        return self._base_dir / "settings" / "settings.json"

    @property
    def logs_path(self) -> Path:
        """Logs directory: home/logs."""
        return self._base_dir / "logs"

    @property
    def output_path(self) -> Path:
        """Output directory: home/output."""
        return self._base_dir / "output"

    @property
    def models_path(self) -> Path:
        """Models directory: home/models."""
        return self._base_dir / "models"

    @property
    def feedback_path(self) -> Path:
        """Feedback directory: home/feedback."""
        return self._base_dir / "feedback"

    # Backward-compatible aliases
    @property
    def feedback_dir(self) -> Path:
        return self.feedback_path

    @property
    def output_dir(self) -> Path:
        return self.output_path

    @property
    def logs_dir(self) -> Path:
        return self.logs_path

    @property
    def log_file(self) -> Path:
        return self.logs_path / "app.log"

    @property
    def models_dir(self) -> Path:
        """Resolve models directory by priority (env → injected → home).

        When app_root is explicitly injected, models_dir = app_root/models.
        When app_root derived from base_dir, models_dir = base_dir/models.
        When fully auto-resolved, priority: env SCAN2TEXT_MODELS_DIR → home/models.

        Raises RuntimeError listing probed paths if SCAN2TEXT_MODELS_DIR
        points to a non-existent directory.
        """
        env = os.environ.get("SCAN2TEXT_MODELS_DIR")

        # Env var always takes highest priority
        if env:
            resolved = Path(env).resolve()
            if not resolved.is_dir():
                paths = [f"  SCAN2TEXT_MODELS_DIR={env}"]
                paths.append(f"  home/models={self._base_dir}/models")
                raise RuntimeError(
                    "Models directory not found.\nProbed locations:\n"
                    + "\n".join(paths)
                )
            return resolved

        # Injected app_root or derived from base_dir
        if self._app_root_injected or self._app_root_from_base_dir:
            return self.app_root / "models"

        # Fully auto-resolved: use home/models
        return self._base_dir / "models"

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
          < > : \" / \\ | ? *
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


def get_paths() -> PathService:
    """Return the module-level default PathService singleton."""
    return _default_instance


# Alias required by engine.py; delegates to ensure_runtime_dirs().
ensure_dirs = PathService.ensure_runtime_dirs
