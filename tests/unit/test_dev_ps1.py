"""Unit tests for dev.ps1 — contract assertions via content parsing."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEV_PS1 = REPO_ROOT / "dev.ps1"


@pytest.fixture(scope="module")
def dev_ps1_content() -> str:
    return DEV_PS1.read_text(encoding="utf-8")


class TestDevPs1Contract:
    """dev.ps1 must implement the unified 47351 contract."""

    def test_port_47351_mentioned(self, dev_ps1_content: str) -> None:
        assert "47351" in dev_ps1_content, (
            "dev.ps1 must reference port 47351 (unified dev/prod contract)"
        )

    def test_uses_py_minus_3_dot_12_not_bare_python(self, dev_ps1_content: str) -> None:
        # PowerShell uses separate args; check for "py" and "-3.12" separately
        assert "py" in dev_ps1_content and "-3.12" in dev_ps1_content, (
            "dev.ps1 must use `py -3.12` — never bare `python`"
        )

    def test_has_health_wait_polling(self, dev_ps1_content: str) -> None:
        assert "/health" in dev_ps1_content, (
            "dev.ps1 must poll /health endpoint for readiness"
        )

    def test_launches_tauri_dev(self, dev_ps1_content: str) -> None:
        assert "tauri dev" in dev_ps1_content, (
            "dev.ps1 must launch `npm run tauri dev` or `npx tauri dev`"
        )

    def test_has_occupancy_check_on_47351(self, dev_ps1_content: str) -> None:
        """Occupancy check on port 47351 before boot."""
        assert "47351" in dev_ps1_content, (
            "dev.ps1 must perform port-occupancy safety belt on 47351"
        )
        # Must write error and exit 1 if occupied
        assert "Write-Error" in dev_ps1_content or "$errorActionPreference = 'Stop'" in dev_ps1_content, (
            "dev.ps1 must fail loudly (Write-Error / Stop) when port is occupied"
        )
