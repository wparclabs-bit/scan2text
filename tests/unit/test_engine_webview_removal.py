"""S32b: Engine webview removal + model filename fix.

Three tracer bullets:
  (a) import scan2text.engine succeeds (webview is gone).
  (b) engine source pins "vlm.gguf", not the stale "ovisocr2-q8.gguf".
  (c) engine source text contains no occurrence of "webview" — absence test.
"""
from __future__ import annotations

from pathlib import Path


class TestEngineWebViewRemoval:
    def test_import_engine_succeeds(self):
        """import scan2text.engine must not raise — webview is removed."""
        import scan2text.engine  # noqa: F401

    def test_model_filename_is_vlm_gguf(self):
        """engine.py must reference 'vlm.gguf', not the stale Ovis filename."""
        engine_path = (
            Path(__file__).parent.parent.parent
            / "src"
            / "scan2text"
            / "engine.py"
        )
        source = engine_path.read_text(encoding="utf-8")
        assert "vlm.gguf" in source, "engine.py must reference 'vlm.gguf'"
        assert "ovisocr2-q8.gguf" not in source, (
            "engine.py must NOT still reference the stale 'ovisocr2-q8.gguf'"
        )

    def test_webview_absent_from_source(self):
        """Absence test: 'webview' must not appear anywhere in engine.py."""
        engine_path = (
            Path(__file__).parent.parent.parent
            / "src"
            / "scan2text"
            / "engine.py"
        )
        source = engine_path.read_text(encoding="utf-8")
        assert "webview" not in source, (
            "engine.py must not contain 'webview' after removal"
        )
