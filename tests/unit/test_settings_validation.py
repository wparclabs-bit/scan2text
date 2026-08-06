from __future__ import annotations

import json
import pytest
from pathlib import Path

from scan2text.models.settings import AppSettings
from scan2text.services.settings_service import SettingsService


class TestAppSettingsValidation:
    def test_defaults(self):
        s = AppSettings()
        assert s.max_pdf_pages == 20
        assert s.cpu_threads == 0
        assert s.check_updates_on_startup is True

    def test_rejects_zero_max_pages(self):
        with pytest.raises(Exception):
            AppSettings(max_pdf_pages=0)

    def test_negative_threads(self):
        with pytest.raises(Exception):
            AppSettings(cpu_threads=-1)


class TestSettingsPersistence:
    def test_save_and_load_roundtrip(self, tmp_scan2text, mock_paths):
        svc = SettingsService()
        settings = AppSettings(output_dir=str(tmp_scan2text / "out"), max_pdf_pages=30)
        svc.save(settings)
        loaded = svc.load()
        assert loaded.output_dir == str(tmp_scan2text / "out")
        assert loaded.max_pdf_pages == 30
