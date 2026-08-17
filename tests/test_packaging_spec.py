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
