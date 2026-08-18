from __future__ import annotations

import pypdfium2 as pdfium
from pathlib import Path
from typing import List

MAX_PDF_PAGES_DEFAULT = 50
MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB

# Magic-byte signatures for real-type detection.
_MAGIC_PDF = b"%PDF"
_MAGIC_PNG = bytes([0x89, 0x50, 0x4E, 0x47])
_MAGIC_JPEG = bytes([0xFF, 0xD8, 0xFF])
_MAGIC_WEBP = b"RIFF"  # first 4 bytes of RIFF/WEBP

_IMAGE_EXTENSIONS = frozenset([".png", ".jpg", ".jpeg", ".webp"])


def detect_file_type(path: Path) -> str:
    """Return 'pdf' or 'image' based on suffix, with magic-byte tie-breaker.

    Primary signal: ``path.suffix.lower()``.
    Tie-breaker (only when suffix is empty or ambiguous): inspect the first
    8 bytes of the file against known magic signatures.
    """
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return "pdf"
    if suffix in _IMAGE_EXTENSIONS:
        return "image"
    # Suffix absent or unexpected — fall back to magic bytes.
    try:
        header = path.read_bytes()[:8]
    except OSError:
        return "image"
    if header.startswith(_MAGIC_PDF):
        return "pdf"
    if header.startswith(_MAGIC_PNG):
        return "image"
    if header.startswith(_MAGIC_JPEG):
        return "image"
    if header.startswith(_MAGIC_WEBP):
        return "image"
    return "image"


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


def check_pdf_size(pdf_path: Path) -> tuple[bool, str]:
    """Return (ok, message) for PDF file-size check (20 MB cap)."""
    size = pdf_path.stat().st_size
    if size > MAX_PDF_SIZE_BYTES:
        return False, (
            f"PDF is {size / (1024 * 1024):.1f} MB; maximum allowed is "
            f"{MAX_PDF_SIZE_BYTES / (1024 * 1024):.0f} MB."
        )
    return True, ""


def render_pdf_to_images(
    pdf_path: Path, output_dir: Path, max_pages: int
) -> List[Path]:
    """Render each page of a PDF to a PNG image. Returns list of rendered paths."""
    ok, err = check_page_limit(pdf_path, max_pages)
    if not ok:
        raise ValueError(err)
    ok, err = check_pdf_size(pdf_path)
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
