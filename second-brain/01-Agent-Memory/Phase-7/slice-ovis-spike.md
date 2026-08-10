# Slice — OvisOCR2 Engine Spike

Date: 2026-08-10
Phase: Phase 7
Status: COMPLETE (ADR-006 signed)

## Goal

Evaluate OvisOCR2 0.9B (Apache-2.0; bartowski Q8_0 text GGUF + f16 mmproj) against the locked GLM-OCR 0.9B config to determine if an engine swap is viable for production.

## Gates

| Gate | Result |
| --- | --- |
| Load PASS | Model loads via llama-cpp-python 0.3.34, MTMDChatHandler |
| Time PASS | biaya.jpg 98.3s (within acceptable range); decode 30.7 t/s |
| Human review GOOD | CEO human review of biaya + triple (Image1/image4/sample-1) against originals; accepted with known defects per ADR-006 |

## Evidence Table

| Page | Wall-clock | Gate | Quality |
| --- | --- | --- | --- |
| biaya.jpg (wide financial) | 98.3s | PASS | numerics 100%; labels more faithful than golden (komisi/skenario); right-edge dropout under greedy, restored at temp 0.1 |
| Image1 (tiny-text stock tables) | 45.2s | PASS | numbers clean; occasional ticker-name garbles; one empty header-table artifact |
| image4 (NYT front page) | 372.3s | WARN | prose excellent; minor garbles; max_tokens headroom unverified |
| sample-1 (scientific tables) | 326.2s | WARN | structure excellent (Greek letters, rowspan); footnotes verified FAITHFUL to original (CEO check: "Rhodesia" present in source) |

## Key Decisions

1. **Sampling**: temperature 0.1 default for Ovis (re-validate during port). GLM rollback branch carries locked GLM config (official task prompts, h-overlap 0.25, repeat_penalty 1.0).
2. **HTML→GFM converter**: backend converts model HTML tables → GFM pipe tables (Python stdlib only; FR-08 no-new-deps; merged cells best-effort flattened).
3. **Chart crops**: model <img> bbox tags → crops saved to `<output_stem>_files/images/`, src rewritten to relative path (FR-08 guardrail exception: one input → one .md + optional asset folder only when source contains charts).
4. **PDF rasterization**: pypdfium2 already in production; verification closed.
5. **Rollback**: restore models/glm-backup contents + GLM branch config. No frontend changes.
6. **Production filenames unchanged**: models/vlm.gguf + models/mmproj.gguf (contents swapped); GLM-OCR files moved to models/glm-backup/ (gitignored, NOT shipped).

## Lessons Learned

- py -3.12 launcher bypasses venvs; lock the interpreter by evidence (the bench command), never by memory.
- Error hints mislead ('provide the mmproj' appeared with mmproj attached); probe with minimal auditable scripts.
- Golden outputs are references, not truth; the original file plus human review is the standard.
- When the agent wanders, hand it verbatim file content; zero design freedom.
- No run without a file: reproducible, or it didn't happen.

## Open Items

- Port slices S2-S6 (ADR-006)
- HTML→GFM converter tests
- max_tokens headroom experiment (image4 @8192)
- temp 0.1 re-validation
- wide-sheet tiling enhancement (parked)
- pre-GitHub cleanup manifest
