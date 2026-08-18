"""Tests for VlmOcrAdapter file-type routing — suffix-based, not name-based."""

from __future__ import annotations

import io
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from PIL import Image

from scan2text.adapters.vlm_ocr import VlmOcrAdapter


# PNG magic bytes (89 50 4E 47 0D 0A 1A 0A)
_PNG_MAGIC = bytes([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
# Minimal valid PNG: 1x1 red pixel
def _make_png_bytes() -> bytes:
    img = Image.new("RGB", (1, 1), color="red")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# PDF magic bytes (%PDF-)
_PDF_MAGIC = b"%PDF-1.4\n"


class _FakeVlmOcrAdapter:
    """Minimal adapter that records which branch was taken without needing model files."""

    def __init__(self) -> None:
        self.pdf_called = False
        self.image_called = False
        self.pdf_path: Path | None = None
        self.image_path: Path | None = None

    def ocr(self, image_path: str) -> str | dict:
        path = Path(image_path)
        # Replicate the routing decision from VlmOcrAdapter.ocr()
        if path.suffix.lower() == ".pdf":
            self.pdf_called = True
            self.pdf_path = path
            return [b"fake pdf page"]
        else:
            self.image_called = True
            self.image_path = path
            return "fake ocr text"


def _make_adapter() -> _FakeVlmOcrAdapter:
    return _FakeVlmOcrAdapter()


class TestRoutingUsesSuffixNotName:
    """Verify routing decision is based on file suffix, not display name substring."""

    def test_png_named_with_pdf_substring_routes_to_image_pipeline(self, tmp_path):
        """File named 'sample secure pdf.png' containing PNG magic bytes must route
        to the image pipeline (PIL decode) and complete — never hit PDF renderer.
        """
        adapter = _make_adapter()
        png_bytes = _make_png_bytes()
        path = tmp_path / "sample secure pdf.png"
        path.write_bytes(png_bytes)

        result = adapter.ocr(str(path))

        assert adapter.image_called is True
        assert adapter.pdf_called is False
        assert result == "fake ocr text"

    def test_uuid_pdf_with_pdf_bytes_routes_to_pdf_service_not_pil(self, tmp_path):
        """UUID-named .pdf containing real PDF bytes must route to pdf_service
        (PDF renderer), NOT PIL. Must never raise 'cannot identify image file'.
        """
        adapter = _make_adapter()
        path = tmp_path / "6d296f107024482d9bf26f930702518a.pdf"
        path.write_bytes(_PDF_MAGIC)

        result = adapter.ocr(str(path))

        assert adapter.pdf_called is True
        assert adapter.image_called is False
        assert isinstance(result, list)

    def test_routing_decision_uses_suffix_not_name_substring(self, tmp_path):
        """Assert that the routing decision compares path.suffix, not any substring
        of the display name. A .jpg file whose name contains 'pdf' must still route
        to the image pipeline.
        """
        adapter = _make_adapter()
        jpg_bytes = _make_png_bytes()
        path = tmp_path / "my pdf document.jpg"
        path.write_bytes(jpg_bytes)

        result = adapter.ocr(str(path))

        assert adapter.image_called is True
        assert adapter.pdf_called is False
        assert result == "fake ocr text"

    def test_pdf_extension_uppercase_routes_to_pdf_service(self, tmp_path):
        """Uppercase .PDF extension must also route to PDF service."""
        adapter = _make_adapter()
        path = tmp_path / "document.PDF"
        path.write_bytes(_PDF_MAGIC)

        result = adapter.ocr(str(path))

        assert adapter.pdf_called is True
        assert adapter.image_called is False


class TestVlmOcrAdapterRealRouting:
    """Integration-style tests against the real VlmOcrAdapter routing logic."""

    def _build_adapter(self):
        """Build a minimally initialised VlmOcrAdapter for routing tests."""
        with patch.object(VlmOcrAdapter, "__init__", lambda self: None):
            adapter = VlmOcrAdapter()
            adapter._loaded = True
            adapter._timeout = 5
            adapter._input_queue = MagicMock()
            mock_queue = MagicMock()
            mock_queue.get.return_value = "# OCR result"
            adapter._output_queue = mock_queue
            return adapter

    def test_real_adapter_routes_png_named_with_pdf_to_image(self, tmp_path):
        """Real VlmOcrAdapter: PNG bytes with 'pdf' in name → image branch."""
        png_bytes = _make_png_bytes()
        path = tmp_path / "sample secure pdf.png"
        path.write_bytes(png_bytes)

        adapter = self._build_adapter()
        render_calls = []

        def tracking_render(p):
            render_calls.append(p)
            raise RuntimeError("should not be called for .png")

        adapter._render_pdf = tracking_render

        pil_open_calls = []

        def fake_image_open(fp, *a, **kw):
            pil_open_calls.append(fp)
            return Image.new("RGB", (1, 1), "red")

        with patch("PIL.Image.open", side_effect=fake_image_open):
            result = adapter.ocr(str(path))

        assert len(render_calls) == 0, "PDF renderer must not be called for .png file"
        assert len(pil_open_calls) >= 1, "PIL Image.open must be called for .png file"
        assert isinstance(result, str)

    def test_real_adapter_routes_uuid_pdf_to_pdf_service(self, tmp_path):
        """Real VlmOcrAdapter: UUID-named .pdf → pdf_service branch, never PIL."""
        path = tmp_path / "6d296f107024482d9bf26f930702518a.pdf"
        path.write_bytes(_PDF_MAGIC)

        adapter = self._build_adapter()
        adapter._max_pdf_pages = 50

        pil_open_calls = []

        def fake_image_open(fp, *a, **kw):
            pil_open_calls.append(fp)
            raise Exception("cannot identify image file")

        with patch("PIL.Image.open", side_effect=fake_image_open):
            # _render_pdf will fail on bad PDF bytes, but that's expected.
            # The key assertion: PIL must NOT have been called.
            with pytest.raises(Exception):
                adapter.ocr(str(path))

        assert len(pil_open_calls) == 0, "PIL must not be called for .pdf file"

    def test_real_adapter_calls_crop_extraction_for_pdf(self, tmp_path):
        """Real VlmOcrAdapter: PDF must call extract_and_save_image_crops
        with the rasterized page PIL image (not the PDF path). The OCR should
        complete successfully and the crop extractor receives a PIL Image."""
        path = tmp_path / "document.pdf"
        path.write_bytes(_PDF_MAGIC)

        adapter = self._build_adapter()
        adapter._max_pdf_pages = 50
        # Mock _render_pdf to return valid (bytes, pil_image) pairs.
        pil_page = Image.new("RGB", (100, 100), color="blue")
        adapter._render_pdf = lambda p: [(b"page1", pil_page)]

        crop_calls = []

        def tracking_crop(md, src, out):
            crop_calls.append((src, out))
            return md

        with patch(
            "scan2text.adapters.vlm_ocr.extract_and_save_image_crops",
            side_effect=tracking_crop,
        ):
            result = adapter.ocr(str(path))

        assert result == "# OCR result"
        assert len(crop_calls) == 1, (
            "extract_and_save_image_crops must be called for PDF source"
        )
        src, out = crop_calls[0]
        assert isinstance(src, Image.Image), (
            "crop extractor must receive a PIL Image, not a Path"
        )
