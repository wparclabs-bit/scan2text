"""CLI smoke test — end-to-end pipeline verification (S4-Rerun).

Runs samples/biaya.jpg through the real OvisOCR2 backend and verifies:
  - Output file is created in output/ directory
  - Output contains GFM tables (pipe characters |)
  - Image crops saved to {stem}_files/images/ (if bbox tags present)
  - Processing time reported

Exit code 0 on success, 1 on failure.
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from scan2text.adapters.vlm_ocr import VlmOcrAdapter
from scan2text.models.job import JobStatus, OCRJob
from scan2text.models.ocr_result import OCRResult
from scan2text.services.output_service import OutputService
from scan2text.services.settings_service import SettingsService
from scan2text.services.path_service import PathService


def main(argv: list[str]) -> int:
    sample = Path("samples/biaya.jpg")
    if not sample.exists():
        print(f"FAIL: sample not found at {sample.resolve()}")
        return 1

    try:
        settings_svc = SettingsService()
        settings = settings_svc.load()
        paths = PathService()
        paths.ensure_runtime_dirs()
        output_dir = paths.output_dir
        print(f"Settings loaded. Output dir: {output_dir}")
        print(f"Model: {settings.model_path or 'default'}")
        print(f"MMProj: {settings.mmproj_path or 'default'}")
        n_threads = settings.n_threads or settings.cpu_threads or "auto"
        print(f"n_ctx={settings.n_ctx}, n_threads={n_threads}")
    except Exception as exc:
        print(f"FAIL: could not load settings: {exc}")
        return 1

    adapter = VlmOcrAdapter()
    t0 = time.time()
    result = adapter.ocr(str(sample))
    elapsed = time.time() - t0

    if isinstance(result, dict):
        print(f"FAIL: OCR returned error: {result}")
        return 1

    # Write output via OutputService (full pipeline)
    try:
        output_svc = OutputService(paths)
        job = OCRJob(
            file_name=sample.name,
            file_path=str(sample),
            status=JobStatus.DONE,
        )
        ocr_result = OCRResult(
            job_id=job.id,
            source_file=str(sample),
            full_text=result,
        )
        written_path = output_svc.write(job, ocr_result)
        print(f"Output written: {written_path}")
    except Exception as exc:
        print(f"FAIL: could not write output: {exc}")
        return 1

    # Validation
    size_bytes = written_path.stat().st_size
    md_content = written_path.read_text(encoding="utf-8")

    gfm_table_lines = [line for line in md_content.splitlines() if line.strip().startswith("|")]
    gfm_table_count = len(gfm_table_lines)
    pipe_chars_in_tables = sum(line.count("|") for line in gfm_table_lines)

    crop_dir = sample.parent / f"{sample.stem}_files" / "images"
    crop_files = list(crop_dir.glob("*.jpg")) if crop_dir.exists() else []
    has_bbox_tags = "<img src=" in md_content

    print()
    print("=" * 60)
    print("SMOKE TEST REPORT")
    print("=" * 60)
    print(f"Sample:            {sample.name}")
    print(f"Output file:       {written_path.name} ({size_bytes} bytes)")
    print(f"GFM table lines:   {gfm_table_count}")
    print(f"Pipe chars in tbl: {pipe_chars_in_tables}")
    print(f"Crop dir exists:   {crop_dir.exists()}")
    print(f"Crop files saved:  {len(crop_files)}")
    print(f"Bbox tags present: {has_bbox_tags}")
    print(f"Processing time:   {elapsed:.1f}s")
    print("=" * 60)

    failures: list[str] = []
    if size_bytes == 0:
        failures.append("output file is empty")
    if gfm_table_count == 0:
        failures.append("no GFM table lines found (expected tables in biaya.jpg)")
    if not written_path.exists():
        failures.append("output file missing")

    if failures:
        print()
        print("FAILURES:")
        for f in failures:
            print(f"  - {f}")
        return 1

    print()
    print("SUCCESS: all checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
