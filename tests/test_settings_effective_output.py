"""Tests for effective output_dir resolution on GET /api/settings.

BUG-34: GET /api/settings returned raw stored output_dir which could be empty
or whitespace. The fix resolves on-read: if stored output_dir is blank after
strip, fall back to PathService.output_dir. SettingsService.load() stays raw.
"""
from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from scan2text.models.settings import AppSettings
from scan2text.services.path_service import PathService
from scan2text.services.settings_service import SettingsService


class TestEffectiveOutputDir:
    """GET /api/settings returns effective output_dir (resolved fallback)."""

    @pytest.fixture
    def app(self):
        with patch("scan2text.api.main.QueueService") as MockQS, \
             patch("scan2text.api.main.VlmOcrAdapter") as MockVlm:
            mock_qs = MagicMock()
            mock_qs._vlm_adapter = MagicMock()
            MockQS.return_value = mock_qs
            MockVlm.return_value = MagicMock()
            from scan2text.api.main import app as api_app
            yield api_app

    def test_empty_stored_output_dir_returns_pathservice_fallback(self, app, tmp_path):
        """When stored output_dir is "", GET returns PathService.output_dir."""
        settings_dir = tmp_path / "settings"
        settings_dir.mkdir()
        settings_file = settings_dir / "settings.json"
        settings_file.write_text(json.dumps({"output_dir": ""}))

        ps = PathService(base_dir=str(tmp_path))
        expected_output = str(ps.output_dir)

        with patch("scan2text.routes.settings.SettingsService") as MockSvc, \
             patch("scan2text.routes.settings.PathService", return_value=ps):
            mock_svc = MagicMock()
            mock_settings = AppSettings(output_dir="")
            mock_svc.load.return_value = mock_settings
            MockSvc.return_value = mock_svc

            with TestClient(app) as client:
                r = client.get("/api/settings")

        assert r.status_code == 200
        body = r.json()
        assert body["output_dir"] == expected_output
        assert body["max_pdf_pages"] == 50

    def test_whitespace_stored_output_dir_returns_pathservice_fallback(self, app, tmp_path):
        """When stored output_dir is all whitespace, GET returns PathService.output_dir."""
        settings_dir = tmp_path / "settings"
        settings_dir.mkdir()
        settings_file = settings_dir / "settings.json"
        settings_file.write_text(json.dumps({"output_dir": "   \t  "}))

        ps = PathService(base_dir=str(tmp_path))
        expected_output = str(ps.output_dir)

        with patch("scan2text.routes.settings.SettingsService") as MockSvc, \
             patch("scan2text.routes.settings.PathService", return_value=ps):
            mock_svc = MagicMock()
            mock_settings = AppSettings(output_dir="   \t  ")
            mock_svc.load.return_value = mock_settings
            MockSvc.return_value = mock_svc

            with TestClient(app) as client:
                r = client.get("/api/settings")

        assert r.status_code == 200
        body = r.json()
        assert body["output_dir"] == expected_output

    def test_nonempty_stored_output_dir_returns_as_is(self, app, tmp_path):
        """When stored output_dir is non-empty, GET returns it unchanged."""
        custom_dir = str(tmp_path / "custom" / "output")
        settings_dir = tmp_path / "settings"
        settings_dir.mkdir()
        settings_file = settings_dir / "settings.json"
        settings_file.write_text(json.dumps({"output_dir": custom_dir}))

        ps = PathService(base_dir=str(tmp_path))

        with patch("scan2text.routes.settings.SettingsService") as MockSvc, \
             patch("scan2text.routes.settings.PathService", return_value=ps):
            mock_svc = MagicMock()
            mock_settings = AppSettings(output_dir=custom_dir)
            mock_svc.load.return_value = mock_settings
            MockSvc.return_value = mock_svc

            with TestClient(app) as client:
                r = client.get("/api/settings")

        assert r.status_code == 200
        body = r.json()
        assert body["output_dir"] == custom_dir
        assert body["output_dir"] != str(ps.output_dir)

    def test_load_stays_raw_not_mutated(self, tmp_path):
        """SettingsService.load() must still return raw stored value."""
        settings_dir = tmp_path / "settings"
        settings_dir.mkdir()
        settings_file = settings_dir / "settings.json"
        settings_file.write_text(json.dumps({"output_dir": ""}))

        ps = PathService(base_dir=str(tmp_path))
        svc = SettingsService(path_service=ps)
        loaded = svc.load()

        assert loaded.output_dir == ""
        assert isinstance(loaded, AppSettings)
