"""T07 — the PDF text layer reader (D-26).

A digital PDF carries words, font sizes, and positions. This suite builds a PDF
in memory (standard-library bytes only, no committed fixture) and proves that
the reader rebuilds headings, lists, hyperlinks, code, and reading order from
that text layer — with no rasterisation and no model.
"""

from __future__ import annotations

from pathlib import Path

from scan2text.services.text_layer import (
    build_markdown,
    extract_text_pages,
)
from services.pdf_fixtures import DIGITAL_LINK, DIGITAL_PAGE, build_pdf


EXPECTED_MARKDOWN = """# Chapter One

This is the first body paragraph and it continues. A second body line follows the first one here.

- First bullet item

1. Numbered item

```
print(42)
```

Left column text starts here. Left column continues with more words.

Right column text starts here. [Read the docs for more detail.](https://example.com/docs)"""


def _write(tmp_path: Path, data: bytes, name: str = "digital.pdf") -> Path:
    path = tmp_path / name
    path.write_bytes(data)
    return path


class TestTextLayerReader:
    """The reader rebuilds Markdown from the words, sizes, and positions."""

    def test_digital_page_rebuilds_heading_list_link_code_and_order(self, tmp_path):
        path = _write(tmp_path, build_pdf([DIGITAL_PAGE], [DIGITAL_LINK]))

        pages = extract_text_pages(path)
        markdown = build_markdown(pages)

        assert len(pages) == 1
        assert pages[0].has_text is True
        assert markdown.strip() == EXPECTED_MARKDOWN.strip()

    def test_two_column_page_reads_left_column_before_right_column(self, tmp_path):
        path = _write(tmp_path, build_pdf([DIGITAL_PAGE], [DIGITAL_LINK]))

        markdown = build_markdown(extract_text_pages(path))

        left = markdown.index("Left column text starts here.")
        right = markdown.index("Right column text starts here.")
        assert left < right
        # The whole left column is read before the right column starts.
        assert left < markdown.index("Left column continues with more words.") < right

    def test_page_without_text_layer_reports_no_text(self, tmp_path):
        path = _write(tmp_path, build_pdf([[]]), name="scanned.pdf")

        pages = extract_text_pages(path)

        assert len(pages) == 1
        assert pages[0].has_text is False
        assert pages[0].words == ()
