"""Settings service — loads, validates, and saves AppSettings."""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Optional

from scan2text.models.errors import ErrorCode, ErrorDetail
from scan2text.models.settings import AppSettings
from scan2text.services.path_service import PathService

logger = logging.getLogger(__name__)


class SettingsError(Exception):
    """Raised when settings are invalid or cannot be loaded/saved."""

    def __init__(self, code: ErrorCode, message: str) -> None:
        self.code = code
        self.message = message
        super().__init__(f"{code.value}: {message}")


class SettingsService:
    """Reads/writes settings/settings.json via a PathService.

    - If settings file is missing, creates defaults.
    - If settings file is invalid JSON or fails Pydantic validation,
      raises SettingsError with SETTINGS_INVALID.
    - Save uses atomic write (temp file + os.replace).
    """

    def __init__(self, path_service: Optional[PathService] = None) -> None:
        self._paths = path_service or PathService()

    # --- Read ---------------------------------------------------------------

    def load(self) -> AppSettings:
        if not self._paths.settings_path.exists():
            logger.info("Settings file missing — creating defaults at %s", self._paths.settings_path)
            defaults = self.create_default()
            self.save(defaults)
            return defaults

        try:
            with open(self._paths.settings_path, "r", encoding="utf-8") as f:
                raw = json.load(f)
        except (json.JSONDecodeError, OSError) as exc:
            raise SettingsError(
                ErrorCode.SETTINGS_INVALID,
                f"Failed to read settings file: {exc}",
            ) from exc

        try:
            return AppSettings(**raw)
        except Exception as exc:
            raise SettingsError(
                ErrorCode.SETTINGS_INVALID,
                f"Invalid settings content: {exc}",
            ) from exc

    @staticmethod
    def create_default() -> AppSettings:
        return AppSettings()

    # --- Write --------------------------------------------------------------

    def save(self, settings: AppSettings) -> None:
        """Save settings atomically using temp file + os.replace."""
        self._paths.ensure_runtime_dirs()
        target = self._paths.settings_path
        tmp_path = target.with_suffix(".tmp")

        data = settings.model_dump()
        content = json.dumps(data, indent=2, ensure_ascii=False)

        try:
            with open(tmp_path, "w", encoding="utf-8") as f:
                f.write(content)
                f.flush()
                os.fsync(f.fileno())
            os.replace(str(tmp_path), str(target))
        except OSError as exc:
            # Clean up temp file on failure
            if tmp_path.exists():
                tmp_path.unlink(missing_ok=True)
            raise SettingsError(
                ErrorCode.OUTPUT_DIR_NOT_WRITABLE,
                f"Failed to write settings: {exc}",
            ) from exc
