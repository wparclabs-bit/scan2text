"""RED tests for scripts/check_slice_docs.py (T00, issue #6).

Standard library only, apart from pytest itself. Every expectation comes from
docs/slices/HANDOFF-GUIDE.md, which owns the template.
"""

from __future__ import annotations

import importlib.util
import re
import shutil
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
GUIDE = REPO_ROOT / "docs" / "slices" / "HANDOFF-GUIDE.md"
SCRIPTS_DIR = REPO_ROOT / "scripts"

if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))


def _load_checker():
    path = SCRIPTS_DIR / "check_slice_docs.py"
    spec = importlib.util.spec_from_file_location("check_slice_docs", path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules["check_slice_docs"] = module
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="module")
def checker():
    return _load_checker()


@pytest.fixture(scope="module")
def template(checker):
    return checker.read_template(GUIDE)


DEFAULT_SECTIONS = {
    "Goal": "Read `AGENTS.md` first. Convert a document to Markdown.",
    "Verification commands": "- `py -3.12 -m pytest -q` - expected all green.",
    "RED tests to write first": "- File: `tests/test_example.py` (new, one test).",
    "Handoff notes": "- The next slice may assume the checker exists.",
}


def slice_document(template, drop_section=None, replace=None):
    """Build a valid slice document from the guide's own template."""
    replace = replace or {}
    text = "# T99 - A test slice\n\n"
    for name, body in template:
        if name == drop_section:
            continue
        text += "## " + name + "\n"
        body_text = replace.get(name, body or DEFAULT_SECTIONS.get(name, ""))
        if body_text:
            text += body_text + "\n"
        text += "\n"
    return text


def no_error_reports(reports):
    return [report for report in reports if report["ok"] is not True]


# --- the template is the single source of truth ---------------------------


def test_template_extracts_the_fourteen_sections_from_the_guide(checker, template):
    assert len(template) == 14
    assert template[0][0] == "State snapshot"


# --- the happy path -------------------------------------------------------


def test_valid_document_passes(checker, template):
    document = slice_document(template)
    reports = checker.check([("T00-checker-script.md", document)], template)
    assert no_error_reports(reports) == []


def test_missing_section_is_named(checker, template):
    document = slice_document(template, drop_section="Goal")
    report = checker.check([("T00-checker-script.md", document)], template)[0]
    assert report["missing_sections"] == ("Goal",)
    assert any("Goal" in problem for problem in report["problems"])


# --- the four contract rules (D-48) --------------------------------------


def test_agents_md_reference_is_required(checker, template):
    document = slice_document(
        template, replace={"Goal": "Convert a PDF, with no operating manual named."}
    )
    report = checker.check([("doc.md", document)], template)[0]
    assert report["ok"] is False
    assert "AGENTS.md" in report["problems"][0]


def test_red_tests_must_be_named(checker, template):
    document = slice_document(
        template, replace={"RED tests to write first": "Write some tests later."}
    )
    report = checker.check([("doc.md", document)], template)[0]
    assert "RED tests" in report["problems"][0]


def test_red_tests_need_a_real_test_file_reference(checker):
    assert checker._test_file_refs("see `tests/test_example.py` for the test") == [
        "tests/test_example.py"
    ]
    assert checker._test_file_refs("Write some tests later.") == []


def test_verification_commands_must_be_listed(checker, template):
    document = slice_document(
        template, replace={"Verification commands": "Run the usual gates."}
    )
    report = checker.check([("doc.md", document)], template)[0]
    assert "verification commands" in report["problems"][0]


def test_handoff_notes_must_not_be_empty(checker, template):
    document = slice_document(template, replace={"Handoff notes": "   "})
    report = checker.check([("doc.md", document)], template)[0]
    assert "handoff notes" in report["problems"][0]


# --- the checker reads the guide, it does not hardcode its list -----------


def test_rewriting_the_guide_changes_the_result(checker, tmp_path):
    guide_copy = tmp_path / "HANDOFF-GUIDE.md"
    shutil.copy(GUIDE, guide_copy)
    text = guide_copy.read_text(encoding="utf-8").replace("## Goal", "## Objective", 1)
    guide_copy.write_text(text, encoding="utf-8")
    names = dict(checker.read_template(guide_copy)).keys()
    assert "Goal" not in names


# --- the repository's own slice documents ---------------------------------


def test_every_slice_document_in_the_repository_passes(checker, template):
    documents = checker.collect_slice_documents(REPO_ROOT / "docs" / "slices")
    names = {path.name for path in documents}
    # The set grows by one document per slice, so assert the checker's own
    # document is present and that every collected document passes, rather
    # than freezing the set and failing CI on the next slice (T13).
    assert "T00-checker-script.md" in names, names
    for path in documents:
        report = checker.check_text(path, path.read_text(encoding="utf-8"), template)
        assert report["ok"] is True, report["problems"]


def test_collect_ignores_non_slice_files(checker, tmp_path):
    (tmp_path / "README.md").write_text("# readme", encoding="utf-8")
    (tmp_path / "STATE.md").write_text("# state", encoding="utf-8")
    (tmp_path / "T03-cloud-routing.md").write_text("# slice", encoding="utf-8")
    assert [path.name for path in checker.collect_slice_documents(tmp_path)] == [
        "T03-cloud-routing.md"
    ]


# --- the command line -----------------------------------------------------


def test_check_paths_rejects_a_missing_document(checker, template, tmp_path):
    reports = checker.check_paths([tmp_path / "absent.md"], template)
    assert reports == [{"path": str(tmp_path / "absent.md"), "ok": False,
                        "problems": ["file not found"], "missing_sections": ()}]


def test_cli_exits_zero_for_a_valid_file(checker, template, tmp_path):
    document = tmp_path / "T99-valid.md"
    document.write_text(slice_document(template), encoding="utf-8")
    assert checker.main([str(document)]) == 0


def test_cli_exits_non_zero_for_a_broken_file(checker, template, tmp_path):
    document = tmp_path / "T99-broken.md"
    document.write_text(slice_document(template, drop_section="Goal"), encoding="utf-8")
    assert checker.main([str(document)]) == 1


# --- this slice's own document is checkable -------------------------------


def test_this_slice_document_carries_the_required_text(checker, template):
    text = (REPO_ROOT / "docs" / "slices" / "T00-checker-script.md").read_text(
        encoding="utf-8"
    )
    report = checker.check_text("T00-checker-script.md", text, template)
    assert report["ok"] is True, report["problems"]
    bodies = dict(checker.section_bodies(text, template))
    assert "AGENTS.md" in text
    assert "tests/test_check_slice_docs.py" in checker._test_file_refs(
        bodies["RED tests to write first"]
    )
    assert len(checker._commands(bodies["Verification commands"])) >= 1
    assert re.search(r"\S", bodies["Handoff notes"])
