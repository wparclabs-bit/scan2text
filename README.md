# Scan2Text — Portable Offline OCR Tool

Portable Windows application that converts images and PDFs to Markdown using local LLM inference (OvisOCR2-GGUF Q8). No internet, no cloud, no installation required.

## Quick Start

```bash
cd scan2text
pip install -e ".[dev]"
python src/scan2text/engine.py
```

## Installing llama-cpp-python on Windows

`llama-cpp-python` can fail on Windows without C++ build tools. Use pre-compiled CPU wheels:

```bash
pip install --extra-index-url https://jllllll.github.io/llama-cpp-python-cuBLAS-wheels /
    llama-cpp-python \
    --extra-index-url https://pypi.org/simple/ \
    --prefer-binary
```

Or for CPU-only builds:

```bash
pip install llama-cpp-python \
    --index-url https://pypi.org/simple/ \
    --no-cache-dir
```

For the OvisOCR2 model with vision support, ensure both `ovisocr2-q8.gguf` and the paired `mmproj.gguf` are in the `models/` folder alongside the executable.

## Project Structure

```
src/scan2text/
├── models/           # Pydantic contracts (source of truth)
├── adapters/         # OCR engine interface & implementation
├── services/         # Business logic
├── routes/           # FastAPI HTTP endpoints
├── ui/static/        # HTML/CSS/JS frontend
└── engine.py         # Bootstrap launcher

tests/
├── unit/             # Pure logic tests (~20%)
└── integration/      # Service + API tests with FakeOCR (~70%)
```

## Development

```bash
# Run tests
pytest -v

# Run linting
ruff check src/ scan2text/tests

# Build standalone .exe
pyinstaller --onedir --name Scan2Text src/scan2text/engine.py
```

## Architecture

- **Local-first:** Zero cloud dependencies; all processing is offline.
- **Modular monolith:** Clean separation — UI ↔ Routes ↔ Services ↔ Adapters ↔ Storage.
- **Contract-first:** All data shapes defined as strict Pydantic models before any service or route code.
- **OCR isolation:** `OCREngine` ABC hides `llama-cpp-python` behind an interface; CI uses `FakeOCR`.
- **Portable runtime:** Runs from any folder without admin rights. Paths resolved via `path_service.py`.

## License

MIT
