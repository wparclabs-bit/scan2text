# ADR-006 — Primary OCR engine swap: GLM-OCR → OvisOCR2
Status: APPROVED (CEO signed 2026-08-10) · Phase: 7
Context: Phase-7 auditable spike (tools/spikes/ovis/) evaluated OvisOCR2 0.9B (Apache-2.0; bartowski Q8_0 text GGUF + f16 mmproj) against the locked GLM-OCR config, CPU-only, llama-cpp-python 0.3.34, interpreter locked by evidence (py -3.12 + PYTHONPATH=src from repo root; no venv).
Evidence:
| Page | Wall-clock | Gate | Quality |
| biaya.jpg (wide financial) | 98.3s | PASS | numerics 100% vs golden; labels more faithful than golden (komisi/skenario); right-edge dropout under greedy, restored at temp 0.1 |
| Image1 (tiny-text stock tables) | 45.2s | PASS | numbers clean; occasional ticker-name garbles; one empty header-table artifact |
| image4 (NYT front page) | 372.3s | WARN | prose excellent; minor garbles; max_tokens headroom unverified |
| sample-1 (scientific tables) | 326.2s | WARN | structure excellent (Greek letters, rowspan); footnote artifacts |
Decode 30.7 t/s. SAMPLING_SENSITIVE (temp 0.1 restores right edge; no fabrication observed in temp-0.1 output).
Decision:
1. Primary engine = OvisOCR2 0.9B. GLM-OCR removed from codebase to maintain MVP simplicity (YAGNI). External backup exists for disaster recovery only.
2. Production filenames stay vlm.gguf + mmproj.gguf (PRD §13, code defaults).
3. EXECUTED ON DISK 2026-08-10 (CEO manual): Ovis files renamed to vlm.gguf + mmproj.gguf; GLM files deleted. Rollback = CEO external backup (record location in this ADR when confirmed).
3. Sampling: temperature 0.1 default for Ovis (code port pending slice S2; current vlm_ocr.py passes no temperature = llama-cpp default 0.8 = WRONG, must fix).
4. Official OvisOCR2 prompt used VERBATIM (single RL-trained prompt; no task prefixes; no improvisation) — replaces current free-form _VLM_PROMPT in S2.
5. Image pipeline: full-page pass (no GLM 1152px tiling); pixel-cap normalization ≤ ~8.3MP; wide-sheet 2-pass tiling parked as enhancement.
6. Backend converts model HTML tables → GFM pipe tables (Python stdlib only; FR-08 no-new-deps; merged cells best-effort flattened). Chart/figure crops: model <img> bbox tags → crops saved to <output_stem>_files/images/, src rewritten.
7. PDF rasterization: pypdfium2 (verified in production code; closes PRD verification note).
Accepted known defects (MVP): right-edge dropout under greedy (mitigated by temp 0.1); one fee-row mis-association on wide sheets; tiny-text name garbles; empty header-table artifact; 5–7 min on dense full pages (progress shown per NFR-03).
Open port experiments: max_tokens headroom (image4 at 8192); temp 0.1 re-validation on port.
Supersedes: §12/FR-05 GLM-OCR engine line. Does not supersede ADR-005 or the future ADR-002-supersession.
Attribution: OvisOCR2 (ATH-MaaS) Apache-2.0; GGUF quantization by bartowski.

## Post-Spike Decisions

The following decisions were made during/after the spike and are recorded here for traceability:

1. **PDF Inspector hard limits**: Before rendering any PDF, the backend MUST check page count and file size. Hard limits: 20MB max file size, 20 pages max. Files exceeding either limit are rejected immediately with error code `FILE_TOO_COMPLEX`. No pixels are rendered for rejected files. Documented in FR-03, FR-06, FR-11 (v1.10).

2. **Persistent Info Screen**: A "Welcome to Scan2Text" modal shows on every launch unless the user checks "Don't show this again". The preference is persisted to `settings/settings.json`. This is a MVP must-have per PRD v1.10 §7.
