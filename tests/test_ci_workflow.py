"""RED tests for the continuous integration workflow (T13, issue #9).

Every expectation comes from ``docs/slices/DECISIONS.md`` (D-53, D-56, D-57,
D-58, D-46, D-41, D-23) and ``docs/slices/HANDOFF-GUIDE.md``. The tests read the
workflow as text and assert structure: which gates run, on which runner, in
which order, and what the release job does. They never assert on formatting.

Standard library only. The backend job installs the test dependency subset,
which does not include a YAML parser, so the tests must not import one.
"""

from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
WORKFLOW = REPO_ROOT / ".github" / "workflows" / "ci.yml"
BUILD_SCRIPT = REPO_ROOT / "scripts" / "build-backend.ps1"

REQUIRED_JOBS = ("documentation", "frontend", "backend", "rust", "release")
SLOW_JOBS = ("frontend", "backend", "rust")
GATE_JOBS = ("documentation", "frontend", "backend", "rust")
BACKEND_TEST_DEPS = (
    "pytest",
    "httpx",
    "pytest-asyncio",
    "fastapi",
    "uvicorn",
    "pydantic",
    "python-multipart",
    "pillow",
    "psutil",
    "requests",
    "pypdfium2",
)


def read_workflow() -> str:
    assert WORKFLOW.is_file(), f"missing workflow file: {WORKFLOW}"
    return WORKFLOW.read_text(encoding="utf-8")


def job_blocks(text: str) -> dict[str, str]:
    """Return {job id: block text} for the two-space keys under ``jobs:``."""
    lines = text.splitlines()
    start = next(
        (index for index, line in enumerate(lines) if line.rstrip() == "jobs:"), None
    )
    assert start is not None, "the workflow has no top-level `jobs:` key"
    blocks: dict[str, list[str]] = {}
    for line in lines[start + 1 :]:
        if line and not line.startswith(" "):
            break
        match = re.match(r"^  ([A-Za-z0-9_-]+):\s*$", line)
        if match:
            blocks[match.group(1)] = []
        elif blocks:
            blocks[list(blocks)[-1]].append(line)
    return {name: "\n".join(body) for name, body in blocks.items()}


def on_block(text: str) -> str:
    lines = text.splitlines()
    start = next(
        (index for index, line in enumerate(lines) if line.rstrip() == "on:"), None
    )
    assert start is not None, "the workflow has no `on:` trigger block"
    body = []
    for line in lines[start + 1 :]:
        if line and not line.startswith(" "):
            break
        body.append(line)
    return "\n".join(body)


def gate_header(block: str) -> str:
    """The part of a job block before its steps, where `needs:` lives."""
    return block.split("steps:")[0]


def test_workflow_file_exists():
    assert WORKFLOW.is_file(), f"expected the workflow at {WORKFLOW}"


def test_workflow_triggers_on_push_and_pull_request():
    triggers = on_block(read_workflow())
    assert re.search(r"^\s+push:\s*$", triggers, re.MULTILINE)
    assert re.search(r"^\s+pull_request:\s*$", triggers, re.MULTILINE)


def test_every_job_runs_on_a_windows_runner():
    blocks = job_blocks(read_workflow())
    for job in REQUIRED_JOBS:
        assert job in blocks, f"missing job: {job}"
        assert "runs-on: windows-latest" in blocks[job], (
            f"job {job} does not run on windows-latest"
        )


def test_workflow_declares_the_five_named_jobs():
    blocks = job_blocks(read_workflow())
    for job in REQUIRED_JOBS:
        assert job in blocks, f"missing job: {job}"
        assert re.search(r"^\s+name:\s*\S", blocks[job]), f"job {job} has no name"


def test_documentation_check_is_declared_before_the_slower_jobs():
    text = read_workflow()
    positions = {job: text.index(f"  {job}:") for job in SLOW_JOBS}
    assert text.index("  documentation:") < min(positions.values())


def test_slow_jobs_need_the_documentation_check():
    blocks = job_blocks(read_workflow())
    for job in SLOW_JOBS:
        assert "documentation" in gate_header(blocks[job]), (
            f"job {job} does not need the documentation check"
        )


def test_documentation_job_runs_the_slice_document_checker():
    block = job_blocks(read_workflow())["documentation"]
    assert "scripts/check_slice_docs.py --all" in block


def test_frontend_job_runs_tests_typecheck_and_build():
    block = job_blocks(read_workflow())["frontend"]
    for command in ("npm.cmd run test", "npm.cmd run typecheck", "npm.cmd run build"):
        assert command in block, f"the frontend job does not run: {command}"


def test_backend_job_runs_the_python_suite_with_the_source_path():
    block = job_blocks(read_workflow())["backend"]
    assert "py -3.12 -m pytest -q --tb=line" in block
    assert "PYTHONPATH" in block
    assert "src" in block


def test_backend_job_installs_only_the_test_dependency_subset():
    block = job_blocks(read_workflow())["backend"]
    installs = [line for line in block.splitlines() if "pip install" in line]
    assert installs, "the backend job installs nothing"
    installed = " ".join(installs)
    for dependency in BACKEND_TEST_DEPS:
        assert dependency in installed, f"the backend job does not install {dependency}"
    assert "llama-cpp-python" not in installed, (
        "the local-inference runtime must not be installed by the backend job"
    )
    assert "llama_cpp" in block, "the workflow does not name the excluded runtime"
    assert "runtime" in block.lower() and "lazil" in block.lower(), (
        "the backend job does not explain why the runtime is excluded"
    )


def test_release_job_builds_a_draft_release_from_the_packaging_manifest():
    block = job_blocks(read_workflow())["release"]
    assert "startsWith(github.ref" in block, "the release job is not tag-triggered"
    assert "gh release create" in block and "--draft" in block
    assert "pyproject.toml" in block, "the release job does not read the manifest"
    assert "1.0.0" not in block and "1.1.0" not in block, (
        "the release job hard-codes a product version"
    )
    header = gate_header(block)
    for job in GATE_JOBS:
        assert job in header, f"the release job does not wait for {job}"


def test_workflow_caches_frontend_and_python_on_the_lock_files():
    blocks = job_blocks(read_workflow())
    assert "cache-dependency-path: frontend/package-lock.json" in blocks["frontend"]
    assert "cache: npm" in blocks["frontend"]
    assert "cache-dependency-path: pyproject.toml" in blocks["backend"]
    assert "cache: pip" in blocks["backend"]


def test_workflow_carries_no_secret_and_no_provider_key():
    text = read_workflow()
    assert "secrets." not in text
    for marker in ("NVIDIA_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "api_key"):
        assert marker not in text, f"the workflow mentions {marker}"


def test_no_gate_continues_on_error():
    assert "continue-on-error" not in read_workflow()


def test_rust_job_provides_the_bundled_backend_resource_path():
    """tauri-build fails on a fresh checkout when ../../backend is absent (T13)."""
    block = job_blocks(read_workflow())["rust"]
    assert re.search(r"New-Item[^\n]*Directory[^\n]*backend", block), (
        "the rust job does not create the bundled backend resource path"
    )


def test_build_backend_script_derives_its_root_from_its_own_location():
    assert BUILD_SCRIPT.is_file()
    text = BUILD_SCRIPT.read_text(encoding="utf-8")
    assert "D:\\" not in text, "the build script hard-codes a local absolute path"
    assert "$PSScriptRoot" in text
    spec = (REPO_ROOT / "packaging" / "scan2text-backend.spec").read_text(
        encoding="utf-8"
    )
    assert "D:\\" not in spec, "the packaging spec hard-codes a local absolute path"
    assert "pathex=[]" in spec, "the spec must let the build script inject the path"
