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
        assert "/api/health" in dev_ps1_content, (
            "dev.ps1 must poll /api/health endpoint for readiness (backend route is /api/health)"
        )

    def test_uvicorn_uses_true_asgi_entry(self, dev_ps1_content: str) -> None:
        """dev.ps1 must use the discovered true ASGI entry: scan2text.api.main:app."""
        assert "scan2text.api.main:app" in dev_ps1_content, (
            "dev.ps1 uvicorn args must contain the true ASGI entry 'scan2text.api.main:app'"
        )

    def test_pythonpath_or_working_directory_set(self, dev_ps1_content: str) -> None:
        """dev.ps1 must set PYTHONPATH to absolute src path OR use -WorkingDirectory repo root."""
        has_pythonpath = "$env:PYTHONPATH" in dev_ps1_content and "backendSrc" in dev_ps1_content
        has_working_dir = "-WorkingDirectory" in dev_ps1_content and "repoRoot" in dev_ps1_content
        assert has_pythonpath or has_working_dir, (
            "dev.ps1 must set PYTHONPATH to absolute src path OR use -WorkingDirectory to repo root"
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


class TestDevPs1NullGuard:
    """dev.ps1 must null-guard every Stop-Process call."""

    def test_stop_process_health_wait_has_null_guard(self, dev_ps1_content: str) -> None:
        """Stop-Process in health-wait failure path must guard against null PID."""
        # Find the line with Stop-Process -Id $backendProc.Id
        lines = dev_ps1_content.splitlines()
        stop_process_line_idx = None
        for i, line in enumerate(lines):
            if "Stop-Process" in line and "$backendProc.Id" in line:
                stop_process_line_idx = i
                break

        assert stop_process_line_idx is not None, (
            "dev.ps1 must have a Stop-Process call with $backendProc.Id"
        )

        # Check that there's a null/empty guard BEFORE this line
        preceding_lines = "\n".join(lines[:stop_process_line_idx])
        assert "if (" in preceding_lines or "-and " in preceding_lines or "-or " in preceding_lines, (
            "dev.ps1 must have an explicit null/empty guard before Stop-Process with $backendProc.Id"
        )

    def test_stop_process_exit_trap_has_null_guard(self, dev_ps1_content: str) -> None:
        """Stop-Process in exit trap must guard against null PID."""
        # Find the line with Stop-Process -Id $script:backendPid
        lines = dev_ps1_content.splitlines()
        stop_process_line_idx = None
        for i, line in enumerate(lines):
            if "Stop-Process" in line and "$script:backendPid" in line:
                stop_process_line_idx = i
                break

        assert stop_process_line_idx is not None, (
            "dev.ps1 must have a Stop-Process call with $script:backendPid"
        )

        # Check that there's a null/empty guard BEFORE this line
        preceding_lines = "\n".join(lines[:stop_process_line_idx])
        assert "if (" in preceding_lines or "-and " in preceding_lines or "-or " in preceding_lines, (
            "dev.ps1 must have an explicit null/empty guard before Stop-Process with $script:backendPid"
        )

    def test_error_action_silently_continue_not_only_protection(self, dev_ps1_content: str) -> None:
        """-ErrorAction SilentlyContinue alone is not sufficient; explicit null check required."""
        lines = dev_ps1_content.splitlines()
        for i, line in enumerate(lines):
            if "Stop-Process" in line and "-Id " in line:
                # This Stop-Process has -Id binding — must have explicit guard
                preceding_lines = "\n".join(lines[max(0, i - 5):i])
                has_explicit_guard = (
                    "if (" in preceding_lines or
                    "-and " in preceding_lines or
                    "-or " in preceding_lines or
                    "-ne $null" in preceding_lines or
                    "-ne \"\"" in preceding_lines or
                    "-Length" in preceding_lines or
                    "Test-Path" in preceding_lines
                )
                assert has_explicit_guard, (
                    f"Stop-Process at line {i + 1} relies only on -ErrorAction SilentlyContinue; "
                    "must have explicit null/empty guard"
                )
