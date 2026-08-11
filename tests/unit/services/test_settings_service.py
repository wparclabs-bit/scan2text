"""Unit tests for SettingsService."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import pytest

from scan2text.models.settings import AppSettings
from scan2text.services.path_service import PathService
from scan2text.services.settings_service import SettingsError, SettingsService


class TestSettingsMissingFile:
    def test_creates_defaults_when_missing(self, tmp_path):
        paths = PathService(base_dir=str(tmp_path))
        svc = SettingsService(path_service=paths)
        settings = svc.load()
        assert isinstance(settings, AppSettings)
        assert settings.output_dir == ""
        assert settings.max_pdf_pages == 20


class TestSettingsRoundtrip:
    def test_save_and_load_roundtrip(self, tmp_path):
        paths = PathService(base_dir=str(tmp_path))
        svc = SettingsService(path_service=paths)
        original = AppSettings(output_dir="/custom/out", max_pdf_pages=30, cpu_threads=4)
        svc.save(original)
        loaded = svc.load()
        assert loaded.output_dir == "/custom/out"
        assert loaded.max_pdf_pages == 30
        assert loaded.cpu_threads == 4


class TestSettingsValidation:
    def test_invalid_json_raises_settings_error(self, tmp_path):
        (tmp_path / "settings").mkdir(parents=True, exist_ok=True)
        settings_file = tmp_path / "settings" / "settings.json"
        settings_file.write_text("not valid json{{{")

        paths = PathService(base_dir=str(tmp_path))
        svc = SettingsService(path_service=paths)
        with pytest.raises(SettingsError) as exc_info:
            svc.load()
        assert exc_info.value.code.value == "SETTINGS_INVALID"

    def test_invalid_pydantic_fields_raises(self, tmp_path):
        (tmp_path / "settings").mkdir(parents=True, exist_ok=True)
        settings_file = tmp_path / "settings" / "settings.json"
        # max_pdf_pages must be >= 1
        settings_file.write_text(json.dumps({"max_pdf_pages": 0}))

        paths = PathService(base_dir=str(tmp_path))
        svc = SettingsService(path_service=paths)
        with pytest.raises(SettingsError) as exc_info:
            svc.load()
        assert exc_info.value.code.value == "SETTINGS_INVALID"


class TestSettingsAtomicSave:
    def test_final_file_exists_and_is_valid_json(self, tmp_path):
        paths = PathService(base_dir=str(tmp_path))
        svc = SettingsService(path_service=paths)
        settings = AppSettings(output_dir="/test", max_pdf_pages=25)
        svc.save(settings)
        settings_file = paths.settings_path
        assert settings_file.exists()
        data = json.loads(settings_file.read_text(encoding="utf-8"))
        assert data["output_dir"] == "/test"


class TestHideWelcomeNotice:
    def test_default_value_is_false(self):
        settings = AppSettings()
        assert settings.hide_welcome_notice is False

    def test_save_and_load_hide_welcome_notice(self, tmp_path):
        paths = PathService(base_dir=str(tmp_path))
        svc = SettingsService(path_service=paths)
        original = AppSettings(hide_welcome_notice=True)
        svc.save(original)
        loaded = svc.load()
        assert loaded.hide_welcome_notice is True

    def test_load_missing_file_defaults_to_false(self, tmp_path):
        paths = PathService(base_dir=str(tmp_path))
        svc = SettingsService(path_service=paths)
        settings = svc.load()
        assert settings.hide_welcome_notice is False
