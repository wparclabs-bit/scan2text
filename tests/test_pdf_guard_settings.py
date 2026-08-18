"""S11-FIX48: PDF page guard reads live settings.

Verifies that check_page_limit respects the max_pages parameter and that
VlmOcrAdapter._render_pdf reads the live settings value (not a stale init-time
cache) when deciding whether to reject an oversized PDF.
"""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from scan2text.services.pdf_service import check_page_limit, count_pdf_pages


# --- Synthetic PDF builder --------------------------------------------------

def _build_minimal_pdf(num_pages: int) -> bytes:
    """Build a minimal valid PDF with *num_pages* pages, each containing
    a single text line. Uses raw PDF objects — no external libraries needed."""
    lines: list[str] = ["%PDF-1.4"]
    obj_offsets: list[int] = []

    # Catalog (1)
    obj_offsets.append(len("\r".join(lines)) + 4)
    lines.append("1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj")

    # Pages (2)
    obj_offsets.append(len("\r".join(lines)) + 4)
    kid_refs = " ".join(f"{3 + i * 2} 0 R" for i in range(num_pages))
    lines.append(f"2 0 obj<</Type/Pages/Kids([{kid_refs}])/Count {num_pages}>>endobj")

    # Page objects (3, 5, 7, …)
    for i in range(1, num_pages + 1):
        obj_offsets.append(len("\r".join(lines)) + 4)
        content_obj = 3 + i * 2
        lines.append(
            f"{3 + (i - 1) * 2} 0 obj<</Type/Page/Parent 2 0 R"
            f"/MediaBox[0 0 612 792]/Contents {content_obj} 0 R>>endobj"
        )

    # Content stream objects (4, 6, 8, …)
    for i in range(1, num_pages + 1):
        obj_offsets.append(len("\r".join(lines)) + 4)
        content = f"BT /F1 12 Tf 100 700 Td (Page {i}) Tj ET"
        lines.append(
            f"{3 + (i - 1) * 2 + 1} 0 obj<</{len(content)}>>stream"
            f"{content}endstreamendobj"
        )

    total_objs = 2 + num_pages * 2
    xref_offset = len("\r".join(lines)) + 4
    lines.append("xref")
    lines.append(f"0 {total_objs}")
    lines.append("0000000000 65535 f ")
    for off in obj_offsets:
        lines.append(f"{off:010d} 00000 n ")
    lines.append(f"trailer<</Size {total_objs}/Root 1 0 R>>")
    lines.append(f"startxref\n{xref_offset}\n%%EOF")

    return "\r".join(lines).encode("utf-8")


# --- Direct guard seam tests ------------------------------------------------

class TestCheckPageLimitDirect:
    """Seam: check_page_limit(pdf_path, max_pages) → (bool, str)."""

    def test_within_limit_passes(self, tmp_path):
        pdf = tmp_path / "small.pdf"
        pdf.write_bytes(_build_minimal_pdf(5))
        ok, err = check_page_limit(pdf, max_pages=20)
        assert ok is True
        assert err == ""

    def test_at_limit_passes(self, tmp_path):
        pdf = tmp_path / "exact.pdf"
        pdf.write_bytes(_build_minimal_pdf(20))
        ok, err = check_page_limit(pdf, max_pages=20)
        assert ok is True
        assert err == ""

    def test_over_limit_fails(self, tmp_path):
        pdf = tmp_path / "big.pdf"
        pdf.write_bytes(_build_minimal_pdf(25))
        ok, err = check_page_limit(pdf, max_pages=20)
        assert ok is False
        assert "25 pages" in err
        assert "maximum allowed is 20" in err

    def test_custom_max_passes(self, tmp_path):
        """25-page PDF with max_pages=400 must pass — proves the parameter works."""
        pdf = tmp_path / "big.pdf"
        pdf.write_bytes(_build_minimal_pdf(25))
        ok, err = check_page_limit(pdf, max_pages=400)
        assert ok is True
        assert err == ""

    def test_custom_max_zero_rejects_anything(self, tmp_path):
        pdf = tmp_path / "any.pdf"
        pdf.write_bytes(_build_minimal_pdf(1))
        ok, err = check_page_limit(pdf, max_pages=0)
        assert ok is False
        assert "1 pages" in err


# --- Adapter-level live-settings seam test ----------------------------------

class TestVlmOcrAdapterLiveSettings:
    """Seam: _render_pdf must read max_pdf_pages from live settings, not
    just the cached value set at adapter __init__ time."""

    def _make_adapter(self, max_pdf_pages: int, tmp_scan2text: Path):
        """Build a minimally initialised VlmOcrAdapter using tmp_scan2text fixture."""
        from scan2text.adapters.vlm_ocr import VlmOcrAdapter
        from scan2text.models.settings import AppSettings

        settings_data = {
            "output_dir": "",
            "max_pdf_pages": max_pdf_pages,
            "cpu_threads": 0,
            "check_updates_on_startup": True,
            "model_path": str(tmp_scan2text / "models" / "vlm.gguf"),
            "mmproj_path": str(tmp_scan2text / "models" / "mmproj.gguf"),
        }
        (tmp_scan2text / "models" / "vlm.gguf").write_bytes(b"fake-model")
        (tmp_scan2text / "models" / "mmproj.gguf").write_bytes(b"fake-mmproj")
        settings_file = tmp_scan2text / "settings" / "settings.json"
        settings_file.write_text(json.dumps(settings_data), encoding="utf-8")

        mock_svc = MagicMock()
        mock_svc.load.return_value = AppSettings(**settings_data)

        with patch("scan2text.adapters.vlm_ocr.SettingsService", return_value=mock_svc), \
             patch("scan2text.adapters.vlm_ocr.Process") as MockProc, \
             patch("scan2text.adapters.vlm_ocr.psutil") as mock_psutil:
            mock_psutil.BELOW_NORMAL_PRIORITY_CLASS = 64
            mock_proc = MagicMock()
            mock_proc.pid = 42
            MockProc.return_value = mock_proc
            adapter = VlmOcrAdapter()

        return adapter

    def test_guard_reads_live_settings_not_stale_cache(self, tmp_scan2text):
        """CEO raised max_pdf_pages to 400. A 25-page PDF must be accepted
        even though the adapter was initialised with default max_pdf_pages=20.
        The guard must read live settings (SettingsService.load()) at call time,
        not the stale _max_pdf_pages cached at __init__ time."""
        # Build adapter with DEFAULT settings (max_pdf_pages=20)
        adapter = self._make_adapter(20, tmp_scan2text)

        # Build a 25-page PDF (exceeds init-time default of 20)
        pdf = tmp_scan2text / "big.pdf"
        pdf.write_bytes(_build_minimal_pdf(25))

        # Monkeypatch SettingsService so a FRESH load returns max_pdf_pages=400.
        # If the guard reads live settings, the PDF should pass.
        # If it uses the cached _max_pdf_pages=20, it will fail.
        from scan2text.models.settings import AppSettings
        live_settings = AppSettings(
            output_dir="", max_pdf_pages=400, cpu_threads=0,
            check_updates_on_startup=True,
            model_path=str(tmp_scan2text / "models" / "vlm.gguf"),
            mmproj_path=str(tmp_scan2text / "models" / "mmproj.gguf"),
        )

        # Also patch the adapter's already-cached _settings_service so the
        # guard reads the live value at call time.
        mock_live_svc = MagicMock()
        mock_live_svc.load.return_value = live_settings
        adapter._settings_service = mock_live_svc

        # Patch pypdfium rendering so we only test the guard path, not the
        # rasterizer (synthetic PDF can be counted but not rendered).
        with patch("scan2text.adapters.vlm_ocr.pdfium") as mock_pdfium, \
             patch("scan2text.adapters.vlm_ocr._prepare_views", return_value=[b"png"]):
            mock_pdf_doc = MagicMock()
            mock_pdfium.PdfDocument.return_value = mock_pdf_doc
            mock_pdf_doc.__len__ = MagicMock(return_value=25)
            mock_pdf_doc.__enter__ = MagicMock(return_value=mock_pdf_doc)
            mock_pdf_doc.__exit__ = MagicMock(return_value=False)
            mock_page = MagicMock()
            mock_bitmap = MagicMock()
            mock_pil = MagicMock()
            mock_pil.size = (100, 100)
            mock_bitmap.to_pil.return_value = mock_pil
            mock_pil.convert.return_value = mock_pil
            mock_page.render.return_value = mock_bitmap
            mock_pdf_doc.__getitem__ = MagicMock(return_value=mock_page)

            result = adapter._render_pdf(pdf)

        # EXPECTED: guard reads live settings → list of pages (success)
        # CURRENT BUG: guard uses stale _max_pdf_pages=20 → error dict
        assert isinstance(result, list), (
            "LIVE_SETTINGS_VERDICT:FAIL — guard uses stale _max_pdf_pages "
            f"instead of live settings. Result: {result}"
        )
        assert len(result) == 25
