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


class TestEngineSettingsDefaults:
    def test_engine_defaults(self):
        s = AppSettings()
        assert s.language == "auto"
        assert s.theme == "dark"
        assert s.model_path == ""
        assert s.mmproj_path == ""
        assert s.n_ctx == 4096
        assert s.n_threads == 0
        assert s.ocr_timeout_seconds == 180
        assert s.worker_priority == "below_normal"

    def test_backward_compat_old_dict(self):
        old = {"output_dir": "x", "max_pdf_pages": 5, "cpu_threads": 2, "check_updates_on_startup": False}
        s = AppSettings(**old)
        assert s.n_ctx == 4096


class TestPathServiceModelResolution:
    def test_models_dir_follows_app_root(self, tmp_path):
        from scan2text.services.path_service import PathService
        ps = PathService(base_dir=tmp_path / "data", app_root=tmp_path / "app")
        assert ps.models_dir == (tmp_path / "app" / "models")

    def test_models_dir_defaults_to_base_dir(self, tmp_path):
        from scan2text.services.path_service import PathService
        ps = PathService(base_dir=tmp_path / "data")
        assert ps.models_dir == (tmp_path / "data" / "models")

    def test_resolve_model_path_relative(self, tmp_path):
        from scan2text.services.path_service import PathService
        ps = PathService(app_root=tmp_path / "app")
        assert ps.resolve_model_path("models/gguf.bin") == (tmp_path / "app" / "models" / "gguf.bin")

    def test_resolve_model_path_absolute(self, tmp_path):
        from scan2text.services.path_service import PathService
        ps = PathService(app_root=tmp_path / "app")
        absolute = tmp_path / "other" / "model.bin"
        assert ps.resolve_model_path(str(absolute)) == absolute

    def test_app_root_property_explicit(self, tmp_path):
        from scan2text.services.path_service import PathService
        ps = PathService(base_dir=tmp_path / "data", app_root=tmp_path / "root")
        assert ps.app_root == (tmp_path / "root")

    def test_app_root_defaults_to_base_dir_when_base_set(self, tmp_path):
        from scan2text.services.path_service import PathService
        ps = PathService(base_dir=tmp_path / "data")
        assert ps.app_root == (tmp_path / "data")

    def test_assets_dir_follows_app_root(self, tmp_path):
        from scan2text.services.path_service import PathService
        ps = PathService(base_dir=tmp_path / "data", app_root=tmp_path / "app")
        assert ps.assets_dir == (tmp_path / "app" / "assets")

    def test_assets_dir_defaults_to_app_root(self, tmp_path):
        from scan2text.services.path_service import PathService
        ps = PathService(base_dir=tmp_path / "data")
        assert ps.assets_dir == (tmp_path / "data" / "assets")
