"""S11-FIX51: effective_ocr_timeout autoscale — max(base, pages×30s)."""

from __future__ import annotations

import json
import queue
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from scan2text.adapters.vlm_ocr import effective_ocr_timeout


def _write_minimal_pdf(path: Path, page_count: int) -> None:
    """Write a minimal valid PDF with page_count blank pages."""
    pages = []
    offsets: list[int] = []
    for _ in range(page_count):
        offsets.append(len(path.read_bytes()) if path.exists() else 0)
        pages.append(b"")
    # Build a minimal PDF from scratch using pypdfium2 not available here;
    # use a pre-built minimal PDF stub that pypdfium2 can open.
    # We'll use the pdfium library itself to generate one.
    import pypdfium2 as pdfium
    pdf = pdfium.PdfDocument.new()
    for _ in range(page_count):
        pdf.new_page(width=612, height=792)
    pdf.save(str(path))


# ── Pure helper tests ────────────────────────────────────────────────────────


class TestEffectiveOcrTimeout:
    """Pure function: max(base_seconds, pages * 30)."""

    def test_short_doc_uses_base_cap(self):
        """A 1-page file never exceeds the user's base timeout."""
        assert effective_ocr_timeout(600, 1) == 600

    def test_long_pdf_autoscales(self):
        """A 100-page PDF gets 3000s (100 × 30s) > 600s base."""
        assert effective_ocr_timeout(600, 100) == 3000

    def test_higher_user_value_wins(self):
        """When the user set a high base (7200), it stays the cap."""
        assert effective_ocr_timeout(7200, 10) == 7200

    def test_zero_pages_uses_base(self):
        """Edge: 0 pages still respects the base timeout."""
        assert effective_ocr_timeout(600, 0) == 600

    def test_exact_boundary(self):
        """When pages×30 exactly equals base, either is fine (max is equal)."""
        assert effective_ocr_timeout(300, 10) == 300


# ── Wiring test ──────────────────────────────────────────────────────────────


class TestTimeoutWiring:
    """Verify the enforcement site in VlmOcrAdapter.ocr() uses the autoscaled value."""

    def test_397_page_pdf_receives_autoscaled_timeout(self, tmp_scan2text: Path):
        """A 397-page PDF with base=600 must trigger a queue.get() with >= 11910s.

        397 × 30 = 11910 > 600, so the autoscaled timeout must be at least 11910.
        """
        settings_data = {
            "output_dir": "",
            "max_pdf_pages": 500,  # allow 397 pages
            "cpu_threads": 0,
            "check_updates_on_startup": True,
            "model_path": str(tmp_scan2text / "models" / "vlm.gguf"),
            "mmproj_path": str(tmp_scan2text / "models" / "mmproj.gguf"),
            "ocr_timeout_seconds": 600,
        }
        (tmp_scan2text / "models" / "vlm.gguf").write_bytes(b"fake-model")
        (tmp_scan2text / "models" / "mmproj.gguf").write_bytes(b"fake-mmproj")
        settings_file = tmp_scan2text / "settings" / "settings.json"
        settings_file.write_text(json.dumps(settings_data), encoding="utf-8")

        # Create a minimal PDF with 397 pages
        pdf_path = tmp_scan2text / "input.pdf"
        _write_minimal_pdf(pdf_path, page_count=397)

        mock_input_queue = MagicMock()
        mock_output_queue = MagicMock()
        mock_output_queue.get.side_effect = queue.Empty()

        mock_process_instance = MagicMock()
        mock_process_instance.pid = 99

        with patch("scan2text.adapters.vlm_ocr.SettingsService") as MockSettingsSvc, \
             patch("scan2text.adapters.vlm_ocr.Process", return_value=mock_process_instance), \
             patch("scan2text.adapters.vlm_ocr.Queue", side_effect=[mock_input_queue, mock_output_queue]), \
             patch("scan2text.adapters.vlm_ocr.psutil") as mock_psutil, \
             patch("scan2text.adapters.vlm_ocr._shrink_to_png", side_effect=lambda b: b), \
             patch("scan2text.adapters.vlm_ocr._prepare_views", side_effect=lambda img: [b"fake-image-bytes"]), \
             patch("PIL.Image.open") as mock_img_open:
            mock_img_open.return_value.convert.return_value.size = (80, 60)
            mock_img_open.return_value.convert.return_value.__enter__ = lambda s: s
            mock_img_open.return_value.convert.return_value.__exit__ = lambda s, *a: None
            mock_psutil.Process.return_value = MagicMock()
            mock_psutil.BELOW_NORMAL_PRIORITY_CLASS = 64

            mock_svc_instance = MagicMock()
            from scan2text.models.settings import AppSettings
            mock_svc_instance.load.return_value = AppSettings(**settings_data)
            MockSettingsSvc.return_value = mock_svc_instance

            from scan2text.adapters.vlm_ocr import VlmOcrAdapter
            adapter = VlmOcrAdapter()
            result = adapter.ocr(str(pdf_path))

        # The queue.get call should have used the autoscaled timeout
        call_args = mock_output_queue.get.call_args
        assert call_args is not None
        timeout_used = call_args.kwargs.get("timeout") or (
            call_args.args[1] if len(call_args.args) > 1 else None
        )
        assert timeout_used is not None
        assert timeout_used >= 11910, (
            f"Expected timeout >= 11910 for 397 pages, got {timeout_used}"
        )
        assert result["error"] == "OCR_TIMEOUT"
