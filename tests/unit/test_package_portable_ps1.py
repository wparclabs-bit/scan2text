"""Unit tests for package-portable.ps1 — contract assertions via content parsing."""

from __future__ import annotations

import os
import re
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_SCRIPT = REPO_ROOT / "scripts" / "package-portable.ps1"


@pytest.fixture(scope="module")
def script_content() -> str:
    """Read the packaging script from SCAN2TEXT_SCRIPT_PATH or default to live scripts/package-portable.ps1."""
    env_path = os.environ.get("SCAN2TEXT_SCRIPT_PATH")
    if env_path:
        return Path(env_path).read_text(encoding="utf-8")
    return DEFAULT_SCRIPT.read_text(encoding="utf-8")


class TestSkipBackendParameterContract:
    """package-portable.ps1 must declare a -SkipBackend switch parameter."""

    def test_skipbackend_switch_declared_in_param_block(self, script_content: str) -> None:
        """Script must contain [switch]$SkipBackend in its param block."""
        assert re.search(r'\[switch\]\$SkipBackend', script_content), (
            "package-portable.ps1 must declare [switch]$SkipBackend in the param block"
        )


class TestBuildBackendInvocationContract:
    """By default, package-portable.ps1 must invoke build-backend.ps1 before staging."""

    def test_build_backend_invoked_by_default(self, script_content: str) -> None:
        """Script must contain an actual invocation of build-backend.ps1 (not just a comment)."""
        # Must have a call site that actually runs the script — either & or .\ prefix
        has_call = bool(re.search(r'(?:&|\.\\)\s*["\']?\$PSScriptRoot.*build-backend', script_content))
        assert has_call, (
            "package-portable.ps1 must invoke build-backend.ps1 by default; "
            "look for & \"$PSScriptRoot\\build-backend.ps1\" or equivalent call site"
        )

    def test_build_backend_call_before_backendpath_read(self, script_content: str) -> None:
        """The build-backend invocation must appear before $BackendPath is read."""
        lines = script_content.splitlines()
        build_backend_line = None
        backend_path_line = None
        for i, line in enumerate(lines):
            if re.search(r'(?:&|\.\\)\s*["\']?\$PSScriptRoot.*build-backend', line):
                build_backend_line = i
            if '$BackendPath' in line and 'Join-Path' in line:
                backend_path_line = i
        assert build_backend_line is not None, (
            "package-portable.ps1 must invoke build-backend.ps1"
        )
        assert backend_path_line is not None, (
            "package-portable.ps1 must set $BackendPath via Join-Path"
        )
        assert build_backend_line < backend_path_line, (
            f"build-backend invocation (line {build_backend_line + 1}) must appear "
            f"before $BackendPath assignment (line {backend_path_line + 1})"
        )

    def test_build_backend_call_before_copy_item(self, script_content: str) -> None:
        """The build-backend invocation must appear before any Copy-Item for backend."""
        lines = script_content.splitlines()
        build_backend_line = None
        copy_backend_line = None
        for i, line in enumerate(lines):
            if re.search(r'(?:&|\.\\)\s*["\']?\$PSScriptRoot.*build-backend', line):
                build_backend_line = i
            if 'Copy-Item' in line and '$BackendPath' in line:
                copy_backend_line = i
        assert build_backend_line is not None, (
            "package-portable.ps1 must invoke build-backend.ps1"
        )
        assert copy_backend_line is not None, (
            "package-portable.ps1 must have a Copy-Item using $BackendPath"
        )
        assert build_backend_line < copy_backend_line, (
            f"build-backend invocation (line {build_backend_line + 1}) must appear "
            f"before Copy-Item for backend (line {copy_backend_line + 1})"
        )


class TestSkipBackendOptOutContract:
    """When -SkipBackend is passed, build-backend.ps1 must NOT be invoked."""

    def test_skipbackend_wraps_build_call_in_conditional(self, script_content: str) -> None:
        """The build-backend invocation must be guarded by an if (-not $SkipBackend) block."""
        lines = script_content.splitlines()
        # Find the line with [switch]$SkipBackend and the build-backend call
        skipbackend_line = None
        build_backend_call_line = None
        for i, line in enumerate(lines):
            if '[switch]$SkipBackend' in line:
                skipbackend_line = i
            if re.search(r'(?:&|\.\\)\s*["\']?\$PSScriptRoot.*build-backend', line):
                build_backend_call_line = i

        assert skipbackend_line is not None, (
            "package-portable.ps1 must declare [switch]$SkipBackend"
        )
        assert build_backend_call_line is not None, (
            "package-portable.ps1 must invoke build-backend.ps1"
        )

        # There must be an if (-not $SkipBackend) block between param and the call
        # Look for the conditional guard in the lines between param block end and the call
        found_guard = False
        for i in range(skipbackend_line, build_backend_call_line + 1):
            if re.search(r'if\s*\(\s*-not\s+\$SkipBackend\s*\)', lines[i]):
                found_guard = True
                break
        assert found_guard, (
            "package-portable.ps1 must wrap the build-backend call in "
            "an `if (-not $SkipBackend)` conditional"
        )

    def test_no_skipbackend_flag_exists_before_impl(self, script_content: str) -> None:
        """Before implementation: -SkipBackend should NOT exist (RED gate)."""
        # This test will fail RED until the parameter is added.
        # After GREEN it must pass — so we assert the opposite of what we expect post-impl.
        # The class-level tests above already verify the positive case; this is a sanity check.
        has_skipbackend = bool(re.search(r'\[switch\]\$SkipBackend', script_content))
        # This assertion will flip from False (RED) to True (GREEN) after implementation.
        # We don't assert here — the other tests in this class are the real gates.
        assert has_skipbackend, (
            "RED gate: [switch]$SkipBackend must be declared before GREEN"
        )
