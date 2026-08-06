"""Output service — renders OCR results into Markdown files."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import List, Optional

from scan2text.models.job import JobStatus, OCRJob
from scan2text.models.ocr_result import OCRPage, OCRResult
from scan2text.services.path_service import PathService

logger = logging.getLogger(__name__)


class OutputService:
    """Renders OCRResult into Markdown and writes one file per result.

    - Uses PathService for all output locations.
    - Ensures UTF-8 output with newline="\n".
    - Never merges multiple inputs into one file.
    - Empty OCR result still produces a valid output file.
    """

    def __init__(self, path_service: Optional[PathService] = None) -> None:
        self._paths = path_service or PathService()

    # --- Rendering ----------------------------------------------------------

    @staticmethod
    def render_markdown(result: OCRResult) -> str:
        """Render an OCRResult into canonical Markdown text.

        Multi-page documents get page separators.
        """
        if not result.pages:
            return result.full_text or ""

        parts: list[str] = []
        for page in result.pages:
            parts.append(f"--- Page {page.page_number} ---\n{page.text}")
        return "\n\n".join(parts)

    # --- Writing ------------------------------------------------------------

    def write(
        self,
        job: OCRJob,
        ocr_result: OCRResult,
        desired_stem: Optional[str] = None,
    ) -> Path:
        """Write the OCR result to a Markdown file.

        Returns the absolute path of the written file.
        Raises on I/O failure (caller should catch and mark job failed).
        """
        self._paths.ensure_runtime_dirs()

        markdown = self.render_markdown(ocr_result)
        output_path = self._paths.resolve_output_path(job.file_path, desired_stem)

        with open(output_path, "w", encoding="utf-8", newline="\n") as f:
            f.write(markdown)

        logger.info(
            "Output saved: %s (%d bytes)",
            output_path.name,
            len(markdown),
        )
        return output_path
