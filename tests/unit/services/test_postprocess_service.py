"""Unit tests for PostProcessService."""

from __future__ import annotations

import tempfile
from pathlib import Path

import pytest
from PIL import Image

from scan2text.services.postprocess_service import (
    convert_html_tables_to_gfm,
    extract_and_save_image_crops,
)


class TestConvertHtmlTablesToGfm:
    def test_simple_2x2_table(self):
        html = '<table><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></table>'
        result = convert_html_tables_to_gfm(html)
        expected = "| A | B |\n|---|---|\n| C | D |"
        assert result == expected

    def test_table_with_th_cells(self):
        html = '<table><tr><th>Name</th><th>Age</th></tr><tr><td>Alice</td><td>30</td></tr></table>'
        result = convert_html_tables_to_gfm(html)
        assert "| Name | Age |" in result
        assert "| Alice | 30 |" in result
        assert "|---|---|" in result

    def test_nested_tags_stripped(self):
        html = '<table><tr><td><b>Bold</b> and <i>italic</i></td><td>Plain</td></tr></table>'
        result = convert_html_tables_to_gfm(html)
        assert "**Bold** and *italic*" not in result
        assert "Bold and italic" in result
        assert "Plain" in result

    def test_multiline_table(self):
        html = """<table>
<tr>
<td>X</td>
<td>Y</td>
</tr>
</table>"""
        result = convert_html_tables_to_gfm(html)
        assert "| X | Y |" in result
        assert "|---|---|" in result

    def test_case_insensitive_tags(self):
        html = '<TABLE><TR><TD>a</TD><TD>b</TD></TR></TABLE>'
        result = convert_html_tables_to_gfm(html)
        assert "| a | b |" in result

    def test_no_tables_returns_unchanged(self):
        text = "Just plain markdown\nno tables here."
        assert convert_html_tables_to_gfm(text) == text

    def test_mixed_content_preserves_non_table_text(self):
        before = "Some intro\n"
        after = "Some outro"
        html = '<table><tr><td>A</td></tr></table>'
        full = f"{before}{html}{after}"
        result = convert_html_tables_to_gfm(full)
        assert before in result
        assert after in result
        assert "| A |" in result


class TestExtractAndSaveImageCrops:
    def test_crop_saved_and_src_rewritten(self, tmp_path):
        # Create a 1000x1000 red image
        img = Image.new("RGB", (1000, 1000), color="red")
        source = tmp_path / "doc.png"
        img.save(source)

        md_path = tmp_path / "output.md"
        markdown = 'Here is a chart:\n<img src="images/bbox_100_200_300_400.jpg" />\nDone.'

        result = extract_and_save_image_crops(markdown, source, md_path)

        # Verify crop file exists
        expected_dir = tmp_path / "output_files" / "images"
        crop_file = expected_dir / "bbox_100_200_300_400.jpg"
        assert crop_file.exists()

        # Verify crop dimensions: (300-100)=200px wide, (400-200)=200px tall
        with Image.open(crop_file) as crop_img:
            assert crop_img.size == (200, 200)

        # Verify markdown src rewritten to relative path
        assert './output_files/images/bbox_100_200_300_400.jpg' in result
        # Original absolute-style src should be gone
        assert 'src="images/bbox_' not in result

    def test_multiple_images(self, tmp_path):
        img = Image.new("RGB", (1000, 1000), color="blue")
        source = tmp_path / "chart.png"
        img.save(source)

        md_path = tmp_path / "out.md"
        markdown = '<img src="images/bbox_0_0_500_500.jpg" /><img src="images/bbox_500_500_1000_1000.jpg" />'

        result = extract_and_save_image_crops(markdown, source, md_path)

        assert (tmp_path / "out_files" / "images" / "bbox_0_0_500_500.jpg").exists()
        assert (tmp_path / "out_files" / "images" / "bbox_500_500_1000_1000.jpg").exists()
        assert "./out_files/images/bbox_0_0_500_500.jpg" in result
        assert "./out_files/images/bbox_500_500_1000_1000.jpg" in result

    def test_no_img_tags_returns_unchanged(self, tmp_path):
        source = tmp_path / "doc.png"
        Image.new("RGB", (100, 100), color="white").save(source)
        md_path = tmp_path / "out.md"
        markdown = "No images here."
        assert extract_and_save_image_crops(markdown, source, md_path) == markdown

    def test_invalid_coords_preserved(self, tmp_path):
        img = Image.new("RGB", (1000, 1000), color="green")
        source = tmp_path / "bad.png"
        img.save(source)
        md_path = tmp_path / "out.md"
        # Coordinates where x2 <= x1 — should be preserved as-is
        markdown = '<img src="images/bbox_500_100_200_400.jpg" />'
        result = extract_and_save_image_crops(markdown, source, md_path)
        # Should not crash; original tag may be preserved or rewritten safely
        assert "bbox_500_100_200_400.jpg" in result
