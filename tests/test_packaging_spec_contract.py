# -*- mode: python ; coding: utf-8 -*-
"""Contract test: packaging/scan2text-backend.spec must exclude pyarrow and pandas.

These packages are not used by scan2text-backend but were pulled in as transitive
dependencies, inflating the bundle by ~91.5 MB (pyarrow 79 MB + pandas 12.5 MB).
DIAG-V11 S1 verdict requires both to be in the excludes list.
"""

import ast
import re
from pathlib import Path

import pytest

SPEC_PATH = Path(__file__).resolve().parent.parent / "packaging" / "scan2text-backend.spec"


@pytest.fixture(scope="module")
def spec_excludes():
    """Parse the spec file and extract the excludes list as a Python set."""
    content = SPEC_PATH.read_text(encoding="utf-8")

    # Find the excludes = [...] block
    match = re.search(r"^excludes\s*=\s*\[(.*?)\]", content, re.MULTILINE | re.DOTALL)
    assert match is not None, f"Could not find 'excludes = [...]' in {SPEC_PATH}"

    excludes_block = match.group(1)

    # Extract all string literals from the excludes block
    strings = re.findall(r'''["\']([^"\']*)["\']''', excludes_block)
    return set(strings)


class TestPackagingSpecExcludes:
    """Contract: pyarrow and pandas must be excluded from the backend bundle."""

    def test_pyarrow_excluded(self, spec_excludes):
        assert "pyarrow" in spec_excludes, (
            f"'pyarrow' is missing from excludes list. "
            f"Current excludes: {sorted(spec_excludes)}"
        )

    def test_pandas_excluded(self, spec_excludes):
        assert "pandas" in spec_excludes, (
            f"'pandas' is missing from excludes list. "
            f"Current excludes: {sorted(spec_excludes)}"
        )


class TestPackagingSpecBinaryFilter:
    """Contract: scan2text-backend.spec must define filtered_binaries and use it in Analysis."""

    @pytest.fixture(scope="module")
    def spec_content(self):
        return SPEC_PATH.read_text(encoding="utf-8")

    def test_filtered_binaries_defined(self, spec_content):
        """The spec must contain a filtered_binaries definition."""
        assert re.search(
            r"filtered_binaries\s*=",
            spec_content,
        ), "filtered_binaries is not defined in the spec"

    def test_analysis_uses_filtered_binaries(self, spec_content):
        """The Analysis call must use binaries=filtered_binaries, not all_binaries."""
        # Find the Analysis( ... ) block and check it uses filtered_binaries
        analysis_match = re.search(
            r"Analysis\s*\((.*?)\)",
            spec_content,
            re.DOTALL,
        )
        assert analysis_match is not None, "Could not find Analysis( ... ) in spec"
        analysis_block = analysis_match.group(1)
        assert "binaries=filtered_binaries" in analysis_block, (
            "Analysis call does not use binaries=filtered_binaries"
        )
        assert "binaries=all_binaries" not in analysis_block, (
            "Analysis call still uses binaries=all_binaries instead of filtered_binaries"
        )

    def test_binary_filter_removes_pyarrow(self, spec_content):
        """The filtered_binaries definition must exclude pyarrow entries."""
        # Find the filtered_binaries assignment
        match = re.search(
            r"filtered_binaries\s*=\s*(.+)",
            spec_content,
            re.DOTALL,
        )
        assert match is not None, "Could not find filtered_binaries definition"
        filter_expr = match.group(1).strip()
        # The filter expression must reference pyarrow in some exclusion logic
        assert "pyarrow" in filter_expr, (
            f"filtered_binaries expression does not filter pyarrow: {filter_expr}"
        )

    def test_binary_filter_removes_pandas(self, spec_content):
        """The filtered_binaries definition must exclude pandas entries."""
        match = re.search(
            r"filtered_binaries\s*=\s*(.+)",
            spec_content,
            re.DOTALL,
        )
        assert match is not None, "Could not find filtered_binaries definition"
        filter_expr = match.group(1).strip()
        assert "pandas" in filter_expr, (
            f"filtered_binaries expression does not filter pandas: {filter_expr}"
        )
