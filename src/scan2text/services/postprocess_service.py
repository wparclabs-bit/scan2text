"""Post-processing service — GFM table conversion + image crop extraction."""

from __future__ import annotations

import logging
import re
from html.parser import HTMLParser
from pathlib import Path

from PIL import Image


logger = logging.getLogger(__name__)


class _TableParser(HTMLParser):
    """Parse an HTML <table> block into a 2D grid of cell texts.

    Handles merged cells (rowspan/colspan), ragged rows, headerless tables,
    line breaks, ghost tables, and messy unclosed HTML.
    """

    def __init__(self) -> None:
        super().__init__()
        self._grid: list[list[str]] = []
        # row_idx -> set of col indices still occupied by active row spans
        self._span_tracker: dict[int, set[int]] = {}
        self._current_row_idx = 0
        self._current_col_idx = 0
        self._in_cell = False
        self._cell_text_parts: list[str] = []
        self._cell_colspan = 1
        self._cell_rowspan = 1
        self._has_content_in_current_row = False
        # Ghost-table detection: track first-row th presence and any td presence
        self._first_row_has_th = False
        self._has_any_td = False

    @property
    def grid(self) -> list[list[str]]:
        return self._grid

    # -- callbacks ------------------------------------------------------------

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = dict(attrs) if attrs else {}

        if tag in ("td", "th"):
            if self._in_cell:
                self._flush_cell()
            self._in_cell = True
            self._cell_text_parts = []
            self._cell_colspan = max(1, int(attrs_dict.get("colspan", 1)))
            self._cell_rowspan = max(1, int(attrs_dict.get("rowspan", 1)))
            if tag == "th" and self._current_row_idx == 0:
                self._first_row_has_th = True
            if tag == "td":
                self._has_any_td = True
            return

        if tag == "br" and self._in_cell:
            self._cell_text_parts.append(" ")
            return

        if tag == "tr":
            if self._has_content_in_current_row:
                if self._in_cell:
                    self._flush_cell()
                self._finalize_current_row()
            return

    def handle_endtag(self, tag: str) -> None:
        if tag in ("td", "th"):
            if self._in_cell:
                self._flush_cell()
            return
        if tag == "tr":
            if self._in_cell:
                self._flush_cell()
            if self._has_content_in_current_row:
                self._finalize_current_row()
            return
        if tag == "table":
            if self._in_cell:
                self._flush_cell()
            if self._has_content_in_current_row:
                self._finalize_current_row()

    def handle_data(self, data: str) -> None:
        if self._in_cell:
            normalized = re.sub(r"\s+", " ", data)
            self._cell_text_parts.append(normalized)

    def handle_entityref(self, name: str) -> None:
        if self._in_cell:
            self._cell_text_parts.append(f"&{name};")

    def handle_charref(self, name: str) -> None:
        if self._in_cell:
            self._cell_text_parts.append(f"&#x{name};")

    def handle_decl(self, decl: str) -> None:
        pass

    def handle_comment(self, text: str) -> None:
        pass

    def _finalize_pending(self) -> None:
        """Flush any remaining open cell and finalize the last row.

        Called after ``feed()`` to handle unclosed tags at the end of input.
        """
        if self._in_cell:
            self._flush_cell()
        if self._has_content_in_current_row:
            self._finalize_current_row()

    # -- internal -------------------------------------------------------------

    def _ensure_row(self, row_idx: int) -> None:
        while len(self._grid) <= row_idx:
            self._grid.append([])

    def _flush_cell(self) -> None:
        """Place the current cell's text into the grid, respecting colspan/rowspan."""
        text = "".join(self._cell_text_parts).strip()
        self._in_cell = False

        col = self._current_col_idx
        row = self._current_row_idx

        # Ensure the target row exists
        self._ensure_row(row)
        # Skip columns occupied by active row spans from previous rows
        skipped = self._span_tracker.get(row, set())
        while col in skipped:
            col += 1

        for dc in range(self._cell_colspan):
            for dr in range(self._cell_rowspan):
                target_row = row + dr
                target_col = col + dc
                self._ensure_row(target_row)
                while len(self._grid[target_row]) <= target_col:
                    self._grid[target_row].append("")
                if self._grid[target_row][target_col] == "":
                    self._grid[target_row][target_col] = text
                # Schedule future-row skips for rowspan continuation
                if dr > 0:
                    if target_row not in self._span_tracker:
                        self._span_tracker[target_row] = set()
                    self._span_tracker[target_row].add(target_col)

        self._has_content_in_current_row = True
        self._current_col_idx = col + self._cell_colspan

    def _finalize_current_row(self) -> None:
        """Append the current (possibly incomplete) row to the grid."""
        self._ensure_row(self._current_row_idx)
        row = self._grid[self._current_row_idx]
        max_col = max(
            self._current_col_idx,
            max((len(r) for r in self._grid), default=0),
        )
        while len(row) < max_col:
            row.append("")

        # Remove span trackers for the row we just finalized
        self._span_tracker.pop(self._current_row_idx, None)

        self._current_row_idx += 1
        self._current_col_idx = 0
        self._has_content_in_current_row = False


def _normalize_rows(
    rows: list[list[str]], header_col_count: int
) -> list[list[str]]:
    """Pad short rows with empty strings and truncate long rows."""
    normalized = []
    for row in rows:
        if len(row) < header_col_count:
            row = row + [""] * (header_col_count - len(row))
        elif len(row) > header_col_count:
            row = row[:header_col_count]
        normalized.append(row)
    return normalized


def _rows_to_gfm_lines(rows: list[list[str]]) -> str:
    """Convert a list of row lists to GFM table string."""
    if not rows:
        return ""
    lines: list[str] = []
    for i, cells in enumerate(rows):
        lines.append("| " + " | ".join(cells) + " |")
        if i == 0:
            lines.append("|" + "|".join("---" for _ in cells) + "|")
    return "\n".join(lines)


def convert_html_tables_to_gfm(markdown: str) -> str:
    """Convert all HTML <table> blocks in *markdown* to GitHub Flavored Markdown tables.

    Uses a 2D Matrix parser that handles merged cells, ragged rows,
    headerless tables, line breaks, ghost tables, and messy unclosed HTML.
    """
    table_pattern = re.compile(r"<table[^>]*>(.*?)</table>", re.DOTALL | re.IGNORECASE)

    def _replace_table(match: re.Match[str]) -> str:
        block = match.group(1)
        parser = _TableParser()
        try:
            parser.feed(block)
            parser._finalize_pending()
        except Exception:
            return match.group(0)

        rows = parser.grid
        if not rows:
            return match.group(0)

        # Ghost table: first row has <th> elements but no <td> rows exist
        if len(rows) == 1 and parser._first_row_has_th and not parser._has_any_td:
            return " ".join(rows[0])

        # Normalize all rows to the same column count (first row is reference)
        header_col_count = len(rows[0])
        normalized_rows = _normalize_rows(rows, header_col_count)

        return _rows_to_gfm_lines(normalized_rows)

    return table_pattern.sub(_replace_table, markdown)


def _strip_tags(html: str) -> str:
    """Remove all HTML tags from *html*, returning plain text."""
    return re.sub(r"<[^>]+>", "", html).strip()


def extract_and_save_image_crops(
    markdown: str,
    source_image_path: Path,
    output_md_path: Path,
) -> str:
    """Extract <img> crops from *source_image_path* and rewrite markdown srcs.

    Looks for tags of the form::

        <img src="images/bbox_{L}_{T}_{R}_{B}.jpg" />

    Coordinates are scaled 0-1000. Crops are saved to::

        {output_md_path.parent}/{stem}_files/images/

    and markdown srcs are rewritten to relative paths::

        ./{stem}_files/images/bbox_{L}_{T}_{R}_{B}.jpg

    Guardrails:
    - All bounding box coordinates are clamped to image borders.
    - Crops smaller than 20x20 pixels are skipped with a warning log.
    """
    img_pattern = re.compile(
        r'<img\s+src="images/bbox_(\d+)_(\d+)_(\d+)_(\d+)\.jpg"\s*/?>',
        re.IGNORECASE,
    )

    stem = output_md_path.stem
    crop_dir = output_md_path.parent / f"{stem}_files" / "images"
    crop_dir.mkdir(parents=True, exist_ok=True)

    with Image.open(source_image_path) as pil_img:
        w, h = pil_img.size

        def _replace_img(match: re.Match[str]) -> str:
            l_, t_, r_, b_ = (int(match.group(i)) for i in range(1, 5))

            # Scale from 0-1000 to pixel coordinates
            x1 = int(l_ / 1000 * w)
            y1 = int(t_ / 1000 * h)
            x2 = int(r_ / 1000 * w)
            y2 = int(b_ / 1000 * h)

            # Clamp to image borders
            x1 = max(0, min(x1, w))
            y1 = max(0, min(y1, h))
            x2 = max(0, min(x2, w))
            y2 = max(0, min(y2, h))

            # Ensure valid ordering
            x1, x2 = sorted((x1, x2))
            y1, y2 = sorted((y1, y2))

            crop_width = x2 - x1
            crop_height = y2 - y1

            # Reject crops smaller than 20x20 pixels
            if crop_width < 20 or crop_height < 20:
                logger.warning(
                    "Crop bbox_%s_%s_%s_%s is too small (%dx%d px); skipping.",
                    l_, t_, r_, b_, crop_width, crop_height,
                )
                return match.group(0)

            crop = pil_img.crop((x1, y1, x2, y2))
            out_name = f"bbox_{l_}_{t_}_{r_}_{b_}.jpg"
            out_path = crop_dir / out_name
            crop.save(out_path, format="JPEG")

            rel_src = f"./{stem}_files/images/{out_name}"
            return f'<img src="{rel_src}" />'

        return img_pattern.sub(_replace_img, markdown)
