"""Unit tests for build-backend.ps1 — contract assertions via content parsing."""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_SCRIPT = REPO_ROOT / "scripts" / "build-backend.ps1"


@pytest.fixture(scope="module")
def script_content() -> str:
    """Read the build script from SCAN2TEXT_SCRIPT_PATH or default to live scripts/build-backend.ps1."""
    env_path = os.environ.get("SCAN2TEXT_SCRIPT_PATH")
    if env_path:
        return Path(env_path).read_text(encoding="utf-8")
    return DEFAULT_SCRIPT.read_text(encoding="utf-8")


class TestBuildBackendCopyStepContract:
    """build-backend.ps1 must copy PyInstaller output into repo-root backend/."""

    def test_copies_dist_scan2text_backend_to_repo_root_backend(self, script_content: str) -> None:
        """Script must contain a Copy-Item that moves packaging/dist/scan2text-backend → repo-root/backend/."""
        assert "Copy-Item" in script_content, (
            "build-backend.ps1 must use Copy-Item to copy PyInstaller output"
        )
        assert "dist" in script_content and "scan2text-backend" in script_content, (
            "Source path must reference packaging/dist/scan2text-backend"
        )
        # The destination is repo-root backend/ — check for Join-Path with $RepoRoot and "backend"
        assert "$TargetBackend" in script_content or 'Join-Path' in script_content, (
            "build-backend.ps1 must define a target path variable using Join-Path"
        )

    def test_error_handling_when_dist_not_found(self, script_content: str) -> None:
        """Script must exit 1 when PyInstaller output is missing."""
        assert "Test-Path $DistOutput" in script_content or 'Test-Path' in script_content, (
            "build-backend.ps1 must check whether the dist output exists before copying"
        )
        # Must have an else branch that exits with code 1
        lines = script_content.splitlines()
        found_else = False
        for line in lines:
            stripped = line.strip()
            if "else" in stripped.lower():
                found_else = True
                break
        assert found_else, (
            "build-backend.ps1 must have an else branch for the missing-dist error path"
        )
        # After the else, there should be exit 1 somewhere
        assert "exit 1" in script_content, (
            "build-backend.ps1 must exit with code 1 when dist output is not found"
        )

    def test_removes_existing_backend_before_copy(self, script_content: str) -> None:
        """Script must remove existing backend/ directory before copying new output."""
        assert "Remove-Item" in script_content, (
            "build-backend.ps1 must use Remove-Item to clear the target backend/ dir"
        )
        assert "-Recurse" in script_content and "-Force" in script_content, (
            "Remove-Item must use -Recurse -Force for idempotent overwrite"
        )

    def test_uses_py_minus_3_dot_12_not_bare_python(self, script_content: str) -> None:
        """build-backend.ps1 must use `py -3.12` — never bare `python`."""
        assert "py" in script_content and "-3.12" in script_content, (
            "build-backend.ps1 must use `py -3.12` — never bare `python`"
        )

    def test_sets_error_action_preference(self, script_content: str) -> None:
        """Script must set $ErrorActionPreference = 'Stop' for fail-fast behavior."""
        assert '$ErrorActionPreference' in script_content and "Stop" in script_content, (
            "build-backend.ps1 must set $ErrorActionPreference to Stop"
        )

    def test_repo_root_variable_defined(self, script_content: str) -> None:
        """Script must define a RepoRoot variable for portable path resolution."""
        assert "$RepoRoot" in script_content, (
            "build-backend.ps1 must define $RepoRoot for repo-relative paths"
        )
