"""S11-FIX46: PDF chart crop extraction via rasterize-then-crop.

Verifies that PDF pages get chart crops extracted from the rasterized page
image (the exact image the model received), with tags rewritten to relative
paths exactly like the image flow.
"""

from __future__ import annotations

import io
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from PIL import Image

from scan2text.adapters.vlm_ocr import VlmOcrAdapter
from scan2text.services.postprocess_service import extract_and_save_image_crops


# PDF magic bytes
_PDF_MAGIC = b"%PDF-1.4\n"


class TestExtractAndSaveImageCropsPilSource:
    """Seam tests: extract_and_save_image_crops accepts a PIL Image directly."""

    def test_pil_image_crop_saved_and_src_rewritten(self, tmp_path):
        """PIL image + markdown with bbox tag → crop JPEG saved under
        {stem}_files/images/ AND tag rewritten to relative path."""
        img = Image.new("RGB", (1000, 1000), color="red")
        md_path = tmp_path / "output.md"
        markdown = (
            'Here is a chart:\n'
            '<img src="images/bbox_0_0_20_20.jpg" />\n'
            "Done."
        )

        result = extract_and_save_image_crops(markdown, img, md_path)

        expected_dir = tmp_path / "output_files" / "images"
        crop_file = expected_dir / "bbox_0_0_20_20.jpg"
        assert crop_file.exists()
        with Image.open(crop_file) as crop_img:
            assert crop_img.size == (20, 20)
        assert "./output_files/images/bbox_0_0_20_20.jpg" in result
        assert 'src="images/bbox_' not in result


class TestVlmOcrPdfChartCrops:
    """PDF integration: rasterize-then-crop via monkeypatched adapter."""

    def _build_adapter(self):
        """Build a minimally initialised VlmOcrAdapter for integration tests."""
        with patch.object(VlmOcrAdapter, "__init__", lambda self: None):
            adapter = VlmOcrAdapter()
            adapter._loaded = True
            adapter._timeout = 5
            adapter._input_queue = MagicMock()
            mock_queue = MagicMock()
            mock_queue.get.return_value = (
                "Page text.\n<img src=\"images/bbox_100_200_300_400.jpg\" />"
            )
            adapter._output_queue = mock_queue
            return adapter

    def test_pdf_page_crop_extracted_and_tag_rewritten(self, tmp_path):
        """Monkeypatch _render_pdf to return a solid-color PIL image; mock
        model output with one bbox tag → final .md contains rewritten relative
        tag AND crop file exists."""
        path = tmp_path / "document.pdf"
        path.write_bytes(_PDF_MAGIC)

        # Create a 1000x1000 solid-color PIL image to serve as the rasterized page.
        pil_page = Image.new("RGB", (1000, 1000), color="blue")

        adapter = self._build_adapter()
        adapter._max_pdf_pages = 20

        def mock_render_pdf(p):
            # Return list of (png_bytes, pil_image) tuples — one per page view.
            buf = io.BytesIO()
            pil_page.save(buf, format="PNG")
            return [(buf.getvalue(), pil_page)]

        adapter._render_pdf = mock_render_pdf

        result = adapter.ocr(str(path))

        # The markdown should have the bbox tag rewritten to a relative path.
        assert './document_files/images/bbox_100_200_300_400.jpg' in result
        assert 'src="images/bbox_' not in result

        # The crop file should exist on disk.
        crop_file = tmp_path / "document_files" / "images" / "bbox_100_200_300_400.jpg"
        assert crop_file.exists()
        with Image.open(crop_file) as crop_img:
            assert crop_img.size == (200, 200)


class TestPdfChartCropsRegression:
    """Regression: existing image-flow crop tests stay green unchanged."""

    def test_existing_image_crop_still_works(self, tmp_path):
        """Path-based extract_and_save_image_crops still works for images."""
        img = Image.new("RGB", (1000, 1000), color="green")
        source = tmp_path / "doc.png"
        img.save(source)

        md_path = tmp_path / "output.md"
        markdown = '<img src="images/bbox_100_200_300_400.jpg" />'

        result = extract_and_save_image_crops(markdown, source, md_path)

        crop_file = tmp_path / "output_files" / "images" / "bbox_100_200_300_400.jpg"
        assert crop_file.exists()
        assert "./output_files/images/bbox_100_200_300_400.jpg" in result

    def test_no_img_tags_returns_unchanged_for_pil(self, tmp_path):
        """PIL image source with no img tags → markdown unchanged."""
        img = Image.new("RGB", (100, 100), color="white")
        md_path = tmp_path / "out.md"
        markdown = "No images here."
        assert extract_and_save_image_crops(markdown, img, md_path) == markdown
