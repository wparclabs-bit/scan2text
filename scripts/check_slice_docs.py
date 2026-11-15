#!/usr/bin/env python3
"""Validate every slice document against the fourteen-section template (T00, issue #6).

The template lives in ONE place: the fenced block under "The slice document
template" in docs/slices/HANDOFF-GUIDE.md. This script reads it; it never
repeats the section list.

Standard library only. See docs/slices/DECISIONS.md D-44, D-48, and D-52.

Usage:
    py -3.12 scripts/check_slice_docs.py --all
    py -3.12 scripts/check_slice_docs.py docs/slices/T00-checker-script.md

Exit codes: 0 all documents valid; 1 at least one document is invalid;
2 the template or a requested file could not be read.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

SLICE_DIR = Path("docs/slices")
GUIDE = SLICE_DIR / "HANDOFF-GUIDE.md"
SLICE_GLOB = "T[0-9][0-9]-*.md"
REPO_ROOT = Path(__file__).resolve().parent.parent

_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$")
_TEMPLATE_MARKER = "The slice document template"
_FENCE = "```"
_TEST_FILE_RE = re.compile(r"`([A-Za-z0-9_./-]+\.(?:py|ts|tsx))`")
_COMMAND_RE = re.compile(r"^(py|python|npm|cargo|pwsh)\b")
_BACKTICK_COMMAND_RE = re.compile(r"`((?:py|python|npm|cargo|pwsh)\b[^`]*)`")
_TEMPLATE_BODY_RE = re.compile(r"^[ \t]*-[ \t](\S.*)$")


class TemplateError(Exception):
    """The handoff guide does not contain the fourteen-section template."""


def read_template(path):
    """Return [(section name, body), ...] from the guide's template block."""
    return template_sections(Path(path).read_text(encoding="utf-8"))


def template_sections(guide_text):
    """Extract the ordered sections from the first fenced block after the marker."""
    lines = guide_text.splitlines()
    try:
        marker = next(i for i, line in enumerate(lines) if _TEMPLATE_MARKER in line)
    except StopIteration:
        raise TemplateError("guide does not name " + _TEMPLATE_MARKER) from None
    try:
        start = next(i for i in range(marker + 1, len(lines)) if _FENCE in lines[i])
    except StopIteration:
        raise TemplateError("no fenced template block after " + _TEMPLATE_MARKER) from None
    try:
        end = next(i for i in range(start + 1, len(lines)) if _FENCE in lines[i])
    except StopIteration:
        raise TemplateError("unterminated fenced template block") from None

    sections = []
    current = None
    for line in lines[start + 1 : end]:
        heading = _HEADING_RE.match(line)
        if heading:
            if len(heading.group(1)) == 2:
                current = [heading.group(2), []]
                sections.append(current)
            else:
                current = None
            continue
        body = _TEMPLATE_BODY_RE.match(line)
        if body and current is not None:
            current[1].append(body.group(1))
    if not sections:
        raise TemplateError("the fenced template block declares no sections")
    return tuple((name, "\n".join(body)) for name, body in sections)


def section_bodies(text, template):
    """Return [(section name, body), ...] for the sections present in `text`.

    A section ends at the next heading of the same or a higher level.
    """
    lines = text.splitlines()
    headings = []
    for index, line in enumerate(lines):
        match = _HEADING_RE.match(line)
        if match:
            headings.append((index, len(match.group(1)), match.group(2)))
    found = []
    for name, _ in template:
        for position, (index, level, title) in enumerate(headings):
            if title != name:
                continue
            stop = len(lines)
            for later, later_level, _later_title in headings[position + 1 :]:
                if later_level <= level:
                    stop = later
                    break
            found.append((name, "\n".join(lines[index + 1 : stop])))
            break
    return tuple(found)


def missing_sections(text, template):
    present = {name for name, _ in section_bodies(text, template)}
    return tuple(name for name, _ in template if name not in present)


def _test_file_refs(body):
    return _TEST_FILE_RE.findall(body or "")


def _unwrap_command(candidate):
    """Return the command a bullet line names, or None.

    A bullet may be `py -3.12 ...`, or `Label: `py -3.12 ...`` so the
    backtick-delimited command is searched anywhere in the line.
    """
    match = _BACKTICK_COMMAND_RE.search(candidate)
    if match:
        return match.group(1).strip()
    return candidate if _COMMAND_RE.match(candidate) else None


def _commands(body):
    commands = []
    for line in (body or "").splitlines():
        candidate = line.strip().lstrip("-*").strip()
        command = _unwrap_command(candidate)
        if command:
            commands.append(command)
    return commands


def _agents_md_reference(text):
    return "AGENTS.md" in text


def document_problems(text, template):
    """Human-readable problems with one document, in reading order."""
    problems = []
    if not _agents_md_reference(text):
        problems.append('missing the reference to "AGENTS.md" (read it first)')
    for name in missing_sections(text, template):
        problems.append("missing template section: " + name)
    bodies = dict(section_bodies(text, template))
    red_body = bodies.get("RED tests to write first", "")
    if red_body.strip() and not _test_file_refs(red_body):
        problems.append("RED tests are not named: no test file reference found")
    elif not red_body.strip():
        problems.append("RED tests are not named")

    if bodies.get("Verification commands", "").strip() and not _commands(
        bodies["Verification commands"]
    ):
        problems.append("verification commands are not listed")

    if not (bodies.get("Handoff notes", "") or "").strip():
        problems.append("handoff notes are empty")
    return problems


def check_text(path, text, template):
    problems = document_problems(text, template)
    return {
        "path": str(path),
        "ok": not problems,
        "problems": problems,
        "missing_sections": missing_sections(text, template),
    }


def check(documents, template):
    """Validate (label, text) pairs; every returned report carries `problems`."""
    return [check_text(label, text, template) for label, text in documents]


def check_paths(paths, template):
    reports = []
    for path in paths:
        path = Path(path)
        if not path.is_file():
            reports.append(
                {
                    "path": str(path),
                    "ok": False,
                    "problems": ["file not found"],
                    "missing_sections": (),
                }
            )
            continue
        reports.append(check_text(path, path.read_text(encoding="utf-8"), template))
    return reports


def collect_slice_documents(directory):
    directory = Path(directory)
    if not directory.is_dir():
        return []
    return sorted(directory.glob(SLICE_GLOB))


def _report(reports, label):
    for report in reports:
        if report["ok"]:
            print("ok    " + label)
        else:
            print("FAIL  " + label)
            for problem in report["problems"]:
                print("        - " + problem)


def main(argv=None):
    parser = argparse.ArgumentParser(
        prog="check_slice_docs.py",
        description="Validate slice documents against the fourteen-section template.",
    )
    parser.add_argument("files", nargs="*", help="slice documents to check")
    parser.add_argument(
        "--all",
        action="store_true",
        help="check every docs/slices/TNN-*.md document (the default)",
    )
    args = parser.parse_args(argv)

    try:
        template = read_template(GUIDE)
    except (OSError, TemplateError) as error:
        print("FAIL  " + str(GUIDE))
        print("        - " + str(error))
        return 2

    if args.files:
        paths = [Path(item) for item in args.files]
        label = "document" if len(paths) == 1 else "documents"
    else:
        paths = collect_slice_documents(SLICE_DIR)
        label = "slice " + ("document" if len(paths) == 1 else "documents")
        if not paths:
            print("FAIL  " + str(SLICE_DIR))
            print("        - no slice documents found")
            return 2

    reports = check_paths(paths, template)
    _report(reports, label)
    return 0 if all(report["ok"] for report in reports) else 1


if __name__ == "__main__":
    sys.exit(main())
