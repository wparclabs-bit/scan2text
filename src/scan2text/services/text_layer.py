"""Read a PDF's text layer and rebuild Markdown from words, sizes and positions.

D-26: a digital PDF converts from the text layer it already contains. The
words, their font sizes, and their positions are enough to rebuild headings,
lists, hyperlinks, code, and paragraph order. Nothing on this path is
rasterised and no model is called, so the result is exact, offline, and free.

The PDF library is pypdfium2, already a project dependency. Only the text API
is used: a text page, its character boxes, its font sizes and names, and the
page's link annotations.
"""

from __future__ import annotations

import ctypes
import re
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, Sequence

import pypdfium2 as pdfium
import pypdfium2.raw as raw

# FR-06 page separator, the same one the OCR path joins pages with.
PAGE_SEPARATOR = "\n\n---\n\n"

# Font size ratio to body size -> Markdown heading level.
_HEADING_LEVELS = ((1.60, 1), (1.35, 2), (1.15, 3))

# Font names that mean "this text is code".
_MONOSPACE_HINTS = ("mono", "courier", "consolas", "menlo", "code")

_BULLET_RE = re.compile(r"^([\-•▪◦‣∙*–—])\s+")
_NUMBERED_RE = re.compile(r"^(\d+)[.)]\s+")

_LINK_SUBTYPE = getattr(raw, "FPDF_ANNOT_LINK", 2)
_URI_ACTION = getattr(raw, "PDFACTION_URI", 3)

# A line wider than this share of the page is treated as spanning the page.
_FULL_WIDTH_SHARE = 0.55


@dataclass(frozen=True)
class TextWord:
    """One word from the text layer, with its box, size, and font."""

    text: str
    left: float
    bottom: float
    right: float
    top: float
    font_size: float
    font_name: str

    @property
    def center_x(self) -> float:
        return (self.left + self.right) / 2.0

    @property
    def center_y(self) -> float:
        return (self.bottom + self.top) / 2.0


@dataclass(frozen=True)
class TextLink:
    """A link annotation with its URI and its box."""

    url: str
    left: float
    bottom: float
    right: float
    top: float


@dataclass(frozen=True)
class TextPage:
    """One page of the text layer: its words and its links."""

    page_number: int
    width: float
    height: float
    words: tuple[TextWord, ...] = ()
    links: tuple[TextLink, ...] = ()

    @property
    def has_text(self) -> bool:
        """True when the page carries a text layer (a digital page)."""
        return bool(self.words)


@dataclass
class _Line:
    """A visual line: the words that share a baseline."""

    words: list[TextWord] = field(default_factory=list)

    @property
    def left(self) -> float:
        return min(word.left for word in self.words)

    @property
    def right(self) -> float:
        return max(word.right for word in self.words)

    @property
    def top(self) -> float:
        return max(word.top for word in self.words)

    @property
    def bottom(self) -> float:
        return min(word.bottom for word in self.words)

    @property
    def font_size(self) -> float:
        return max(word.font_size for word in self.words)

    @property
    def font_name(self) -> str:
        names = Counter(
            word.font_name for word in self.words if word.font_name
        )
        return names.most_common(1)[0][0] if names else ""

    @property
    def is_monospace(self) -> bool:
        name = self.font_name.lower()
        if any(hint in name for hint in _MONOSPACE_HINTS):
            return True
        widths = [
            word.right - word.left
            for word in self.words
            if word.text.strip() and len(word.text.strip()) == 1
        ]
        if len(widths) < 4:
            return False
        return (max(widths) - min(widths)) <= 0.05 * max(widths)


def extract_text_pages(pdf_path: Path, max_pages: int = 50) -> list[TextPage]:
    """Read the text layer of a PDF, page by page.

    No page is rasterised and no model is called: only the text API is used.
    A page without any word comes back with ``has_text`` False, which is the
    signal that the page has to go to OCR instead.
    """
    pages: list[TextPage] = []
    with pdfium.PdfDocument(str(pdf_path)) as document:
        for index in range(min(len(document), max_pages)):
            page = document[index]
            width, height = page.get_size()
            words = _page_words(page)
            links = _page_links(page, document)
            pages.append(
                TextPage(
                    page_number=index + 1,
                    width=float(width),
                    height=float(height),
                    words=tuple(words),
                    links=tuple(links),
                )
            )
    return pages


def build_markdown(pages: Sequence[TextPage]) -> str:
    """Rebuild Markdown for a sequence of text-layer pages."""
    parts = [build_page_markdown(page).strip() for page in pages]
    return PAGE_SEPARATOR.join(part for part in parts if part)


def build_page_markdown(page: TextPage) -> str:
    """Rebuild the Markdown of one text-layer page."""
    lines = _group_lines(page.words)
    ordered = _reading_order(lines, page)
    if not ordered:
        return ""
    body_size = _body_font_size(ordered)
    blocks: list[str] = []
    paragraph: list[str] = []
    paragraph_size = 0.0
    paragraph_bottom = 0.0
    code_lines: list[str] = []
    list_items: list[str] = []
    list_kind = ""

    def flush_paragraph() -> None:
        nonlocal paragraph, paragraph_size
        if paragraph:
            blocks.append(" ".join(paragraph))
            paragraph = []
            paragraph_size = 0.0

    def flush_list() -> None:
        nonlocal list_items, list_kind
        if list_items:
            blocks.append("\n".join(list_items))
            list_items = []
        list_kind = ""

    def flush_code() -> None:
        nonlocal code_lines
        if code_lines:
            blocks.append("```\n" + "\n".join(code_lines) + "\n```")
            code_lines = []

    def flush_all() -> None:
        flush_paragraph()
        flush_list()
        flush_code()

    for line in ordered:
        text = _line_text(line, page.links)
        if not text:
            continue
        if line.is_monospace:
            flush_paragraph()
            flush_list()
            code_lines.append(text)
            continue
        flush_code()
        heading = _heading_level(line, body_size)
        if heading:
            flush_paragraph()
            flush_list()
            blocks.append("#" * heading + " " + text)
            continue
        list_item = _list_item(text)
        if list_item:
            flush_paragraph()
            kind = "numbered" if list_item[0].isdigit() else "bullet"
            if list_kind and kind != list_kind:
                flush_list()
            list_kind = kind
            list_items.append(list_item)
            continue
        flush_list()
        if (
            paragraph
            and abs(paragraph_size - line.font_size) <= 0.5
            and 0 < (paragraph_bottom - line.bottom) <= 1.6 * line.font_size
        ):
            paragraph.append(text)
        else:
            flush_paragraph()
            paragraph = [text]
            paragraph_size = line.font_size
        paragraph_bottom = line.bottom

    flush_all()
    return "\n\n".join(blocks)


# --- reading ---------------------------------------------------------------


def _page_words(page) -> list[TextWord]:
    textpage = page.get_textpage()
    count = textpage.count_chars()
    if count == 0:
        return []
    text = textpage.get_text_range(0, count)
    raw_textpage = textpage.raw
    words: list[TextWord] = []
    current: list[tuple[str, float, float, float, float, str]] = []

    def flush() -> None:
        if not current:
            return
        left = min(item[1] for item in current)
        bottom = min(item[2] for item in current)
        right = max(item[3] for item in current)
        top = max(item[4] for item in current)
        size = max(item[5] for item in current)
        names = Counter(item[6] for item in current if item[6])
        name = names.most_common(1)[0][0] if names else ""
        words.append(
            TextWord(
                text="".join(item[0] for item in current),
                left=left,
                bottom=bottom,
                right=right,
                top=top,
                font_size=size,
                font_name=name,
            )
        )
        current.clear()

    for index, character in enumerate(text):
        if character.isspace():
            flush()
            continue
        box = textpage.get_charbox(index)
        if not box:
            continue
        left, bottom, right, top = (float(value) for value in box)
        size = float(raw.FPDFText_GetFontSize(raw_textpage, index))
        current.append((character, left, bottom, right, top, size, _font_name(raw_textpage, index)))
    flush()
    return words


def _font_name(raw_textpage, index: int) -> str:
    buffer = ctypes.create_string_buffer(256)
    flags = ctypes.c_long()
    raw.FPDFText_GetFontInfo(raw_textpage, index, buffer, 256, ctypes.byref(flags))
    return buffer.value.decode("utf-8", "replace")


def _page_links(page, document) -> list[TextLink]:
    links: list[TextLink] = []
    count = raw.FPDFPage_GetAnnotCount(page.raw)
    for index in range(count):
        annotation = raw.FPDFPage_GetAnnot(page.raw, index)
        if raw.FPDFAnnot_GetSubtype(annotation) != _LINK_SUBTYPE:
            continue
        link = raw.FPDFAnnot_GetLink(annotation)
        if not link:
            continue
        action = raw.FPDFLink_GetAction(link)
        if not action:
            continue
        if raw.FPDFAction_GetType(action) != _URI_ACTION:
            continue
        buffer = ctypes.create_string_buffer(1024)
        raw.FPDFAction_GetURIPath(document.raw, action, buffer, 1024)
        url = buffer.value.decode("utf-8", "replace")
        if not url:
            continue
        rect = raw.FS_RECTF()
        raw.FPDFAnnot_GetRect(annotation, ctypes.byref(rect))
        links.append(
            TextLink(
                url=url,
                left=float(rect.left),
                bottom=float(rect.bottom),
                right=float(rect.right),
                top=float(rect.top),
            )
        )
    return links


def _group_lines(words: Sequence[TextWord]) -> list[_Line]:
    """Group words into visual lines.

    First the words that share a baseline are grouped, then each baseline is
    split where a horizontal gap is too wide — that gap is the gutter between
    two columns.
    """
    baselines: list[list[TextWord]] = []
    for word in sorted(words, key=lambda item: (-item.top, item.left)):
        for group in baselines:
            if _same_baseline(group, word):
                group.append(word)
                break
        else:
            baselines.append([word])
    lines: list[_Line] = []
    for group in baselines:
        for segment in _split_at_gutters(group):
            lines.append(_Line(segment))
    return lines


def _split_at_gutters(words: Sequence[TextWord]) -> list[list[TextWord]]:
    ordered = sorted(words, key=lambda item: item.left)
    segments: list[list[TextWord]] = []
    current: list[TextWord] = []
    previous: Optional[TextWord] = None
    for word in ordered:
        if previous is not None:
            gap = word.left - previous.right
            limit = 3.0 * max(word.font_size, previous.font_size, 1.0)
            if gap > limit:
                segments.append(current)
                current = []
        current.append(word)
        previous = word
    if current:
        segments.append(current)
    return segments


def _same_baseline(group: Sequence[TextWord], word: TextWord) -> bool:
    top = max(item.top for item in group)
    bottom = min(item.bottom for item in group)
    overlap = min(top, word.top) - max(bottom, word.bottom)
    height = min(top - bottom, word.top - word.bottom)
    if height <= 0:
        return abs(bottom - word.bottom) <= 0.5 * max(word.font_size, 1.0)
    return overlap >= 0.5 * height


def _reading_order(lines: list[_Line], page: TextPage) -> list[_Line]:
    """Order the lines the way a reader reads them.

    A line that spans the page splits the page into zones. Inside a zone the
    lines are grouped into columns and the columns are read left to right,
    each column from top to bottom.
    """
    if not lines:
        return []
    threshold = _FULL_WIDTH_SHARE * page.width
    spans = [line for line in lines if (line.right - line.left) > threshold]
    body = [line for line in lines if (line.right - line.left) <= threshold]
    if not spans:
        ordered: list[_Line] = []
        for band in _column_bands(body):
            ordered.extend(sorted(band, key=lambda line: -line.top))
        return ordered

    spans.sort(key=lambda line: -line.top)
    bounds = [line.top for line in spans]
    zones: list[list[_Line]] = [[] for _ in range(len(spans) + 1)]
    for line in body:
        zone = 0
        for index, bound in enumerate(bounds):
            if line.top <= bound:
                zone = index + 1
        zones[zone].append(line)

    ordered = []
    for band in _column_bands(zones[0]):
        ordered.extend(sorted(band, key=lambda line: -line.top))
    for index, span in enumerate(spans):
        ordered.append(span)
        for band in _column_bands(zones[index + 1]):
            ordered.extend(sorted(band, key=lambda line: -line.top))
    return ordered


def _column_bands(lines: Sequence[_Line]) -> list[list[_Line]]:
    """Group lines into columns: lines whose horizontal spans overlap."""
    bands: list[dict] = []
    for line in sorted(lines, key=lambda item: (item.left, -item.top)):
        for band in bands:
            if line.left < band["right"] and line.right > band["left"]:
                band["left"] = min(band["left"], line.left)
                band["right"] = max(band["right"], line.right)
                band["lines"].append(line)
                break
        else:
            bands.append({"left": line.left, "right": line.right, "lines": [line]})
    bands.sort(key=lambda band: band["left"])
    return [band["lines"] for band in bands]


# --- structure -------------------------------------------------------------


def _body_font_size(lines: Sequence[_Line]) -> float:
    sizes = [round(line.font_size, 1) for line in lines if line.font_size > 0]
    if not sizes:
        return 0.0
    return Counter(sizes).most_common(1)[0][0]


def _heading_level(line: _Line, body_size: float) -> int:
    if body_size <= 0:
        return 0
    ratio = line.font_size / body_size
    for threshold, level in _HEADING_LEVELS:
        if ratio >= threshold:
            return level
    return 0


def _list_item(text: str) -> Optional[str]:
    bullet = _BULLET_RE.match(text)
    if bullet:
        return "- " + text[bullet.end():]
    numbered = _NUMBERED_RE.match(text)
    if numbered:
        return "%s. %s" % (numbered.group(1), text[numbered.end():])
    return None


def _link_for_word(word: TextWord, links: Sequence[TextLink]) -> Optional[str]:
    for link in links:
        if (
            link.left - 1.0 <= word.center_x <= link.right + 1.0
            and link.bottom - 1.0 <= word.center_y <= link.top + 1.0
        ):
            return link.url
    return None


def _line_text(line: _Line, links: Sequence[TextLink]) -> str:
    parts: list[str] = []
    index = 0
    words = line.words
    while index < len(words):
        url = _link_for_word(words[index], links)
        if url:
            run = [words[index]]
            cursor = index + 1
            while cursor < len(words) and _link_for_word(words[cursor], links) == url:
                run.append(words[cursor])
                cursor += 1
            parts.append("[%s](%s)" % (" ".join(word.text for word in run), url))
            index = cursor
        else:
            parts.append(words[index].text)
            index += 1
    return " ".join(parts).strip()
