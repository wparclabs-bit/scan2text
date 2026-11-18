"""T08 - wide tables are rebuilt from the geometry of the text layer (D-27).

The PDF is built in memory (standard-library bytes only, no committed fixture).
The assertions read the reconstructed rows and the final Markdown, so the
tests describe the behaviour rather than the helper that implements it.
"""

from __future__ import annotations

import re
from pathlib import Path

from scan2text.services.text_layer import (
    build_page_markdown,
    extract_text_pages,
    find_geometry_tables,
)
from services.pdf_fixtures import build_pdf


def _row(
    cells: list[str],
    y: float,
    *,
    size: float = 6,
    start_x: float = 20,
    spacing: float = 44,
) -> list[tuple[str, float, float, float, str]]:
    return [
        ("F1", size, start_x + index * spacing, y, text)
        for index, text in enumerate(cells)
    ]


def _wide_rows(
    rows: list[list[str]],
    *,
    size: float = 6,
    spacing: float = 44,
) -> list[tuple[str, float, float, float, str]]:
    lines: list[tuple[str, float, float, float, str]] = []
    for row_index, cells in enumerate(rows):
        lines.extend(_row(cells, 700 - row_index * 12, size=size, spacing=spacing))
    return lines


def _page(tmp_path: Path, rows: list[list[str]], **kwargs):
    path = tmp_path / "wide.pdf"
    path.write_bytes(build_pdf([_wide_rows(rows, **kwargs)]))
    pages = extract_text_pages(path)
    assert len(pages) == 1
    return pages[0]


def _headers(count: int) -> list[str]:
    return [f"H{index:02d}" for index in range(1, count + 1)]


def _values(count: int, prefix: str = "V") -> list[str]:
    return [f"{prefix}{index:02d}" for index in range(1, count + 1)]


def test_thirteen_column_table_is_reconstructed_from_word_positions(tmp_path):
    page = _page(tmp_path, [_headers(13), _values(13)])

    tables = find_geometry_tables(page)

    assert len(tables) == 1
    assert tables[0].column_count == 13
    assert tables[0].rows[0] == tuple(_headers(13))
    assert tables[0].rows[1] == tuple(_values(13))
    markdown = build_page_markdown(page)
    assert "| H01 | H02 | H03 |" in markdown
    assert "| V01 | V02 | V03 |" in markdown


def test_no_cell_is_truncated_in_a_wide_table(tmp_path):
    rows = [_headers(13), _values(12) + ["keep this value"]]
    page = _page(tmp_path, rows)

    table = find_geometry_tables(page)[0]

    assert table.rows[1][-1] == "keep this value"
    assert "keep this value" in build_page_markdown(page)


def test_ragged_wide_table_rows_are_padded_to_the_widest_row(tmp_path):
    page = _page(tmp_path, [_headers(13), _values(12)])

    table = find_geometry_tables(page)[0]

    assert table.column_count == 13
    assert len(table.rows[1]) == 13
    assert table.rows[1][-1] == ""
    assert "| V12 |  |" in build_page_markdown(page)


def test_pipe_inside_a_wide_table_cell_is_escaped(tmp_path):
    rows = [_headers(13), _values(12) + ["A|B"]]
    page = _page(tmp_path, rows)

    markdown = build_page_markdown(page)

    assert "A\\|B" in markdown
    body_line = next(line for line in markdown.splitlines() if "A\\|B" in line)
    assert len(re.split(r"(?<!\\)\|", body_line)) - 2 == 13


def test_repeated_header_row_is_removed_from_the_wide_table_body(tmp_path):
    header = _headers(13)
    page = _page(tmp_path, [header, list(header), _values(13)])

    table = find_geometry_tables(page)[0]

    assert len(table.rows) == 2
    assert table.rows[0] == tuple(header)
    assert table.rows[1] == tuple(_values(13))
    assert build_page_markdown(page).count("H01") == 1


def test_forty_five_column_table_has_no_hallucinated_column(tmp_path):
    page = _page(
        tmp_path,
        [_headers(45), _values(45)],
        size=4,
        spacing=13,
    )

    table = find_geometry_tables(page)[0]

    assert table.column_count == 45
    assert all(len(row) == 45 for row in table.rows)
    markdown = build_page_markdown(page)
    separator = next(line for line in markdown.splitlines() if set(line) <= set("|-"))
    assert len(separator.split("|")) - 2 == 45


def test_table_with_twelve_or_fewer_columns_is_not_routed_to_the_geometry_path(tmp_path):
    page = _page(tmp_path, [_headers(12), _values(12)])

    assert find_geometry_tables(page) == ()
    assert "|" not in build_page_markdown(page)


def test_forty_five_column_table_reaches_at_least_98_percent_cell_accuracy(tmp_path):
    expected = [_headers(45), _values(45)]
    page = _page(tmp_path, expected, size=4, spacing=13)

    table = find_geometry_tables(page)[0]

    total = sum(len(row) for row in expected)
    correct = sum(
        1
        for expected_row, actual_row in zip(expected, table.rows)
        for expected_cell, actual_cell in zip(expected_row, actual_row)
        if expected_cell == actual_cell
    )
    assert correct / total >= 0.98


def test_the_geometry_reader_and_the_cloud_path_share_one_wide_table_limit():
    from scan2text.cloud.conversion import (
        WIDE_TABLE_COLUMN_LIMIT as cloud_limit,
    )
    from scan2text.services.text_layer import (
        WIDE_TABLE_COLUMN_LIMIT as reader_limit,
    )

    assert cloud_limit == reader_limit == 12
