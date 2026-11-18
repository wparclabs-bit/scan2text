"""T04 — Cloud conversion: bands, prompt asset, metadata, and the consent gate.

Synthetic PDFs only. No network: every provider interaction goes through the
injected seam (``FakeProviderClient`` or a local scripted client).
"""

from __future__ import annotations

import base64
import datetime as _datetime
import struct
import tempfile
import uuid
from pathlib import Path

import pytest

from scan2text.cloud.conversion import (
    BAND_SEQUENCE_LENGTH,
    CLOUD_EXECUTION_BAND_SIZE,
    CLOUD_PAGE_DPI,
    WIDE_TABLE_COLUMN_LIMIT,
    CloudConsentRequiredError,
    CloudConversionResult,
    CloudConversionService,
    CloudFileTooLargeError,
    build_band_request,
    convert_pdf_to_markdown,
    format_metadata_block,
    reject_over_ceiling,
    render_page_assets,
    write_cloud_result,
)
from scan2text.cloud.fake_provider import FakeProviderClient
from scan2text.cloud.models import CloudProfile
from scan2text.cloud.provider import ChatMessage, ImagePart, ProviderResponse, TextPart
from scan2text.cloud.route_decision import (
    CEILING_BYTES,
    LOCAL_THRESHOLD_BYTES,
    Engine,
    decide_route,
)
from scan2text.cloud.service import DEFAULT_PROFILE_PATH, CloudProfileService
from scan2text.services.path_service import PathService
from scan2text.services.queue_service import QueueService
from services.pdf_fixtures import build_pdf

MEGABYTE = 1024 * 1024

# The sandboxed test environment cannot always remove its own temporary tree,
# so every fixture lives in one uniquely named directory per module.
_TEST_ROOT = Path(tempfile.gettempdir()) / f"scan2text-cloud-conversion-{uuid.uuid4().hex}"
_TEST_ROOT.mkdir(parents=True, exist_ok=True)


# --- Synthetic PDF builder (no writer in pypdfium2) -------------------------


def _build_pdf(page_texts: list[str]) -> bytes:
    """Build a minimal valid PDF whose pages carry a real extractable text layer."""
    objects: list[bytes] = []
    count = len(page_texts)
    kids = " ".join(f"{4 + index} 0 R" for index in range(count))
    objects.append(b"<</Type/Catalog/Pages 2 0 R>>")
    objects.append(f"<</Type/Pages/Kids[{kids}]/Count {count}>>".encode("latin-1"))
    objects.append(b"<</Font<</F1 3 0 R>>>>")
    for index in range(count):
        objects.append(
            b"<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources 3 0 R/Contents "
            + f"{4 + count + index} 0 R>>".encode("latin-1")
        )
    for text in page_texts:
        content = f"BT /F1 12 Tf 100 Td ({text}) Tj ET".encode("latin-1")
        objects.append(
            b"<</Length "
            + str(len(content)).encode("latin-1")
            + b">>stream\n"
            + content
            + b"\nendstream"
        )
    out = bytearray(b"%PDF-1.4\n")
    offsets: list[int] = []
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{index} 0 obj\n".encode("latin-1") + obj + b"\nendobj\n"
    xref_offset = len(out)
    out += f"xref\n0 {len(objects) + 1}\n".encode("latin-1")
    out += b"0000000000 65535 f \n"
    for offset in offsets:
        out += f"{offset:010d} 00000 n \n".encode("latin-1")
    out += (
        f"trailer<</Size {len(objects) + 1}/Root 1 0 R>>\n"
        f"startxref\n{xref_offset}\n%%EOF\n"
    ).encode("latin-1")
    return bytes(out)


def _write_pdf(name: str, page_texts: list[str], *, pad_bytes: int = 0) -> Path:
    path = _TEST_ROOT / name
    payload = _build_pdf(page_texts)
    if pad_bytes:
        payload += b"0" * pad_bytes
    path.write_bytes(payload)
    return path


def _png_dimensions(png_bytes: bytes) -> tuple[int, int]:
    assert png_bytes[:8] == b"\x89PNG\r\n\x1a\n"
    return struct.unpack(">II", png_bytes[16:24])


class RecordingProvider(FakeProviderClient):
    """FakeProviderClient that also keeps every message it was sent."""

    def __init__(self) -> None:
        super().__init__()
        self.messages: list[ChatMessage] = []

    def complete(self, message: ChatMessage) -> ProviderResponse:
        response = super().complete(message)
        self.messages.append(message)
        return response


class ScriptedProvider:
    """Provider seam with one deterministic reply per call."""

    def __init__(self, replies: list[str]) -> None:
        self.replies = replies
        self.messages: list[ChatMessage] = []
        self.last_message: ChatMessage | None = None

    def complete(self, message: ChatMessage) -> ProviderResponse:
        self.messages.append(message)
        self.last_message = message
        index = min(len(self.messages) - 1, len(self.replies) - 1)
        return ProviderResponse(content=self.replies[index])


def _profile(tmp_path: Path) -> CloudProfile:
    service = CloudProfileService(
        profile_path=tmp_path / "missing-cloud-profile.json",
        default_profile_path=DEFAULT_PROFILE_PATH,
    )
    return service.load()


def _path_service(name: str) -> PathService:
    return PathService(base_dir=str(_TEST_ROOT / name))


def _fake_service(provider) -> CloudConversionService:
    profile = CloudProfileService(
        profile_path=_TEST_ROOT / "missing-profile.json",
        default_profile_path=DEFAULT_PROFILE_PATH,
    )
    return CloudConversionService(
        profile_loader=profile.load,
        client_factory=lambda loaded, secret: provider,
    )


def _image_parts(message: ChatMessage) -> list[ImagePart]:
    return [part for part in message.content if isinstance(part, ImagePart)]


def _text_parts(message: ChatMessage) -> list[TextPart]:
    return [part for part in message.content if isinstance(part, TextPart)]


# --- RED/GREEN tests --------------------------------------------------------


def test_file_above_the_threshold_routes_to_the_cloud_engine_and_one_at_or_below_stays_local() -> None:
    large = _write_pdf("routing-large.pdf", ["large page"], pad_bytes=9 * MEGABYTE)
    small = _write_pdf("routing-small.pdf", ["small page"])

    assert large.stat().st_size > LOCAL_THRESHOLD_BYTES
    assert small.stat().st_size <= LOCAL_THRESHOLD_BYTES
    assert decide_route(large).route is Engine.CLOUD
    assert decide_route(small).route is Engine.LOCAL

    provider = RecordingProvider()
    service = _fake_service(provider)

    result = service.convert(large, consent_granted=True)

    assert result.metadata["engine"] == "cloud"
    assert result.pages == 1
    assert provider.last_message is not None


def test_queue_routes_a_large_file_to_cloud_and_keeps_a_small_file_on_the_local_path() -> None:
    class NullAdapter:
        def __init__(self) -> None:
            self.calls: list[str] = []

        def ocr(self, path: str, enhance: bool = False) -> str:
            self.calls.append(path)
            return "# local page"

    class RecordingCloudService:
        def __init__(self) -> None:
            self.calls: list[Path] = []

        def convert(self, source_path, *, consent_granted: bool, cancellation=None):
            self.calls.append(Path(source_path))
            return CloudConversionResult(
                markdown="# cloud page",
                metadata={
                    "engine": "cloud",
                    "model": "vision-model",
                    "prompt_version": "cloud-v1-test",
                    "pages": 1,
                    "generated_at": "2026-11-15T20:00:00",
                },
                pages=1,
                awaiting_geometry=(),
            )

    large = _write_pdf("queue-large.pdf", ["large page"], pad_bytes=9 * MEGABYTE)
    small = _write_pdf("queue-small.pdf", ["small page"], pad_bytes=1000)

    cloud = RecordingCloudService()
    adapter = NullAdapter()
    path_service = _path_service("queue")
    queue = QueueService(
        ocr_engine=adapter,
        path_service=path_service,
        cloud_conversion_service=cloud,
    )
    queue._vlm_adapter = adapter

    summary = queue.process_image_paths([large, small], adapter, consent_granted=True)

    assert cloud.calls == [large]
    # The small file stays on the local path. It is a digital PDF, so it
    # converts from its text layer and the model is not called (D-26).
    assert adapter.calls == []
    assert summary.total_inputs == 2
    cloud_results = [
        result for result in summary.job_results if result.get("engine") == "cloud"
    ]
    assert len(cloud_results) == 1
    assert cloud_results[0]["source_file"] == large.name
    local_results = [
        result for result in summary.job_results if result.get("engine") != "cloud"
    ]
    assert len(local_results) == 1
    assert local_results[0]["source_file"] == small.name
    assert "small page" in local_results[0]["markdown_content"]


def test_pages_are_sent_in_bands_of_five_150_dpi_page_images_with_the_extracted_text_layer(tmp_path) -> None:
    page_texts = [f"band page {index} text layer" for index in range(1, 7)]
    source = _write_pdf("bands.pdf", page_texts)
    profile = _profile(tmp_path)
    provider = RecordingProvider()
    path_service = _path_service("bands")

    result = convert_pdf_to_markdown(
        source,
        profile=profile,
        client=provider,
        path_service=path_service,
    )

    assert CLOUD_EXECUTION_BAND_SIZE == 5
    assert CLOUD_PAGE_DPI == 150
    assert BAND_SEQUENCE_LENGTH == 5
    assert result.pages == 6
    # Six pages => one five-page band plus one single-page band.
    assert len(provider.messages) == 2
    band_message = provider.messages[0]
    assert len(band_message.content) == 1 + 5 + 5
    assert isinstance(band_message.content[0], TextPart)
    assert band_message.content[0].text.startswith(profile.recipe.prompt)
    for index in range(5):
        image = band_message.content[1 + index * 2]
        text = band_message.content[2 + index * 2]
        assert isinstance(image, ImagePart)
        assert isinstance(text, TextPart)
        assert image.url.startswith("data:image/png;base64,")
        png_bytes = base64.b64decode(image.url.split(",", 1)[1])
        assert _png_dimensions(png_bytes) == (1275, 1650)
        assert text.text.strip() == page_texts[index]


def test_a_band_never_sends_300_dpi_table_crops() -> None:
    source = _write_pdf("dpi.pdf", ["dpi page one", "dpi page two"])
    profile = _profile(_TEST_ROOT)
    pages = render_page_assets(source, max_pages=5)

    message = build_band_request(pages, recipe=profile.recipe)

    images = _image_parts(message)
    assert len(images) == 2
    for image in images:
        png_bytes = base64.b64decode(image.url.split(",", 1)[1])
        width, height = _png_dimensions(png_bytes)
        # A4 at 150 DPI. A 300 DPI full page would be twice these dimensions.
        assert (width, height) == (1275, 1650)
        assert width < 2550 and height < 3300


def test_a_table_with_thirteen_or_more_columns_is_not_sent_to_the_model_and_is_recorded_as_awaiting_geometry() -> None:
    wide_row = "\t".join(f"c{index}" for index in range(1, 14))
    narrow_row = "\t".join(f"n{index}" for index in range(1, 13))
    source = _write_pdf("wide.pdf", [wide_row, narrow_row, "plain page"])
    profile = _profile(_TEST_ROOT)
    provider = RecordingProvider()

    result = convert_pdf_to_markdown(
        source,
        profile=profile,
        client=provider,
        path_service=_path_service("wide"),
    )

    assert WIDE_TABLE_COLUMN_LIMIT == 12
    # The wide page is recorded, never sent.
    assert 1 in result.awaiting_geometry
    assert result.metadata["awaiting_geometry"] == [1]
    sent_texts = [part.text for part in _text_parts(provider.last_message)]
    assert not any(wide_row == text.strip() for text in sent_texts)
    assert any(narrow_row == text.strip() for text in sent_texts)
    # The wide page's image is not in the request either.
    assert len(_image_parts(provider.last_message)) == 2


def test_a_wide_table_record_is_filled_by_the_geometry_path_instead_of_a_placeholder() -> None:
    def cells(prefix: str, count: int, y: float):
        return [
            ("F1", 6, 20 + index * 44, y, f"{prefix}{index:02d}")
            for index in range(count)
        ]

    source = _TEST_ROOT / "wide-geometry.pdf"
    source.write_bytes(
        build_pdf(
            [
                cells("H", 13, 700) + cells("V", 13, 688),
                cells("N", 12, 700),
                [("F1", 12, 100, 700, "plain page")],
            ]
        )
    )
    profile = _profile(_TEST_ROOT)
    provider = RecordingProvider()

    result = convert_pdf_to_markdown(
        source,
        profile=profile,
        client=provider,
        path_service=_path_service("wide-geometry"),
    )

    assert "| H01 | H02 |" in result.markdown
    assert "| V01 | V02 |" in result.markdown
    assert "[wide table awaiting geometry]" not in result.markdown
    assert result.awaiting_geometry == ()
    assert result.metadata["awaiting_geometry"] == []
    assert result.metadata["wide_table_pages"] == [1]
    # The wide page was never sent to the model.
    assert len(_image_parts(provider.last_message)) == 2


def test_model_html_tables_are_converted_through_the_existing_gfm_converter_keeping_merged_cells_and_ragged_rows() -> None:
    source = _write_pdf("gfm.pdf", ["gfm page"])
    profile = _profile(_TEST_ROOT)
    reply = (
        "<table><tr><th colspan='2'>Merged</th><th>C</th></tr>"
        "<tr><td>1</td><td>2</td><td>3</td></tr>"
        "<tr><td>ragged</td></tr></table>"
    )
    provider = ScriptedProvider([reply])

    result = convert_pdf_to_markdown(
        source,
        profile=profile,
        client=provider,
        path_service=_path_service("gfm"),
    )

    assert "<table>" not in result.markdown
    assert "|" in result.markdown
    assert "Merged" in result.markdown
    assert "ragged" in result.markdown


def test_written_file_starts_with_the_metadata_block_naming_engine_model_prompt_version_page_count_and_generation_time(tmp_path) -> None:
    source = _write_pdf("metadata.pdf", ["metadata page one", "metadata page two"])
    profile = _profile(tmp_path)
    provider = RecordingProvider()
    path_service = _path_service("metadata")

    result = convert_pdf_to_markdown(
        source,
        profile=profile,
        client=provider,
        path_service=path_service,
    )
    written = write_cloud_result(result, source, path_service=path_service)

    lines = written.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "---"
    assert lines[1] == "engine: cloud"
    assert lines[2] == f"model: {profile.model_id}"
    assert lines[3] == f"prompt_version: {profile.recipe.version}"
    assert lines[4] == "pages: 2"
    assert lines[5].startswith("generated_at: ")
    assert lines[6] == "---"
    assert lines[7] == ""
    assert result.metadata["engine"] == "cloud"
    assert result.metadata["model"] == profile.model_id
    assert result.metadata["prompt_version"] == profile.recipe.version
    assert result.pages == 2
    assert result.markdown == "VISION_OK"
    assert "engine:" not in result.markdown
    _datetime.datetime.fromisoformat(result.metadata["generated_at"])


def test_format_metadata_block_has_exactly_the_five_keys_in_order() -> None:
    metadata = {
        "engine": "cloud",
        "model": "vision-model",
        "prompt_version": "cloud-v1-test",
        "pages": 6,
        "generated_at": "2026-11-15T20:00:00",
    }

    block = format_metadata_block(metadata)

    assert block.splitlines() == [
        "---",
        "engine: cloud",
        "model: vision-model",
        "prompt_version: cloud-v1-test",
        "pages: 6",
        "generated_at: 2026-11-15T20:00:00",
        "---",
        "",
    ]
    assert block.endswith("\n\n")


def test_written_file_name_and_output_folder_match_the_local_naming_rule() -> None:
    source = _write_pdf("naming rule.pdf", ["naming page"])
    profile = _profile(_TEST_ROOT)
    provider = RecordingProvider()
    path_service = _path_service("naming")

    result = convert_pdf_to_markdown(
        source,
        profile=profile,
        client=provider,
        path_service=path_service,
    )
    expected = path_service.resolve_output_path(source)
    written = write_cloud_result(result, source, path_service=path_service)

    assert written == expected
    assert written.parent == path_service.output_path
    assert written.name.startswith("naming_rule_")
    assert written.name.endswith(".md")
    assert written.read_text(encoding="utf-8") == (
        format_metadata_block(result.metadata) + result.markdown
    )
    assert result.output_path == written


def test_a_file_above_fifty_megabytes_is_rejected_with_a_clear_message() -> None:
    oversized = _TEST_ROOT / "oversized.pdf"
    oversized.write_bytes(b"0" * (CEILING_BYTES + 1))

    with pytest.raises(CloudFileTooLargeError) as error:
        reject_over_ceiling(oversized)

    message = str(error.value)
    assert "50 MB" in message


def test_cloud_conversion_refuses_to_send_without_consent() -> None:
    source = _write_pdf("no-consent.pdf", ["never sent"])
    provider = RecordingProvider()
    service = _fake_service(provider)

    with pytest.raises(CloudConsentRequiredError):
        service.convert(source, consent_granted=False)

    assert provider.last_message is None
    assert provider.messages == []


def test_the_recipe_keeps_temperature_0_6_top_p_0_95_and_thinking_disabled() -> None:
    profile = _profile(_TEST_ROOT)

    assert profile.recipe.temperature == 0.6
    assert profile.recipe.top_p == 0.95
    assert profile.recipe.thinking_enabled is False

    source = _write_pdf("recipe.pdf", ["recipe page"])
    message = build_band_request(
        render_page_assets(source, max_pages=1), recipe=profile.recipe
    )
    assert message.content[0].text.startswith(profile.recipe.prompt)


def test_the_prompt_requests_html_tables_and_never_bounding_box_tags() -> None:
    profile = _profile(_TEST_ROOT)
    prompt = profile.recipe.prompt
    lowered = prompt.lower()

    # The prompt asks for HTML tables ...
    assert "html table" in lowered
    # ... and never asks the model for a coordinate, a bbox, or an image tag.
    import re

    for request in re.finditer(r"\b(emit|return|include|output|add|provide)\b", lowered):
        following = lowered[request.end() : request.end() + 80]
        assert "bbox" not in following
        assert "bounding box" not in following
        assert "bounding-box" not in following
        assert "<img" not in following
        assert "coordinate" not in following
    assert profile.recipe.version.startswith("cloud-v2")
