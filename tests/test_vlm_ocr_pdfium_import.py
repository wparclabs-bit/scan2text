"""Regression guard: vlm_ocr must expose pdfium module for PDF rasterization.

S10-FIX21 (75c77ec) removed `import pypdfium2 as pdfium` from vlm_ocr.py,
but line 275 still calls `pdfium.PdfDocument()`. This test prevents that
regression from re-entering the codebase.
"""

from scan2text.adapters import vlm_ocr


def test_vlm_ocr_has_pdfium_attribute():
    """vlm_ocr must import pypdfium2 as pdfium — required by line ~275."""
    assert hasattr(vlm_ocr, "pdfium"), (
        "vlm_ocr.py is missing `import pypdfium2 as pdfium`. "
        "Line 275 calls pdfium.PdfDocument() and will raise NameError at runtime."
    )
