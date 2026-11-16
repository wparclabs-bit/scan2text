"""PDF fixtures built in memory for the text-layer tests.

Standard-library bytes only: no PDF is committed to the repository (T10) and
no dependency is installed. The builder writes a tiny, valid PDF whose pages
carry a real text layer, so pypdfium2 can read words, font sizes, positions,
and link annotations from it.
"""

from __future__ import annotations


def _escape(text: str) -> str:
    return text.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")


def _content_stream(lines) -> bytes:
    parts = ["BT"]
    for font, size, x, y, text in lines:
        parts.append(f"/{font} {size} Tf")
        parts.append(f"1 0 0 1 {x} {y} Tm")
        parts.append(f"({_escape(text)}) Tj")
    parts.append("ET")
    return "\n".join(parts).encode("latin-1")


def build_pdf(page_lines, page_links=()) -> bytes:
    """Build a one- or two-page PDF with a text layer.

    Each page line is ``(font, size, x, y, text)``. Each page link is
    ``(x0, y0, x1, y1, uri)``. An empty page list gives a scanned page: a
    page with no words at all.
    """
    count = len(page_lines)
    catalog_id, pages_id = 1, 2
    page_ids = list(range(3, 3 + count))
    content_ids = list(range(3 + count, 3 + 2 * count))
    font_ids = {"F1": 3 + 2 * count, "F2": 4 + 2 * count, "F3": 5 + 2 * count}
    next_id = 6 + 2 * count
    annot_ids: dict[int, list[tuple[int, tuple, str]]] = {}
    for index in range(count):
        annot_ids[index] = []
        for link in page_links[index] if index < len(page_links) else []:
            annot_ids[index].append((next_id, tuple(link[:4]), link[4]))
            next_id += 1

    objects: dict[int, bytes] = {}
    objects[catalog_id] = b"<< /Type /Catalog /Pages %d 0 R >>" % pages_id
    kids = " ".join("%d 0 R" % page_id for page_id in page_ids)
    objects[pages_id] = (
        "<< /Type /Pages /Kids [%s] /Count %d >>" % (kids, count)
    ).encode()
    font_res = " ".join(
        "/%s %d 0 R" % (name, font_id) for name, font_id in font_ids.items()
    )
    for index in range(count):
        refs = " ".join("%d 0 R" % aid for aid, _rect, _uri in annot_ids[index])
        page = (
            "<< /Type /Page /Parent %d 0 R /MediaBox [0 0 612 792] "
            "/Resources << /Font << %s >> >> /Contents %d 0 R"
            % (pages_id, font_res, content_ids[index])
        )
        if refs:
            page += " /Annots [%s]" % refs
        page += " >>"
        objects[page_ids[index]] = page.encode()
        content = _content_stream(page_lines[index])
        objects[content_ids[index]] = (
            ("<< /Length %d >>\nstream\n" % len(content)).encode()
            + content
            + b"\nendstream"
        )
    objects[font_ids["F1"]] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
    objects[font_ids["F2"]] = (
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
    )
    objects[font_ids["F3"]] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>"
    for index in range(count):
        for annot_id, rect, uri in annot_ids[index]:
            objects[annot_id] = (
                "<< /Type /Annot /Subtype /Link /Rect [%s %s %s %s] /Border [0 0 0] "
                "/A << /Type /Action /S /URI /URI (%s) >> >>"
                % (rect[0], rect[1], rect[2], rect[3], _escape(uri))
            ).encode()

    out = bytearray(b"%PDF-1.4\n")
    offsets: dict[int, int] = {}
    for object_id in sorted(objects):
        offsets[object_id] = len(out)
        out += b"%d 0 obj\n" % object_id + objects[object_id] + b"\nendobj\n"
    xref_pos = len(out)
    size = max(objects) + 1
    out += b"xref\n0 %d\n" % size
    out += b"0000000000 65535 f \n"
    for object_id in range(1, size):
        out += b"%010d 00000 n \n" % offsets[object_id]
    out += b"trailer\n<< /Size %d /Root %d 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (
        size,
        catalog_id,
        xref_pos,
    )
    return bytes(out)


# A digital page: a heading, paragraphs, a bullet, a numbered item, code,
# and two columns with a hyperlink in the right column.
DIGITAL_PAGE = [
    ("F2", 20, 72, 700, "Chapter One"),
    ("F1", 11, 72, 670, "This is the first body paragraph and it continues."),
    ("F1", 11, 72, 655, "A second body line follows the first one here."),
    ("F1", 11, 72, 640, "- First bullet item"),
    ("F1", 11, 72, 625, "1. Numbered item"),
    ("F3", 11, 72, 605, "print(42)"),
    ("F1", 11, 72, 560, "Left column text starts here."),
    ("F1", 11, 72, 545, "Left column continues with more words."),
    ("F1", 11, 330, 560, "Right column text starts here."),
    ("F1", 11, 330, 545, "Read the docs for more detail."),
]

DIGITAL_LINK = [(330, 538, 500, 553, "https://example.com/docs")]

# A scanned page: no words at all.
SCANNED_PAGE = []
