"""S11-FIX74: Per-page PDF resilience in the VLM OCR pipeline.

Defect 2 (from S11-DIAG-BACKEND-STATUS-SEMANTICS): PDF processing was atomic per
file — one bad page (post-processing / engine error) failed the ENTIRE PDF with
no .md written even when most pages OCR fine.

Contract under test:
  (a) A single failing middle page is skipped; the PDF still COMPLETES with the
      successful pages present IN ORDER, separated by the FR-06 page separator,
      and the bad page absent.
  (b) When EVERY page fails, ocr() returns an OCR_FAILED dict so the caller
      quarantines the file and writes NO markdown.
  (c) A skipped page emits a privacy-safe log entry: page index + error code
      only — no filename, no document content.

Mirror FIX73 semantics at the page level: any page succeeds → job completed;
zero pages succeed → job failed.
"""

from __future__ import annotations

import io
import logging
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from PIL import Image

from scan2text.adapters.vlm_ocr import VlmOcrAdapter, OCR_FAILED
from scan2text.services.file_service import FileService
from scan2text.services.path_service import PathService
from scan2text.services.queue_service import QueueService


# PDF magic bytes — recognised by detect_file_type (see test_pdf_chart_crops.py).
_PDF_MAGIC = b"%PDF-1.4\n"
# FR-06 page separator used to join per-page text into one Markdown document.
_SEP = "\n\n---\n\n"


def _build_adapter() -> VlmOcrAdapter:
    """Minimally initialised VlmOcrAdapter for direct ocr() seam tests."""
    with patch.object(VlmOcrAdapter, "__init__", lambda self: None):
        adapter = VlmOcrAdapter()
        adapter._loaded = True
        adapter._timeout = 5
        adapter._input_queue = MagicMock()
        adapter._output_queue = MagicMock()
        return adapter


def _make_pdf(tmp_path: Path, name: str = "document.pdf") -> Path:
    path = tmp_path / name
    path.write_bytes(_PDF_MAGIC)
    return path


def _mock_three_pages(adapter: VlmOcrAdapter) -> None:
    """Patch _render_pdf to yield three (png_bytes, pil_image) page views."""
    pages = []
    for _ in range(3):
        buf = io.BytesIO()
        img = Image.new("RGB", (100, 100))
        img.save(buf, format="PNG")
        pages.append((buf.getvalue(), img))
    adapter._render_pdf = lambda _p: pages


def _crops_skip_page1(markdown: str, src, md_path) -> str:
    """side_effect: raise only when the failing middle page is processed."""
    if "page1" in markdown:
        raise RuntimeError("crop boom")
    return f"{markdown}-cropped"


def _crops_all_fail(markdown: str, src, md_path) -> str:
    raise RuntimeError("crop boom")


class TestVlmOcrPdfPageResilience:
    """Seam tests at VlmOcrAdapter.ocr() — the fix site (vlm_ocr.py:272-278)."""

    def test_one_middle_page_fails_job_completes_with_remaining_pages_in_order(
        self, tmp_path, caplog
    ):
        """(a) Failing middle page skipped; PDF completes; good pages present IN
        ORDER with FR-06 separator; bad page absent."""
        caplog.set_level(logging.WARNING)
        path = _make_pdf(tmp_path)
        adapter = _build_adapter()
        _mock_three_pages(adapter)
        adapter._output_queue.get.return_value = f"page0{_SEP}page1{_SEP}page2"

        with patch(
            "scan2text.adapters.vlm_ocr.extract_and_save_image_crops",
            side_effect=_crops_skip_page1,
        ):
            result = adapter.ocr(str(path))

        assert isinstance(result, str)
        # Successful pages present IN ORDER, joined by the FR-06 separator.
        assert _SEP in result
        assert result.index("page0-cropped") < result.index("page2-cropped")
        # Bad page absent (no text, no engine detail leaked).
        assert "page1" not in result
        assert "crop boom" not in result

    def test_all_pages_fail_returns_error_dict(self, tmp_path):
        """(b) Every page fails → ocr() returns OCR_FAILED dict (caller writes
        NO markdown)."""
        path = _make_pdf(tmp_path)
        adapter = _build_adapter()
        _mock_three_pages(adapter)
        adapter._output_queue.get.return_value = f"page0{_SEP}page1{_SEP}page2"

        with patch(
            "scan2text.adapters.vlm_ocr.extract_and_save_image_crops",
            side_effect=_crops_all_fail,
        ):
            result = adapter.ocr(str(path))

        assert isinstance(result, dict)
        assert result["error"] == OCR_FAILED

    def test_skipped_page_logs_privacy_safe_entry_only(self, tmp_path, caplog):
        """(c) Skipped page logs page index + error code only; no filename and
        no document content appears in any log record."""
        caplog.set_level(logging.WARNING)
        path = _make_pdf(tmp_path, name="secret_report.pdf")
        adapter = _build_adapter()
        _mock_three_pages(adapter)
        adapter._output_queue.get.return_value = f"page0{_SEP}page1{_SEP}page2"

        with patch(
            "scan2text.adapters.vlm_ocr.extract_and_save_image_crops",
            side_effect=_crops_skip_page1,
        ):
            result = adapter.ocr(str(path))

        assert isinstance(result, str)
        joined = "\n".join(r.getMessage() for r in caplog.records)
        # Allowed fields present: page index + error code.
        assert "index=1" in joined
        assert OCR_FAILED in joined
        # Privacy (NFR-02): no filename, no document content, no engine detail.
        assert "secret_report.pdf" not in joined
        assert "page0" not in joined
        assert "page2" not in joined
        assert "crop boom" not in joined


class TestVlmOcrPdfPageResilienceEndToEnd:
    """Seam tests at QueueService.process_image_paths — where the .md is written
    (or not) and the file is quarantined."""

    def _svc(self, tmp_path: Path):
        paths = PathService(base_dir=str(tmp_path))
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)
        return QueueService(
            ocr_engine=MagicMock(),
            path_service=paths,
            file_service=FileService(),
        )

    def test_partial_success_writes_single_markdown(self, tmp_path):
        """A partially-successful PDF yields markdown content in job_results."""
        svc = self._svc(tmp_path)
        adapter = _build_adapter()
        path = _make_pdf(tmp_path)
        _mock_three_pages(adapter)
        adapter._output_queue.get.return_value = f"page0{_SEP}page1{_SEP}page2"

        with patch(
            "scan2text.adapters.vlm_ocr.extract_and_save_image_crops",
            side_effect=_crops_skip_page1,
        ):
            summary = svc.process_image_paths([path], adapter)

        assert summary.succeeded == 1
        assert summary.failed == 0
        assert len(summary.job_results) == 1
        job_result = summary.job_results[0]
        assert "markdown_content" in job_result
        content = job_result["markdown_content"]
        assert "page0-cropped" in content
        assert "page2-cropped" in content
        assert "page1" not in content
        # No files written to disk
        md_files = list((tmp_path / "output").glob("*.md"))
        assert len(md_files) == 0

    def test_all_pages_fail_writes_no_markdown_and_quarantines(self, tmp_path):
        """An all-failing PDF writes NO markdown and quarantines the source file."""
        paths = PathService(base_dir=str(tmp_path))
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)
        quarantine = tmp_path / "quarantine" / "failed"
        svc = QueueService(
            ocr_engine=MagicMock(),
            path_service=paths,
            file_service=FileService(),
            quarantine_dir=quarantine,
        )
        adapter = _build_adapter()
        path = _make_pdf(tmp_path)
        _mock_three_pages(adapter)
        adapter._output_queue.get.return_value = f"page0{_SEP}page1{_SEP}page2"

        with patch(
            "scan2text.adapters.vlm_ocr.extract_and_save_image_crops",
            side_effect=_crops_all_fail,
        ):
            summary = svc.process_image_paths([path], adapter)

        assert summary.succeeded == 0
        assert summary.failed == 1
        assert list((tmp_path / "output").glob("*.md")) == []
        assert quarantine.exists()
        assert not path.exists()
