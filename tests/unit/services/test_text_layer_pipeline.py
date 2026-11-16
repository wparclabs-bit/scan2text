"""T07 — the pipeline routes a digital PDF to the text layer (D-26).

A PDF that already carries text converts from that text layer: the model is
never called and the page is never rasterised. A page without a text layer
still goes to OCR, exactly as before.
"""

from __future__ import annotations

from pathlib import Path

import pypdfium2
import pytest

from scan2text.adapters.ocr_engine import FakeOCR
from scan2text.services.queue_service import QueueService
from services.pdf_fixtures import (
    DIGITAL_LINK,
    DIGITAL_PAGE,
    SCANNED_PAGE,
    build_pdf,
)


class RecordingAdapter:
    """Stands in for the VLM adapter and records every OCR call."""

    def __init__(self, text: str = "OCR TEXT") -> None:
        self.calls: list[str] = []
        self._text = text

    def ocr(self, image_path: str, enhance: bool = False) -> str:
        self.calls.append(image_path)
        return self._text


def _queue(tmp_path: Path) -> QueueService:
    return QueueService(
        ocr_engine=FakeOCR(),
        quarantine_dir=tmp_path / "quarantine",
    )


def _write(tmp_path: Path, data: bytes, name: str) -> Path:
    path = tmp_path / name
    path.write_bytes(data)
    return path


class TestTextLayerRouting:
    """The queue converts a digital PDF from its text layer."""

    def test_digital_pdf_produces_markdown_without_calling_the_model(self, tmp_path):
        path = _write(
            tmp_path, build_pdf([DIGITAL_PAGE], [DIGITAL_LINK]), "digital.pdf"
        )
        adapter = RecordingAdapter()

        summary = _queue(tmp_path).process_image_paths([path], adapter)

        assert summary.succeeded == 1
        markdown = summary.job_results[0]["markdown_content"]
        assert "# Chapter One" in markdown
        assert "- First bullet item" in markdown
        assert "print(42)" in markdown
        assert "[Read the docs for more detail.](https://example.com/docs)" in markdown
        assert adapter.calls == []

    def test_digital_pdf_is_not_rasterised(self, tmp_path, monkeypatch):
        path = _write(
            tmp_path, build_pdf([DIGITAL_PAGE], [DIGITAL_LINK]), "digital.pdf"
        )

        def _no_render(*args, **kwargs):
            raise AssertionError("the text-layer path must not rasterise a page")

        monkeypatch.setattr(pypdfium2.PdfPage, "render", _no_render)
        adapter = RecordingAdapter()

        summary = _queue(tmp_path).process_image_paths([path], adapter)

        assert summary.succeeded == 1
        assert adapter.calls == []

    def test_scanned_pdf_still_uses_the_ocr_path(self, tmp_path):
        path = _write(tmp_path, build_pdf([SCANNED_PAGE]), "scanned.pdf")
        adapter = RecordingAdapter()

        summary = _queue(tmp_path).process_image_paths([path], adapter)

        assert summary.succeeded == 1
        assert adapter.calls == [str(path)]
        assert summary.job_results[0]["markdown_content"] == "OCR TEXT"

    def test_mixed_pdf_uses_text_layer_for_the_digital_page_and_ocr_for_the_scanned_page(
        self, tmp_path
    ):
        path = _write(
            tmp_path,
            build_pdf([DIGITAL_PAGE, SCANNED_PAGE], [DIGITAL_LINK]),
            "mixed.pdf",
        )
        adapter = RecordingAdapter()

        summary = _queue(tmp_path).process_image_paths([path], adapter)

        assert summary.succeeded == 1
        markdown = summary.job_results[0]["markdown_content"]
        assert "# Chapter One" in markdown
        assert "OCR TEXT" in markdown
        # Only the scanned page is sent to the model.
        assert len(adapter.calls) == 1
        assert adapter.calls[0] != str(path)
