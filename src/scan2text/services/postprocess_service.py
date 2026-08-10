"""Post-processing service — GFM table conversion + image crop extraction."""

from __future__ import annotations

import re
from pathlib import Path

from PIL import Image


def convert_html_tables_to_gfm(markdown: str) -> str:
    """Convert all HTML <table> blocks in *markdown* to GitHub Flavored Markdown tables.

    Best-effort: nested tags inside cells are stripped to plain text.
    Rowspan/colspan are NOT reconstructed (NFR-04).
    """
    table_pattern = re.compile(r"<table[^>]*>(.*?)</table>", re.DOTALL | re.IGNORECASE)

    def _replace_table(match: re.Match[str]) -> str:
        block = match.group(1)
        rows = re.findall(r"<tr[^>]*>(.*?)</tr>", block, re.DOTALL | re.IGNORECASE)
        if not rows:
            return match.group(0)

        gfm_rows: list[list[str]] = []
        for row in rows:
            cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, re.DOTALL | re.IGNORECASE)
            texts = [_strip_tags(cell) for cell in cells]
            gfm_rows.append(texts)

        if not gfm_rows:
            return match.group(0)

        lines: list[str] = []
        for i, cells in enumerate(gfm_rows):
            lines.append("| " + " | ".join(cells) + " |")
            if i == 0:
                lines.append("|" + "|".join("---" for _ in cells) + "|")

        return "\n".join(lines)

    return table_pattern.sub(_replace_table, markdown)


def _strip_tags(html: str) -> str:
    """Remove all HTML tags from *html*, returning plain text."""
    return re.sub(r"<[^>]+>", "", html).strip()


def extract_and_save_image_crops(
    markdown: str,
    source_image_path: Path,
    output_md_path: Path,
) -> str:
    """Extract <img> crops from *source_image_path* and rewrite markdown srcs.

    Looks for tags of the form::

        <img src="images/bbox_{L}_{T}_{R}_{B}.jpg" />

    Coordinates are scaled 0-1000. Crops are saved to::

        {output_md_path.parent}/{output_md_path.stem}_files/images/

    and markdown srcs are rewritten to relative paths::

        ./{stem}_files/images/bbox_{L}_{T}_{R}_{B}.jpg
    """
    img_pattern = re.compile(
        r'<img\s+src="images/bbox_(\d+)_(\d+)_(\d+)_(\d+)\.jpg"\s*/?>',
        re.IGNORECASE,
    )

    stem = output_md_path.stem
    crop_dir = output_md_path.parent / f"{stem}_files" / "images"
    crop_dir.mkdir(parents=True, exist_ok=True)

    with Image.open(source_image_path) as pil_img:
        w, h = pil_img.size

        def _replace_img(match: re.Match[str]) -> str:
            l_, t_, r_, b_ = (int(match.group(i)) for i in range(1, 5))
            x1 = int(l_ / 1000 * w)
            y1 = int(t_ / 1000 * h)
            x2 = int(r_ / 1000 * w)
            y2 = int(b_ / 1000 * h)

            # Ensure valid coordinates
            x1, x2 = sorted((x1, x2))
            y1, y2 = sorted((y1, y2))
            if x2 <= x1 or y2 <= y1:
                return match.group(0)

            crop = pil_img.crop((x1, y1, x2, y2))
            out_name = f"bbox_{l_}_{t_}_{r_}_{b_}.jpg"
            out_path = crop_dir / out_name
            crop.save(out_path, format="JPEG")

            rel_src = f"./{stem}_files/images/{out_name}"
            return f'<img src="{rel_src}" />'

        return img_pattern.sub(_replace_img, markdown)
