"""Verify packaging spec explicitly collects pypdfium2.

BUG-37 / DIAG2 root cause: spec collects llama_cpp + PIL but NOT pypdfium2,
which is the locked PDF rasterizer (PRD §12, L6). Without this, the packaged
exe cannot render PDFs at all.

Tests the spec text contract — no import-time execution of the spec.
"""

import re
from pathlib import Path

SPEC_PATH = Path(__file__).resolve().parent.parent / "packaging" / "scan2text-backend.spec"


def test_spec_contains_pypdfium2_collect_all():
    """Spec text must call collect_all("pypdfium2")."""
    text = SPEC_PATH.read_text(encoding="utf-8")
    assert 'collect_all("pypdfium2")' in text, (
        "spec must collect pypdfium2 binaries/hiddenimports via collect_all"
    )


def test_spec_merges_pypdfium2_binaries_into_all_binaries():
    """Binaries from pypdfium2 collect_all must flow into all_binaries."""
    text = SPEC_PATH.read_text(encoding="utf-8")
    # Must have a tmp_ret_pdf variable that captures collect_all
    assert re.search(r"tmp_ret_pdf\s*=\s*collect_all\([\"']pypdfium2[\"']\)", text), (
        "spec must assign collect_all('pypdfium2') to a tmp_ret_pdf variable"
    )
    # all_binaries must include the pypdfium2 binaries (via intermediate or direct)
    assert re.search(r"all_binaries\s*=\s*\[.*\*(pdf_binaries|tmp_ret_pdf\[1\])", text), (
        "all_binaries must merge pypdfium2 binaries"
    )


def test_spec_merges_pypdfium2_hiddenimports_into_all_hiddenimports():
    """Hidden imports from pypdfium2 collect_all must flow into all_hiddenimports."""
    text = SPEC_PATH.read_text(encoding="utf-8")
    assert re.search(r"all_hiddenimports\s*=\s*\[.*\*(pdf_hiddenimports|tmp_ret_pdf\[2\])", text), (
        "all_hiddenimports must merge pypdfium2 hiddenimports"
    )


def test_spec_not_onefile():
    """ADR-008 Decision 2 / CEO Option B: spec MUST be folder-based, not onefile.

    The onefile mode bundles everything into a single 45 MB exe with zero
    standalone DLLs on disk, which breaks pypdfium2's sibling-DLL resolution.
    Spec text must never contain `onefile=True`.
    """
    text = SPEC_PATH.read_text(encoding="utf-8")
    assert "onefile=True" not in text, (
        "spec must not use onefile=True; ADR-008 locks folder-based output"
    )


def test_spec_has_collect_block_for_folder_artifact():
    """Spec must declare a COLLECT block that names the scan2text-backend folder artifact.

    PyInstaller's EXE defaults to onefile=True; without an explicit onefile=False
    (or an explicit COLLECT), the build produces a single exe. ADR-008 requires
    a folder artifact so pypdfium2_raw/pdfium.dll lands as a real sibling file.
    """
    text = SPEC_PATH.read_text(encoding="utf-8")
    assert re.search(r"COLLECT\(", text), (
        "spec must contain a COLLECT( block for onedir output"
    )
    assert re.search(r"name\s*=\s*['\"]scan2text-backend['\"]", text), (
        "COLLECT block must name 'scan2text-backend'"
    )
