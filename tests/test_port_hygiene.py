"""Port hygiene guardrail: no test may bind real network ports without ephemeral allocation or teardown.

This test scans the test suite source for patterns that would cause zombie server processes
or port-conflict failures (the S63 bug: tests binding 47351 left a zombie uvicorn process).

Allowed patterns:
- Content assertions about port 47351 in dev.ps1 / prod_runtime contract tests.
- FastAPI TestClient (ASGI transport, no real port bound).
- Port=0 (ephemeral) with proper teardown.

Forbidden patterns:
- Hardcoded uvicorn.run() with a fixed port in test code.
- socket.bind() or asyncio.start_server() with a fixed port in test code.
- subprocess spawning uvicorn with a hardcoded port and no cleanup.
"""

from __future__ import annotations

import ast
import re
from pathlib import Path


# Directories to scan (relative to repo root)
TEST_DIRS = [Path("tests")]

# Port value that must not be hardcoded in test server setup
LOCKED_PORT = 47351

# Patterns that are ALLOWED — they assert content, not bind ports
ALLOWED_PATTERNS: list[re.Pattern[str]] = [
    # Content assertions about dev.ps1 referencing the port
    re.compile(r'"47351"\s+in\s+\w+_content'),
    # Asserting get_port() returns the locked value (production contract)
    re.compile(r"assert\s+get_port\(\)\s*==\s*" + str(LOCKED_PORT)),
    # Mock return values for port (test_cli_startup.py mocks uvicorn.run)
    re.compile(r"mock_get_port\s*=\s*MagicMock\(return_value=" + str(LOCKED_PORT) + r"\)"),
    # TestClient usage — ASGI transport, no real port
    re.compile(r"from fastapi\.testclient import TestClient"),
    re.compile(r"with TestClient\("),
]

# Patterns that are FORBIDDEN in test files — they bind real ports
FORBIDDEN_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"uvicorn\.run\s*\([^)]*port\s*=\s*(?!0\b)\d+"), "uvicorn.run with hardcoded port"),
    (re.compile(r"--port\s+" + str(LOCKED_PORT)), "--port 47351 in test subprocess args"),
    (re.compile(r"socket\.bind.*\(" + str(LOCKED_PORT) + r"\)"), "socket.bind with 47351"),
    (re.compile(r"asyncio\.start_server.*port\s*=\s*(?!0\b)\d+"), "asyncio.start_server with hardcoded port"),
]


def _is_allowed(line: str, filepath: Path) -> bool:
    """Check if a line matching 47351 is in an allowed context."""
    for pat in ALLOWED_PATTERNS:
        if pat.search(line):
            return True
    return False


def _check_forbidden(filepath: Path, source: str) -> list[str]:
    """Return list of forbidden pattern violations found in source."""
    violations = []
    lines = source.splitlines()
    for i, line in enumerate(lines, start=1):
        stripped = line.strip()
        # Skip comments and blank lines
        if not stripped or stripped.startswith("#"):
            continue
        for pat, desc in FORBIDDEN_PATTERNS:
            if pat.search(line):
                violations.append(f"{filepath}:{i}: {desc} — {stripped}")
    return violations


def test_no_hardcoded_port_in_test_setup():
    """No test file may hardcode port 47351 in server setup code."""
    repo_root = Path(__file__).parent.parent
    all_violations: list[str] = []

    for test_dir in TEST_DIRS:
        full_dir = repo_root / test_dir
        if not full_dir.exists():
            continue
        for py_file in full_dir.rglob("*.py"):
            # Skip __init__.py and this hygiene test itself
            if py_file.name in ("__init__.py", "test_port_hygiene.py"):
                continue
            source = py_file.read_text(encoding="utf-8")

            # Check for any line containing the locked port
            for i, line in enumerate(source.splitlines(), start=1):
                stripped = line.strip()
                if not stripped or stripped.startswith("#"):
                    continue
                # Skip lines that are allowed
                if _is_allowed(line, py_file):
                    continue
                # Check if this line references the locked port in a suspicious context
                if str(LOCKED_PORT) in line:
                    # It's a reference — check if it's forbidden
                    for pat, desc in FORBIDDEN_PATTERNS:
                        if pat.search(line):
                            all_violations.append(f"{py_file}:{i}: {desc} — {stripped}")
                            break

    assert not all_violations, (
        "Port hygiene violation found:\n" + "\n".join(all_violations) + "\n"
        "Tests must use FastAPI TestClient (ASGI transport) or ephemeral port=0 with teardown."
    )


def test_all_api_tests_use_testclient_not_real_server():
    """All API integration tests must use TestClient, not a real running server."""
    repo_root = Path(__file__).parent.parent
    api_test_files = list(repo_root.glob("tests/test_api*.py")) + list(
        repo_root.glob("tests/test_health.py")
    )

    for py_file in api_test_files:
        source = py_file.read_text(encoding="utf-8")
        # Must import TestClient
        assert "TestClient" in source, (
            f"{py_file.name} does not use FastAPI TestClient — "
            "it may be binding a real port."
        )


def test_no_subprocess_uvicorn_in_tests():
    """No test file should spawn uvicorn via subprocess without ephemeral port + teardown."""
    repo_root = Path(__file__).parent.parent
    for py_file in repo_root.rglob("tests/**/test_*.py"):
        if py_file.name in ("__init__.py", "test_port_hygiene.py"):
            continue
        source = py_file.read_text(encoding="utf-8")
        # Check for subprocess + uvicorn combination (excluding test_dev_ps1 which tests the script)
        if "subprocess" in source and "uvicorn" in source:
            # This is OK only if it's test_dev_ps1.py (which tests dev.ps1 content)
            assert py_file.name == "test_dev_ps1.py", (
                f"{py_file.name} spawns uvicorn via subprocess — use TestClient instead, "
                "or port=0 with guaranteed teardown."
            )
