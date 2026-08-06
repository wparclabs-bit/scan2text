from __future__ import annotations

import json
import logging
import requests
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger("scan2text.update")


class UpdateService:
    """Checks GitHub for a newer release via version.json."""

    DEFAULT_URL = "https://raw.githubusercontent.com/org/Scan2Text/main/version.json"

    def __init__(self, url: Optional[str] = None, current_version: str = "0.1.0") -> None:
        self.url = url or self.DEFAULT_URL
        self.current_version = current_version

    def check(self) -> Optional[Dict[str, Any]]:
        try:
            resp = requests.get(self.url, timeout=5)
            resp.raise_for_status()
            data = resp.json()
        except (requests.RequestException, ValueError) as exc:
            logger.debug("Update check failed (%s)", exc)
            return None

        if not self._newer(data.get("version", ""), self.current_version):
            return None

        return {
            "latest_version": data["version"],
            "download_url": data.get("download_url", ""),
            "notes": data.get("notes", []),
            "model_version": data.get("model_version"),
        }

    @staticmethod
    def _newer(latest: str, current: str) -> bool:
        # Simple semantic-compare for MVP; upgrade to packaging.version later.
        latest_parts = [int(p) for p in latest.split(".") if p.isdigit()]
        current_parts = [int(p) for p in current.split(".") if p.isdigit()]
        return latest_parts > current_parts
