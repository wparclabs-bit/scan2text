All 85 tests pass (82 existing + 3 new). Here's what was done:

**Dependency** — `llama-cpp-python>=0.3.7,<0.4` was already present in `pyproject.toml`.

**Model update** — Added `model_path: str = ""` to `AppSettings` in `src/scan2text/models/settings.py:10`.

**Tests** (`tests/test_vlm_ocr.py`) — 3 mocked tests, no real GGUF loading:

- `TestVlmOcrReadsModelPath` — verifies `model_path` is read from `settings.json` via `SettingsService`
- `TestVlmOcrReturnsMarkdown` — verifies Markdown string is returned when the mocked process completes successfully
- `TestVlmOcrTimeout` — verifies that a process alive after 180s triggers `terminate()`, `join()`, and returns `{"error": "OCR_TIMEOUT", ...}`

**Implementation** (`src/scan2text/adapters/vlm_ocr.py`):

- Standalone `_vlm_worker()` function at module level for Windows spawn compatibility; receives `image_path` (not raw bytes), loads the Llama model, reads the image from disk, runs inference with the hardcoded prompt, and puts the result into a `multiprocessing.Queue`
- `VlmOcrAdapter.ocr()` starts the worker as a `Process`, joins with `timeout=180`, and on timeout calls `terminate()` + `join()` before returning the structured error dict
- Uses `multiprocessing.queues.Empty` imported directly to avoid mock-collision issues

**Validation** — `python -m pytest -q` → 85 passed in 0.57s.