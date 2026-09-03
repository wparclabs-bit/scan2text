"""Tests for the image enhancement toggle (S62).

Covers the three backend seams:
1. POST /process accepts an optional ``enhance`` flag in JSON payload and forwards it
   to the queue service.
2. ``VlmOcrAdapter.ocr(image_path, enhance=True)`` applies PIL contrast + color
   enhancement (4.0x) before inference; ``enhance=False`` leaves the image untouched.
3. ``QueueService.process_image_paths`` forwards the enhance flag to the adapter.
"""

from __future__ import annotations

import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


def _tmp_file(suffix: str = ".png") -> str:
    """Create a temp file in C:\\Windows\\Temp and return its absolute path."""
    p = Path(tempfile.mktemp(suffix=suffix, dir="C:/Windows/Temp"))
    p.write_bytes(b"fake image bytes")
    return str(p)


class _FakeSummary:
    """Minimal BatchSummary-like object for tests."""

    def __init__(self, succeeded=1, failed=0, total_inputs=1):
        self.succeeded = succeeded
        self.failed = failed
        self.total_inputs = total_inputs
        self.job_results = [
            {"job_id": "j1", "source_file": "f.png", "status": "done", "error_code": None, "output_path": None}
        ]


@pytest.fixture
def app():
    with patch("scan2text.api.main.QueueService") as MockQS, \
         patch("scan2text.api.main.VlmOcrAdapter") as MockVlm:
        mock_qs = MagicMock()
        mock_qs._vlm_adapter = MagicMock()
        mock_qs.process_image_paths.return_value = _FakeSummary()
        MockQS.return_value = mock_qs

        mock_vlm = MagicMock()
        MockVlm.return_value = mock_vlm

        from scan2text.api.main import app as api_app
        yield api_app, mock_qs


class TestProcessEndpointEnhanceFlag:
    def test_post_process_passes_enhance_true_to_queue(self, app):
        """POST /process with enhance=true forwards enhance=True to the queue."""
        api_app, mock_qs = app
        path = _tmp_file()
        with TestClient(api_app) as client:
            response = client.post(
                "/process",
                json={"file_paths": [path], "enhance": True},
            )

        assert response.status_code == 202
        call_args = mock_qs.process_image_paths.call_args
        assert call_args.kwargs.get("enhance") is True

    def test_post_process_defaults_enhance_to_false(self, app):
        """POST /process without an enhance flag defaults to enhance=False."""
        api_app, mock_qs = app
        path = _tmp_file()
        with TestClient(api_app) as client:
            response = client.post(
                "/process",
                json={"file_paths": [path]},
            )

        assert response.status_code == 202
        call_args = mock_qs.process_image_paths.call_args
        assert call_args.kwargs.get("enhance") is False

    def test_post_process_passes_enhance_false_explicit(self, app):
        """POST /process with enhance=false forwards enhance=False to the queue."""
        api_app, mock_qs = app
        path = _tmp_file()
        with TestClient(api_app) as client:
            response = client.post(
                "/process",
                json={"file_paths": [path], "enhance": False},
            )

        assert response.status_code == 202
        call_args = mock_qs.process_image_paths.call_args
        assert call_args.kwargs.get("enhance") is False


class TestVlmOcrEnhance:
    def _make_adapter(self, tmp_scan2text, settings_data):
        """Construct a loaded VlmOcrAdapter with mocked worker + queues."""
        (tmp_scan2text / "models" / "vlm.gguf").write_bytes(b"fake-model")
        (tmp_scan2text / "models" / "mmproj.gguf").write_bytes(b"fake-mmproj")

        mock_process_instance = MagicMock()
        mock_process_instance.pid = 55

        mock_input_queue = MagicMock()
        mock_output_queue = MagicMock()
        mock_output_queue.get.return_value = "# md"

        with patch("scan2text.adapters.vlm_ocr.SettingsService") as MockSS, \
             patch("scan2text.adapters.vlm_ocr.Process", return_value=mock_process_instance), \
             patch("scan2text.adapters.vlm_ocr.psutil") as mock_psutil, \
             patch("scan2text.adapters.vlm_ocr.extract_and_save_image_crops",
                   side_effect=lambda md, src, out: md):
            mock_psutil.BELOW_NORMAL_PRIORITY_CLASS = 64
            mock_psutil.Process.return_value = MagicMock()
            mock_svc = MagicMock()
            mock_svc.load.return_value = self._settings(settings_data)
            MockSS.return_value = mock_svc

            from scan2text.adapters.vlm_ocr import VlmOcrAdapter
            adapter = VlmOcrAdapter()
            adapter._input_queue = mock_input_queue
            adapter._output_queue = mock_output_queue
            return adapter, mock_input_queue, mock_output_queue

    @staticmethod
    def _settings(data):
        from scan2text.models.settings import AppSettings
        return AppSettings(**data)

    def _settings_data(self, tmp_scan2text):
        return {
            "output_dir": "",
            "max_pdf_pages": 50,
            "cpu_threads": 0,
            "check_updates_on_startup": True,
            "model_path": str(tmp_scan2text / "models" / "vlm.gguf"),
            "mmproj_path": str(tmp_scan2text / "models" / "mmproj.gguf"),
        }

    def test_ocr_applies_contrast_and_color_when_enhance_true(self, tmp_scan2text):
        """enhance=True applies ImageEnhance.Contrast(4.0) then ImageEnhance.Color(4.0)."""
        settings_data = self._settings_data(tmp_scan2text)
        image_path = tmp_scan2text / "input.png"
        image_path.write_bytes(b"fake-image-bytes")

        adapter, _, _ = self._make_adapter(tmp_scan2text, settings_data)

        with patch("scan2text.adapters.vlm_ocr._prepare_views", side_effect=lambda img: [b"fake-png"]), \
             patch("scan2text.adapters.vlm_ocr.extract_and_save_image_crops",
                   side_effect=lambda md, src, out: md), \
             patch("PIL.Image.open") as mock_img_open, \
             patch("PIL.ImageEnhance.Contrast") as mock_contrast, \
             patch("PIL.ImageEnhance.Color") as mock_color:
            pil_img = MagicMock()
            mock_img_open.return_value.__enter__.return_value = pil_img
            mock_img_open.return_value.__exit__.return_value = None
            pil_img.convert.return_value = pil_img
            mock_contrast.return_value.enhance.return_value = pil_img
            mock_color.return_value.enhance.return_value = pil_img

            result = adapter.ocr(str(image_path), enhance=True)

        assert result == "# md"
        mock_contrast.assert_called_once()
        mock_color.assert_called_once()
        mock_contrast.return_value.enhance.assert_called_once_with(4.0)
        mock_color.return_value.enhance.assert_called_once_with(4.0)

    def test_ocr_skips_enhancement_when_enhance_false(self, tmp_scan2text):
        """enhance=False must NOT invoke any PIL enhancement."""
        settings_data = self._settings_data(tmp_scan2text)
        image_path = tmp_scan2text / "input.png"
        image_path.write_bytes(b"fake-image-bytes")

        adapter, _, _ = self._make_adapter(tmp_scan2text, settings_data)

        with patch("scan2text.adapters.vlm_ocr._prepare_views", side_effect=lambda img: [b"fake-png"]), \
             patch("scan2text.adapters.vlm_ocr.extract_and_save_image_crops",
                   side_effect=lambda md, src, out: md), \
             patch("PIL.Image.open") as mock_img_open, \
             patch("PIL.ImageEnhance.Contrast") as mock_contrast, \
             patch("PIL.ImageEnhance.Color") as mock_color:
            pil_img = MagicMock()
            mock_img_open.return_value.__enter__.return_value = pil_img
            mock_img_open.return_value.__exit__.return_value = None
            pil_img.convert.return_value = pil_img

            result = adapter.ocr(str(image_path), enhance=False)

        assert result == "# md"
        mock_contrast.assert_not_called()
        mock_color.assert_not_called()


class TestQueueServiceEnhancePassThrough:
    def test_process_image_paths_forwards_enhance_to_ocr(self, tmp_path):
        """process_image_paths forwards the enhance flag to vlm_adapter.ocr."""
        from scan2text.services.path_service import PathService
        from scan2text.services.queue_service import QueueService

        paths = PathService(base_dir=str(tmp_path))
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)

        mock_adapter = MagicMock()
        mock_adapter.ocr.return_value = "# md"

        svc = QueueService(ocr_engine=MagicMock(), path_service=paths)
        img = tmp_path / "doc.png"
        img.write_bytes(b"fake-image-bytes")

        svc.process_image_paths([img], mock_adapter, {}, enhance=True)

        mock_adapter.ocr.assert_called_with(str(img), enhance=True)

    def test_process_image_paths_defaults_enhance_false(self, tmp_path):
        """process_image_paths defaults enhance to False when not provided."""
        from scan2text.services.path_service import PathService
        from scan2text.services.queue_service import QueueService

        paths = PathService(base_dir=str(tmp_path))
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)

        mock_adapter = MagicMock()
        mock_adapter.ocr.return_value = "# md"

        svc = QueueService(ocr_engine=MagicMock(), path_service=paths)
        img = tmp_path / "doc.png"
        img.write_bytes(b"fake-image-bytes")

        svc.process_image_paths([img], mock_adapter, {})

        mock_adapter.ocr.assert_called_with(str(img), enhance=False)


class TestAppSettingsEnhanceField:
    def test_enhance_image_quality_defaults_to_false(self):
        """AppSettings.enhance_image_quality defaults to False."""
        from scan2text.models.settings import AppSettings

        settings = AppSettings()
        assert settings.enhance_image_quality is False

    def test_enhance_image_quality_is_persisted(self, tmp_path):
        """The flag round-trips through settings.json."""
        import json
        from scan2text.models.settings import AppSettings
        from scan2text.services.path_service import PathService
        from scan2text.services.settings_service import SettingsService

        paths = PathService(base_dir=str(tmp_path))
        svc = SettingsService(path_service=paths)

        settings = svc.load()
        settings.enhance_image_quality = True
        svc.save(settings)

        raw = json.loads(paths.settings_path.read_text(encoding="utf-8"))
        assert raw["enhance_image_quality"] is True
