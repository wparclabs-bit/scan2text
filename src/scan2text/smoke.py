"""Manual OCR smoke test against the real model (Phase 7, per 04-testing manual/E2E)."""
from __future__ import annotations

import sys
from pathlib import Path

from scan2text.adapters.vlm_ocr import VlmOcrAdapter

DEFAULT_SAMPLES = ["samples/biaya.jpg", "samples/chat.pdf", "samples/contoh.pdf"]


def main(argv: list[str]) -> int:
    targets = argv[1:] or DEFAULT_SAMPLES
    adapter = VlmOcrAdapter()
    for rel in targets:
        path = Path(rel)
        print(f"\n===== {path.name} =====")
        result = adapter.ocr(str(path))
        if isinstance(result, dict):
            print("ERROR:", result)
        else:
            print(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
