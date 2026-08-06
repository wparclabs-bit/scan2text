from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Ensure scan2text package is on the path regardless of cwd
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))


@pytest.fixture
def tmp_scan2text(tmp_path):
    """Create a temporary Scan2Text directory structure."""
    for sub in ("models", "output", "settings", "logs", "assets"):
        (tmp_path / sub).mkdir()
    return tmp_path


@pytest.fixture
def fake_ocr_engine():
    from scan2text.adapters.ocr_engine import FakeOCR
    return FakeOCR()


@pytest.fixture
def mock_paths(tmp_scan2text):
    with patch("scan2text.services.path_service._default_instance") as m:
        mock = MagicMock()
        mock.exe_root = tmp_scan2text
        mock.models_dir = tmp_scan2text / "models"
        mock.output_dir = tmp_scan2text / "output"
        mock.settings_file = tmp_scan2text / "settings" / "settings.json"
        mock.logs_dir = tmp_scan2text / "logs"
        mock.log_file = tmp_scan2text / "logs" / "app.log"
        mock.assets_dir = tmp_scan2text / "assets"
        mock.resolve_relative.return_value = tmp_scan2text / "output"
        mock.ensure_dirs = lambda: None
        yield mock
