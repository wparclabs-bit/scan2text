from __future__ import annotations

import pypdfium2 as pdfium
from pathlib import Path
from typing import List

MAX_PDF_PAGES_DEFAULT = 20


def count_pdf_pages(pdf_path: Path) -> int:
    with pdfium.PdfDocument(str(pdf_path)) as doc:
        return len(doc)


def check_page_limit(pdf_path: Path, max_pages: int) -> tuple[bool, str]:
    pages = count_pdf_pages(pdf_path)
    if pages > max_pages:
        return False, (
            f"PDF has {pages} pages; maximum allowed is {max_pages}. "
            "Increase max_pdf_pages in Settings."
        )
    return True, ""


def render_pdf_to_images(
    pdf_path: Path, output_dir: Path, max_pages: int
) -> List[Path]:
    """Render each page of a PDF to a PNG image. Returns list of rendered paths."""
    ok, err = check_page_limit(pdf_path, max_pages)
    if not ok:
        raise ValueError(err)

    base_name = pdf_path.stem
    images: List[Path] = []

    with pdfium.PdfDocument(str(pdf_path)) as doc:
        for i, page in enumerate(doc):
            img = page.render(scale=150 / 72)  # ~150 DPI
            png_path = output_dir / f"{base_name}_page_{i + 1}.png"
            with open(png_path, "wb") as f:
                img.save(pypdfium2.ImageFormat.PNG, file=f)
            images.append(png_path)

    return images
