"""Port check — verify OvisOCR2 adapter recipe after slice S2."""

from __future__ import annotations

import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))


def main() -> None:
    from scan2text.adapters.vlm_ocr import VlmOcrAdapter, OCR_TIMEOUT

    sample = ROOT / "samples" / "biaya.jpg"
    if not sample.exists():
        print(f"MISSING_SAMPLE: {sample}", file=sys.stderr)
        sys.exit(1)

    adapter = VlmOcrAdapter()
    timeout = adapter._timeout

    t0 = time.time()
    result = adapter.ocr(str(sample))
    wall = round(time.time() - t0, 1)

    if isinstance(result, dict):
        print(f"ERROR: {result}")
        sys.exit(1)

    chars = len(result)
    tr_count = result.count("<tr")
    checks = [
        "3,000,000",
        "-341,250",
        "-11.38%",
        "-526,250",
        "-17.54%",
        "-300,000",
        "10.00%",
        "-1,250",
        "-40,000",
        "6.00%",
        "-1,250",
        "185,000",
    ]
    # deduplicate while preserving order
    seen: set[str] = set()
    unique_checks: list[str] = []
    for c in checks:
        if c not in seen:
            seen.add(c)
            unique_checks.append(c)

    all_present = all(c in result for c in unique_checks)
    has_table = "<table" in result
    pass_gate = all_present and tr_count >= 20

    print(f"settings ocr_timeout_seconds={timeout}")
    print(f"WALL_SECONDS={wall}")
    print(f"CHARS={chars}")
    print(f"<tr count={tr_count}")
    for c in unique_checks:
        print(f"HAS_{c.replace(',', '_').replace('-', 'neg_').replace('%', 'pct')}={c in result}")
    print(f"PASS={'YES' if pass_gate else 'NO'}: all_numerics={'YES' if all_present else 'NO'} <table={'YES' if has_table else 'NO'} tr_count>={20} {'YES' if tr_count >= 20 else 'NO'}")


if __name__ == "__main__":
    main()
