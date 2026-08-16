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

    def test_messy_unclosed_tags(self):
        """HTML with missing closing td and tr tags must still produce valid GFM."""
        html = (
            '<table>'
            '<tr><td>Header A<td>Header B'
            '<tr><td>Row1 Col1<td>Row1 Col2'
            '</table>'
        )
        result = convert_html_tables_to_gfm(html)
        assert "| Header A | Header B |" in result
        assert "|---|---|" in result
        assert "| Row1 Col1 | Row1 Col2 |" in result

    def test_merged_cells_rowspan_colspan(self):
        """A cell with rowspan=2 colspan=2 must duplicate its text into all 4 covered grid positions."""
        html = (
            '<table>'
            '<tr><th colspan="2">Merged</th><th>Single</th></tr>'
            '<tr><td rowspan="2" colspan="2">Span2x2</td><td>A</td></tr>'
            '<tr><td>B</td></tr>'
            '</table>'
        )
        result = convert_html_tables_to_gfm(html)
        lines = result.split("\n")
        # Header row: 3 cols (Merged duplicated across 2, Single)
        assert lines[0] == "| Merged | Merged | Single |"
        # First data row: Span2x2 covers col0+col1, then A
        assert lines[2] == "| Span2x2 | Span2x2 | A |"
        # Second data row: Span2x2 continues in col0+col1, then B
        assert lines[3] == "| Span2x2 | Span2x2 | B |"

    def test_ragged_rows_pad_and_truncate(self):
        """Header has 2 cols. Row with 1 col gets padded. Row with 3 cols gets truncated."""
        html = (
            '<table>'
            '<tr><th>Col1</th><th>Col2</th></tr>'
            '<tr><td>OnlyOne</td></tr>'
            '<tr><td>A</td><td>B</td><td>C</td></tr>'
            '</table>'
        )
        result = convert_html_tables_to_gfm(html)
        lines = result.split("\n")
        # Header: 2 cols
        assert lines[0] == "| Col1 | Col2 |"
        # Padded row: 1 col -> 2 cols
        assert lines[2] == "| OnlyOne |  |"
        # Truncated row: 3 cols -> 2 cols
        assert lines[3] == "| A | B |"

    def test_headerless_table_promotes_first_row(self):
        """Table with only td elements (no th) must use first row as header."""
        html = (
            '<table>'
            '<tr><td>Name</td><td>Age</td></tr>'
            '<tr><td>Alice</td><td>30</td></tr>'
            '</table>'
        )
        result = convert_html_tables_to_gfm(html)
        lines = result.split("\n")
        assert lines[0] == "| Name | Age |"
        assert lines[1] == "|---|---|"
        assert lines[2] == "| Alice | 30 |"

    def test_line_breaks_flattened_to_spaces(self):
        """br tags inside cells become spaces, not newlines."""
        html = (
            '<table>'
            '<tr><td>Line1<br>Line2</td><td>Plain</td></tr>'
            '</table>'
        )
        result = convert_html_tables_to_gfm(html)
        assert "Line1 Line2" in result
        # Only allowed newline is between header and separator row
        without_separator = result.split("\n|---|")[0]
        assert "\n" not in without_separator

    def test_ghost_table_reverts_to_plain_text(self):
        """Table with header but zero data rows outputs plain text without pipe characters."""
        html = (
            '<table>'
            '<tr><th>Name</th><th>Age</th></tr>'
            '</table>'
        )
        result = convert_html_tables_to_gfm(html)
        # Ghost table: no pipe chars, just the header text
        assert "|" not in result
        assert "Name" in result
        assert "Age" in result

    def test_crop_clamp_coordinates(self, tmp_path):
        """Feed synthetic bbox coordinates that exceed image dimensions. Assert clamped, not crashed."""
        img = Image.new("RGB", (1000, 1000), color="red")
        source = tmp_path / "doc.png"
        img.save(source)
        md_path = tmp_path / "output.md"
        # x2=2000 on a 1000px image -> should clamp to 1000
        markdown = '<img src="images/bbox_0_0_2000_1000.jpg" />'
        result = extract_and_save_image_crops(markdown, source, md_path)
        expected_dir = tmp_path / "output_files" / "images"
        crop_file = expected_dir / "bbox_0_0_2000_1000.jpg"
        assert crop_file.exists()
        with Image.open(crop_file) as crop_img:
            assert crop_img.size == (1000, 1000)
        assert "./output_files/images/bbox_0_0_2000_1000.jpg" in result

    def test_crop_reject_tiny(self, tmp_path, caplog):
        """Feed synthetic bbox that produces a 5x5 pixel crop. Assert skipped and warning logged."""
        import logging
        img = Image.new("RGB", (1000, 1000), color="blue")
        source = tmp_path / "doc.png"
        img.save(source)
        md_path = tmp_path / "output.md"
        # bbox_0_0_5_5 -> scaled to 0,0,5,5 on 1000px image = 5x5 pixels
        markdown = '<img src="images/bbox_0_0_5_5.jpg" />'
        with caplog.at_level(logging.WARNING, logger="scan2text"):
            result = extract_and_save_image_crops(markdown, source, md_path)
        # Crop should be skipped — original tag preserved
        assert "bbox_0_0_5_5.jpg" in result
        expected_dir = tmp_path / "output_files" / "images"
        assert not (expected_dir / "bbox_0_0_5_5.jpg").exists()
        assert any("too small" in record.message.lower() for record in caplog.records)

    def test_crop_accept_minimum(self, tmp_path):
        """Feed synthetic bbox that produces exactly a 20x20 pixel crop. Assert saved successfully."""
        img = Image.new("RGB", (1000, 1000), color="green")
        source = tmp_path / "doc.png"
        img.save(source)
        md_path = tmp_path / "output.md"
        # bbox_0_0_20_20 -> scaled to 0,0,20,20 on 1000px image = 20x20 pixels
        markdown = '<img src="images/bbox_0_0_20_20.jpg" />'
        result = extract_and_save_image_crops(markdown, source, md_path)
        expected_dir = tmp_path / "output_files" / "images"
        crop_file = expected_dir / "bbox_0_0_20_20.jpg"
        assert crop_file.exists()
        with Image.open(crop_file) as crop_img:
            assert crop_img.size == (20, 20)
        assert "./output_files/images/bbox_0_0_20_20.jpg" in result

    def test_rgba_png_crop_saves_as_rgb_jpeg(self, tmp_path):
        """RGBA PNG source must not raise on JPEG save; crop must be RGB mode."""
        img = Image.new("RGBA", (1000, 1000), color=(255, 0, 0, 128))
        source = tmp_path / "rgba_doc.png"
        img.save(source)
        md_path = tmp_path / "output.md"
        markdown = '<img src="images/bbox_100_100_300_300.jpg" />'
        result = extract_and_save_image_crops(markdown, source, md_path)
        expected_dir = tmp_path / "output_files" / "images"
        crop_file = expected_dir / "bbox_100_100_300_300.jpg"
        assert crop_file.exists()
        with Image.open(crop_file) as crop_img:
            assert crop_img.mode == "RGB"
            assert crop_img.size == (200, 200)
        assert "./output_files/images/bbox_100_100_300_300.jpg" in result

    def test_la_png_crop_saves_as_rgb_jpeg(self, tmp_path):
        """LA (luminance+alpha) PNG source must not raise on JPEG save."""
        img = Image.new("LA", (1000, 1000), color=(200, 255))
        source = tmp_path / "la_doc.png"
        img.save(source)
        md_path = tmp_path / "output.md"
        markdown = '<img src="images/bbox_0_0_500_500.jpg" />'
        result = extract_and_save_image_crops(markdown, source, md_path)
        crop_file = tmp_path / "output_files" / "images" / "bbox_0_0_500_500.jpg"
        assert crop_file.exists()
        with Image.open(crop_file) as crop_img:
            assert crop_img.mode == "RGB"

    def test_p_mode_png_crop_saves_as_rgb_jpeg(self, tmp_path):
        """P (palette) PNG source must not raise on JPEG save."""
        img = Image.new("P", (1000, 1000), color=1)
        source = tmp_path / "p_doc.png"
        img.save(source)
        md_path = tmp_path / "output.md"
        markdown = '<img src="images/bbox_0_0_500_500.jpg" />'
        result = extract_and_save_image_crops(markdown, source, md_path)
        crop_file = tmp_path / "output_files" / "images" / "bbox_0_0_500_500.jpg"
        assert crop_file.exists()
        with Image.open(crop_file) as crop_img:
            assert crop_img.mode == "RGB"
