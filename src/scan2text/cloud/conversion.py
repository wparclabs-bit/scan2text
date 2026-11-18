"""Cloud conversion — bands of 150 DPI pages, one request each, GFM output.

D-15 (amended): a band is five consecutive 150 DPI full pages in one request.
A table is never sent as a band of 300 DPI crops.
D-16: the request carries the page images and the extracted text layer together.
D-17: the model is asked for HTML tables; the existing HTML-to-GFM converter
produces the final Markdown, and no model-emitted coordinate is ever trusted.
D-27: a table row with 13 or more columns is never sent to the model; the page
is recorded as awaiting the geometry path that arrives in T08.
"""

from __future__ import annotations

import base64
import re
from dataclasses import dataclass
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import TYPE_CHECKING, Any, Callable, Iterable, Mapping, Protocol, Sequence

import pypdfium2 as pdfium
from PIL import Image

from scan2text.cloud.cancellation import JobCancelledError, JobCancellation
from scan2text.cloud.failure import RetryingProviderClient
from scan2text.cloud.models import CloudProfile, CloudRecipe
from scan2text.cloud.provider import (
    ChatMessage,
    ImagePart,
    ProviderAborted,
    ProviderClient,
    TextPart,
)
from scan2text.cloud.route_decision import CEILING_BYTES

if TYPE_CHECKING:  # imported lazily at runtime to keep the service package acyclic
    from scan2text.services.path_service import PathService

#: Mirrors ``pdf_service.MAX_PDF_PAGES_DEFAULT`` without importing the package.
MAX_CLOUD_PAGES_DEFAULT: int = 50

#: D-15 (amended): five consecutive 150 DPI full pages sent in one request.
CLOUD_EXECUTION_BAND_SIZE: int = 5

#: The only DPI the Cloud path renders. Table crops at 300 DPI are forbidden.
CLOUD_PAGE_DPI: int = 150

#: D-27: a table with thirteen or more columns is never sent to the model.
#: The geometry reader owns the same limit; a test keeps the two equal.
WIDE_TABLE_COLUMN_LIMIT: int = 12

#: The prompt asset is the first content part; this value is its deterministic slot.
BAND_SEQUENCE_LENGTH: int = CLOUD_EXECUTION_BAND_SIZE

_PDF_POINTS_PER_INCH = 72
_TAB_DELIMITER = "\t"
_RENAMED_TABLE_CELL = "[wide table awaiting geometry]"

#: D-17: a model-emitted coordinate or bbox tag is never trusted, never kept.
_IMAGE_TAG_PATTERN = re.compile(r"<img\b[^>]*>", re.IGNORECASE)
_IMAGE_MARKDOWN_PATTERN = re.compile(r"!\[[^\]]*\]\([^)]*\)")
_BBOX_PATTERN = re.compile(
    r"<[a-zA-Z][^>]*\b(bbox|bounding[_-]?box)\b[^>]*>",
    re.IGNORECASE,
)
_UNCERTAIN_PATTERN = re.compile(r"</?uncer(tain)?[^>]*>", re.IGNORECASE)


class CloudConversionError(Exception):
    """The Cloud conversion could not complete."""


class CloudFileTooLargeError(CloudConversionError):
    """The file is above the 50 MB ceiling and is never sent."""


class CloudConsentRequiredError(CloudConversionError):
    """No Cloud byte may leave the machine without an explicit consent grant."""


@dataclass(frozen=True)
class PageAsset:
    """One rendered page: its PNG bytes and its extracted text layer."""

    number: int
    png_bytes: bytes
    text_layer: str
    table_columns: int = 0
    geometry_markdown: str = ""

    @property
    def image_url(self) -> str:
        """Return the base64 PNG data URL carried as an ``ImagePart``."""
        encoded = base64.b64encode(self.png_bytes).decode("ascii")
        return f"data:image/png;base64,{encoded}"

    def table_columns_at_or_above(self, limit: int) -> bool:
        """True when the page's text layer carries a row of ``limit``+ columns."""
        return self.table_columns >= limit


@dataclass(frozen=True)
class CloudConversionResult:
    """The body Markdown, the provenance metadata, and the geometry backlog."""

    markdown: str
    metadata: Mapping[str, Any]
    pages: int
    awaiting_geometry: tuple[int, ...] = ()
    output_path: Path | None = None
    messages_sent: int = 0
    band_images_sent: int = 0


class ProviderFactory(Protocol):
    def __call__(self, profile: CloudProfile, secret: str) -> ProviderClient:
        """Build the provider client for one Profile and one secret."""


def render_page_assets(
    pdf_path: str | Path,
    *,
    max_pages: int = MAX_CLOUD_PAGES_DEFAULT,
    dpi: int = CLOUD_PAGE_DPI,
) -> list[PageAsset]:
    """Render each page at 150 DPI and extract its text layer with pdfium words."""
    from scan2text.services.text_layer import (
        build_geometry_table_markdown,
        extract_text_pages,
        find_geometry_tables,
    )

    source = Path(pdf_path)
    scale = dpi / _PDF_POINTS_PER_INCH
    text_pages = {
        page.page_number: page
        for page in extract_text_pages(source, max_pages=max_pages)
    }
    assets: list[PageAsset] = []
    with pdfium.PdfDocument(str(source)) as document:
        for index in range(min(len(document), max_pages)):
            page = document[index]
            image = page.render(scale=scale)
            text_layer = page.get_textpage().get_text_range()
            text_page = text_pages.get(index + 1)
            geometry_tables = find_geometry_tables(text_page) if text_page else ()
            geometry_columns = max(
                (table.column_count for table in geometry_tables), default=0
            )
            assets.append(
                PageAsset(
                    number=index + 1,
                    png_bytes=_bitmap_png_bytes(image, _target_size(page, dpi)),
                    text_layer=text_layer,
                    table_columns=max(
                        widest_table_columns(text_layer), geometry_columns
                    ),
                    geometry_markdown=(
                        build_geometry_table_markdown(text_page)
                        if geometry_tables and text_page
                        else ""
                    ),
                )
            )
    return assets


def _target_size(page: Any, dpi: int) -> tuple[int, int]:
    """The exact pixel size of one page at ``dpi`` (letter at 150 DPI: 1275x1650)."""
    width_points, height_points = page.get_size()
    return (
        max(1, round(width_points * dpi / _PDF_POINTS_PER_INCH)),
        max(1, round(height_points * dpi / _PDF_POINTS_PER_INCH)),
    )


def _bitmap_png_bytes(bitmap: Any, target: tuple[int, int] | None = None) -> bytes:
    """Encode one pdfium bitmap as PNG bytes at the exact target size.

    pdfium rounds the rendered bitmap up, so the bitmap is cropped (or padded)
    to the exact pixel grid the DPI contract asks for.
    """
    image = bitmap.to_pil()
    if target is not None and image.size != target:
        width, height = target
        if image.size[0] >= width and image.size[1] >= height:
            image = image.crop((0, 0, width, height))
        else:
            padded = Image.new(image.mode, target, 255)
            padded.paste(image, (0, 0))
            image = padded
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _strip_untrusted_coordinates(reply: str) -> str:
    """Drop every model-emitted image tag or bounding-box tag (D-17).

    Embedded images are extracted from the PDF directly, so no model-emitted
    coordinate is ever trusted, kept, or written.
    """
    cleaned = _IMAGE_TAG_PATTERN.sub("", reply)
    cleaned = _IMAGE_MARKDOWN_PATTERN.sub("", cleaned)
    cleaned = _BBOX_PATTERN.sub("", cleaned)
    return _UNCERTAIN_PATTERN.sub("", cleaned)


def widest_table_columns(text_layer: str) -> int:
    """Return the widest tab-delimited table row in one page's text layer."""
    widest = 0
    for line in text_layer.splitlines():
        if _TAB_DELIMITER not in line:
            continue
        cells = [cell for cell in line.split(_TAB_DELIMITER) if cell.strip()]
        widest = max(widest, len(cells))
    return widest


def build_band_request(pages: list[PageAsset], *, recipe: CloudRecipe) -> ChatMessage:
    """Build ONE request with the prompt, then each page's image and text layer.

    Ordering is deterministic: the prompt text part first, then for each page its
    150 DPI page image followed by that page's extracted text layer (D-16).
    """
    content: list[TextPart | ImagePart] = [TextPart(text=recipe.prompt)]
    for page in pages:
        content.append(ImagePart(url=page.image_url))
        content.append(TextPart(text=page.text_layer))
    return ChatMessage(role="user", content=tuple(content))


def _gfm_row_cells(line: str) -> int:
    """Count the filled cells of one GFM table row."""
    stripped = line.strip()
    if stripped.startswith("|"):
        stripped = stripped[1:]
    if stripped.endswith("|"):
        stripped = stripped[:-1]
    return len([cell for cell in stripped.split("|") if cell.strip()])


def _split_gfm_table_blocks(lines: list[str]) -> list[tuple[int, int]]:
    """Return the ``(start, end)`` line ranges of every GFM table block."""
    blocks: list[tuple[int, int]] = []
    start: int | None = None
    for index, line in enumerate(lines):
        if line.strip().startswith("|"):
            if start is None:
                start = index
        elif start is not None:
            blocks.append((start, index))
            start = None
    if start is not None:
        blocks.append((start, len(lines)))
    return blocks


def _band_markdown(reply: str) -> tuple[str, int]:
    """Convert the reply through the existing converter and fence wide tables.

    A returned table with more than twelve columns is never kept (D-27): the
    block is replaced by the geometry placeholder and the band reports how
    many wide tables it had to fence.
    """
    from scan2text.services.postprocess_service import convert_html_tables_to_gfm

    markdown = convert_html_tables_to_gfm(reply)
    lines = markdown.splitlines()
    blocks = _split_gfm_table_blocks(lines)
    wide_positions = [
        position
        for position, (start, end) in enumerate(blocks)
        if any(
            _gfm_row_cells(line) > WIDE_TABLE_COLUMN_LIMIT for line in lines[start:end]
        )
    ]
    if not wide_positions:
        return markdown, 0
    replaced = list(lines)
    for position in reversed(wide_positions):
        start, end = blocks[position]
        replaced[start:end] = [_RENAMED_TABLE_CELL]
    return "\n".join(replaced), len(wide_positions)


def _attribute_wide_tables(pages: Sequence[PageAsset], count: int) -> list[int]:
    """Attribute every fenced wide table of a band to one page of that band.

    The table-shaped pages of the band come first; a wide table that no page
    claimed belongs to the first page of the band.
    """
    tabular = [page.number for page in pages if "\t" in page.text_layer]
    numbers: list[int] = []
    for index in range(count):
        if index < len(tabular):
            numbers.append(tabular[index])
        elif pages:
            numbers.append(pages[0].number)
    return numbers


def _iso_local_now(moment: datetime | None = None) -> str:
    return (moment or datetime.now()).isoformat(timespec="seconds")


def build_metadata(
    *,
    profile: CloudProfile,
    pages: int,
    wide_table_pages: Iterable[int] = (),
    awaiting_geometry: Iterable[int] | None = None,
    generated_at: datetime | None = None,
) -> dict[str, Any]:
    """Build the provenance metadata, including the geometry backlog."""
    wide = list(wide_table_pages)
    pending = wide if awaiting_geometry is None else list(awaiting_geometry)
    return {
        "engine": "cloud",
        "model": profile.model_id,
        "prompt_version": profile.recipe.version,
        "pages": pages,
        "generated_at": _iso_local_now(generated_at),
        "wide_table_pages": wide,
        "awaiting_geometry": pending,
    }


def format_metadata_block(metadata: Mapping[str, Any]) -> str:
    """Produce the YAML front matter block: five keys, then ``---`` and a blank line."""
    lines = [
        "---",
        f"engine: {metadata['engine']}",
        f"model: {metadata['model']}",
        f"prompt_version: {metadata['prompt_version']}",
        f"pages: {metadata['pages']}",
        f"generated_at: {metadata['generated_at']}",
        "---",
        "",
    ]
    return "\n".join(lines) + "\n"


def reject_over_ceiling(size_bytes_or_path: int | str | Path) -> None:
    """Raise ``CloudFileTooLargeError`` above the one shared 50 MB ceiling."""
    if isinstance(size_bytes_or_path, int):
        size_bytes = size_bytes_or_path
    else:
        size_bytes = Path(size_bytes_or_path).stat().st_size
    if size_bytes > CEILING_BYTES:
        ceiling_mb = CEILING_BYTES // (1024 * 1024)
        raise CloudFileTooLargeError(
            f"The file is above the {ceiling_mb} MB Cloud ceiling and was not sent."
        )


def convert_pdf_to_markdown(
    source_path: str | Path,
    *,
    profile: CloudProfile,
    client: ProviderClient,
    path_service: "PathService | None" = None,
    cancellation: JobCancellation | None = None,
) -> CloudConversionResult:
    """Render the pages, walk them in bands of five, and concatenate the replies."""
    source = Path(source_path)
    reject_over_ceiling(source)
    pages = render_page_assets(source, max_pages=MAX_CLOUD_PAGES_DEFAULT)

    # (anchor page, pages of the part, wide pages of the part, markdown)
    parts: list[tuple[int, tuple[int, ...], tuple[int, ...], str]] = []
    wide_pages: list[int] = []
    band_images = 0
    messages_sent = 0
    for start in range(0, len(pages), CLOUD_EXECUTION_BAND_SIZE):
        # D-22: a cancelled job stops between the bands; nothing more is sent.
        if cancellation is not None:
            cancellation.raise_if_cancelled()
        band = list(pages[start : start + CLOUD_EXECUTION_BAND_SIZE])
        wide_in_band = [
            page
            for page in band
            if page.table_columns_at_or_above(WIDE_TABLE_COLUMN_LIMIT + 1)
        ]
        sendable = [page for page in band if page not in wide_in_band]
        wide_pages.extend(page.number for page in wide_in_band)
        if not sendable:
            # Every page in this band awaits the T08 geometry path.
            continue
        reply = _strip_untrusted_coordinates(
            client.complete(build_band_request(sendable, recipe=profile.recipe)).content
        )
        if cancellation is not None:
            cancellation.raise_if_cancelled()
        messages_sent += 1
        band_images += len(sendable)
        band_markdown, wide_tables = _band_markdown(reply)
        attributed: tuple[int, ...] = ()
        if wide_tables:
            attributed = tuple(_attribute_wide_tables(sendable, wide_tables))
            wide_pages.extend(attributed)
        parts.append(
            (
                sendable[0].number,
                tuple(page.number for page in sendable),
                attributed,
                band_markdown,
            )
        )

    unique_wide = sorted(set(wide_pages))
    geometry_pages = {
        page.number: page.geometry_markdown
        for page in pages
        if page.number in unique_wide and page.geometry_markdown
    }
    for number, markdown in geometry_pages.items():
        parts.append((number, (number,), (), markdown))
    parts.sort(key=lambda part: part[0])

    bodies: list[str] = []
    for _anchor, _numbers, wide_numbers, markdown in parts:
        if wide_numbers and all(number in geometry_pages for number in wide_numbers):
            markdown = "\n".join(
                line
                for line in markdown.splitlines()
                if line.strip() != _RENAMED_TABLE_CELL
            )
        if markdown.strip():
            bodies.append(markdown)

    unresolved = [number for number in unique_wide if number not in geometry_pages]
    metadata = build_metadata(
        profile=profile,
        pages=len(pages),
        wide_table_pages=unique_wide,
        awaiting_geometry=unresolved,
    )
    return CloudConversionResult(
        markdown="\n\n".join(part for part in bodies if part),
        metadata=metadata,
        pages=len(pages),
        awaiting_geometry=tuple(unresolved),
        output_path=_resolve_output_path(source, path_service),
        messages_sent=messages_sent,
        band_images_sent=band_images,
    )


def _resolve_output_path(
    source: Path, path_service: "PathService | None"
) -> Path | None:
    """Ask the existing naming rule once, so a caller can write to that exact path."""
    if path_service is None:
        return None
    return path_service.resolve_output_path(source)


def write_cloud_result(
    result: CloudConversionResult,
    source_path: str | Path,
    *,
    path_service: "PathService | None" = None,
) -> Path:
    """Write ``metadata block + body`` with UTF-8 and ``newline="\\n"``, never overwriting."""
    from scan2text.services.path_service import PathService

    paths = path_service or PathService()
    target = Path(result.output_path or paths.resolve_output_path(Path(source_path)))
    target.parent.mkdir(parents=True, exist_ok=True)
    with open(target, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(format_metadata_block(result.metadata) + result.markdown)
    return target


class CloudConversionService:
    """Public entry point the queue calls after the consent gate says yes."""

    def __init__(
        self,
        *,
        profile_loader: Callable[[], CloudProfile],
        client_factory: Callable[[CloudProfile, str], ProviderClient | None] | None = None,
        credential_reader: Callable[[], str | None] | None = None,
        path_service: "PathService | None" = None,
    ) -> None:
        from scan2text.services.path_service import PathService

        self._profile_loader = profile_loader
        self._client_factory = client_factory
        self._credential_reader = credential_reader or (lambda: None)
        self._path_service = path_service or PathService()

    def convert(
        self,
        source_path: str | Path,
        *,
        consent_granted: bool,
        cancellation: JobCancellation | None = None,
    ) -> CloudConversionResult:
        """Convert one PDF and write its Markdown, only when consent was granted."""
        if not consent_granted:
            raise CloudConsentRequiredError(
                "The Cloud engine needs explicit consent before any file is sent."
            )
        source = Path(source_path)
        reject_over_ceiling(source)
        profile = self._profile_loader()
        secret = self._credential_reader()
        if secret is None:
            # Nothing to send with; the caller's gate owns the key prompt.
            secret = ""
        client = self._client_factory(profile, secret) if self._client_factory else None
        if client is None:
            raise CloudConversionError("No Cloud provider client is configured.")
        # T05: the provider seam owns the failure taxonomy. The wrapper retries
        # transient errors and raises a typed fast-fail or parked error; it never
        # substitutes a different client or engine.
        client = RetryingProviderClient(client)
        if cancellation is not None:
            # D-22: a cancel can now abandon the request that is in flight.
            cancellation.attach_provider(client)
        try:
            result = convert_pdf_to_markdown(
                source,
                profile=profile,
                client=client,
                path_service=self._path_service,
                cancellation=cancellation,
            )
        except ProviderAborted as exc:
            raise JobCancelledError("The Cloud job was cancelled.") from exc
        if cancellation is not None:
            # The result of a cancelled job is discarded; nothing is written.
            cancellation.raise_if_cancelled()
        written = write_cloud_result(result, source, path_service=self._path_service)
        if cancellation is not None and cancellation.cancelled:
            # The cancel landed while the file was written: discard it.
            written.unlink(missing_ok=True)
            raise JobCancelledError("The Cloud job was cancelled.")
        return CloudConversionResult(
            markdown=result.markdown,
            metadata=result.metadata,
            pages=result.pages,
            awaiting_geometry=result.awaiting_geometry,
            output_path=written,
            messages_sent=result.messages_sent,
            band_images_sent=result.band_images_sent,
        )
