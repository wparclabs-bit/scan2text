"""Tests for VLM OCR adapter — fully mocked, no real GGUF loading."""

from __future__ import annotations

import json
import queue
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest


@pytest.fixture
def settings_with_model(tmp_path):
    """Create a temporary settings.json containing a model_path."""
    (tmp_path / "settings").mkdir(parents=True, exist_ok=True)
    data = {
        "output_dir": str(tmp_path / "output"),
        "max_pdf_pages": 20,
        "cpu_threads": 0,
        "check_updates_on_startup": True,
        "model_path": str(tmp_path / "models" / "llava.gguf"),
    }
    (tmp_path / "settings" / "settings.json").write_text(json.dumps(data), encoding="utf-8")
    return tmp_path


class TestVlmOcrPersistentWorkerSpawn:
    def test_spawns_worker_once_and_sets_priority(self, tmp_scan2text):
        """Test 1: Verify that on init/start the worker process is spawned ONCE
        and its priority is set via psutil.Process."""
        settings_data = {
            "output_dir": "",
            "max_pdf_pages": 20,
            "cpu_threads": 0,
            "check_updates_on_startup": True,
            "model_path": "/fake/path/to/model.gguf",
        }
        settings_file = tmp_scan2text / "settings" / "settings.json"
        settings_file.write_text(json.dumps(settings_data), encoding="utf-8")

        mock_process_instance = MagicMock()
        mock_process_instance.pid = 12345

        mock_psutil_process = MagicMock()

        with patch("scan2text.adapters.vlm_ocr.SettingsService") as MockSettingsSvc, \
             patch("scan2text.adapters.vlm_ocr.Process", return_value=mock_process_instance), \
             patch("scan2text.adapters.vlm_ocr.psutil") as mock_psutil:
            mock_psutil.Process.return_value = mock_psutil_process
            mock_psutil.BELOW_NORMAL_PRIORITY_CLASS = 64

            mock_svc_instance = MagicMock()
            from scan2text.models.settings import AppSettings
            mock_svc_instance.load.return_value = AppSettings(**settings_data)
            MockSettingsSvc.return_value = mock_svc_instance

            from scan2text.adapters.vlm_ocr import VlmOcrAdapter
            adapter = VlmOcrAdapter()

            # Worker process should have been spawned exactly once
            mock_process_instance.start.assert_called_once()
            # psutil should be used to set priority on the worker PID
            mock_psutil.Process.assert_called_with(12345)
            mock_psutil_process.nice.assert_called_once_with(64)


class TestVlmOcrPersistentWorkerQueues:
    def test_multiple_ocr_calls_use_same_worker_queues(self, tmp_scan2text):
        """Test 2: Calling .ocr() multiple times sends payloads to input_queue
        and receives results from output_queue — no new processes spawned."""
        settings_data = {
            "output_dir": "",
            "max_pdf_pages": 20,
            "cpu_threads": 0,
            "check_updates_on_startup": True,
            "model_path": str(tmp_scan2text / "models" / "model.gguf"),
        }
        settings_file = tmp_scan2text / "settings" / "settings.json"
        settings_file.write_text(json.dumps(settings_data), encoding="utf-8")

        image_path_1 = tmp_scan2text / "input1.png"
        image_path_1.write_bytes(b"fake-image-bytes-1")
        image_path_2 = tmp_scan2text / "input2.png"
        image_path_2.write_bytes(b"fake-image-bytes-2")

        expected_md_1 = "# OCR Result 1"
        expected_md_2 = "# OCR Result 2"

        mock_input_queue = MagicMock()
        mock_output_queue = MagicMock()
        mock_output_queue.get.side_effect = [expected_md_1, expected_md_2]

        mock_process_instance = MagicMock()
        mock_process_instance.pid = 99

        with patch("scan2text.adapters.vlm_ocr.SettingsService") as MockSettingsSvc, \
             patch("scan2text.adapters.vlm_ocr.Process", return_value=mock_process_instance), \
             patch("scan2text.adapters.vlm_ocr.Queue", side_effect=[mock_input_queue, mock_output_queue]), \
             patch("scan2text.adapters.vlm_ocr.psutil") as mock_psutil, \
              patch("scan2text.adapters.vlm_ocr._shrink_to_png", side_effect=lambda b: b), \
              patch("scan2text.adapters.vlm_ocr._tile_image", side_effect=lambda img: [b"fake-image-bytes-1" if img.size == (80, 60) else b"fake-image-bytes-2"]), \
              patch("PIL.Image.open") as mock_img_open:
            mock_img_open.return_value.convert.return_value.size = (80, 60)
            mock_img_open.return_value.convert.return_value.__enter__ = lambda s: s
            mock_img_open.return_value.convert.return_value.__exit__ = lambda s, *a: None
            mock_psutil.Process.return_value = MagicMock()
            mock_psutil.BELOW_NORMAL_PRIORITY_CLASS = 64

            mock_svc_instance = MagicMock()
            from scan2text.models.settings import AppSettings
            mock_svc_instance.load.return_value = AppSettings(**settings_data)
            MockSettingsSvc.return_value = mock_svc_instance

            from scan2text.adapters.vlm_ocr import VlmOcrAdapter
            adapter = VlmOcrAdapter()

            result_1 = adapter.ocr(str(image_path_1))
            result_2 = adapter.ocr(str(image_path_2))

        assert result_1 == expected_md_1
        assert result_2 == expected_md_2

        # Both OCR calls should use the same input/output queues (no new processes)
        assert mock_input_queue.put.call_count == 2
        assert mock_output_queue.get.call_count == 2
        # Only one Process was created during init
        mock_process_instance.start.assert_called_once()


class TestVlmOcrTimeoutHandling:
    def test_timeout_returns_error_dict_without_killing_worker(self, tmp_scan2text):
        """Test 3: When output_queue.get(timeout=180) raises queue.Empty,
        catch it, do NOT kill the worker, and return the OCR_TIMEOUT error dict."""
        settings_data = {
            "output_dir": "",
            "max_pdf_pages": 20,
            "cpu_threads": 0,
            "check_updates_on_startup": True,
            "model_path": str(tmp_scan2text / "models" / "model.gguf"),
        }
        settings_file = tmp_scan2text / "settings" / "settings.json"
        settings_file.write_text(json.dumps(settings_data), encoding="utf-8")

        image_path = tmp_scan2text / "input.png"
        image_path.write_bytes(b"fake-image-bytes")

        mock_input_queue = MagicMock()
        mock_output_queue = MagicMock()
        mock_output_queue.get.side_effect = queue.Empty()

        mock_process_instance = MagicMock()
        mock_process_instance.pid = 77

        with patch("scan2text.adapters.vlm_ocr.SettingsService") as MockSettingsSvc, \
             patch("scan2text.adapters.vlm_ocr.Process", return_value=mock_process_instance), \
             patch("scan2text.adapters.vlm_ocr.Queue", side_effect=[mock_input_queue, mock_output_queue]), \
              patch("scan2text.adapters.vlm_ocr.psutil") as mock_psutil, \
              patch("scan2text.adapters.vlm_ocr._shrink_to_png", side_effect=lambda b: b), \
              patch("scan2text.adapters.vlm_ocr._tile_image", side_effect=lambda img: [b"fake-image-bytes"]), \
              patch("PIL.Image.open") as mock_img_open:
            mock_img_open.return_value.convert.return_value.size = (80, 60)
            mock_img_open.return_value.convert.return_value.__enter__ = lambda s: s
            mock_img_open.return_value.convert.return_value.__exit__ = lambda s, *a: None
            mock_psutil.Process.return_value = MagicMock()
            mock_psutil.BELOW_NORMAL_PRIORITY_CLASS = 64

            mock_svc_instance = MagicMock()
            from scan2text.models.settings import AppSettings
            mock_svc_instance.load.return_value = AppSettings(**settings_data)
            MockSettingsSvc.return_value = mock_svc_instance

            from scan2text.adapters.vlm_ocr import VlmOcrAdapter
            adapter = VlmOcrAdapter()
            result = adapter.ocr(str(image_path))

        assert isinstance(result, dict)
        assert result["error"] == "OCR_TIMEOUT"
        # Worker must NOT be terminated — it is persistent
        mock_process_instance.terminate.assert_not_called()
        mock_process_instance.join.assert_not_called()


def test_ocr_pdf_uses_rendered_pages():
    from unittest.mock import MagicMock, patch

    from scan2text.models.settings import AppSettings

    with patch("scan2text.adapters.vlm_ocr.SettingsService") as MockSS, \
         patch("scan2text.adapters.vlm_ocr.Process") as MockProc, \
         patch("scan2text.adapters.vlm_ocr.psutil") as mock_psutil:
        mock_psutil.BELOW_NORMAL_PRIORITY_CLASS = 64
        mock_svc = MagicMock()
        mock_svc.load.return_value = AppSettings()
        MockSS.return_value = mock_svc
        MockProc.return_value = MagicMock()

        from scan2text.adapters.vlm_ocr import VlmOcrAdapter

        adapter = VlmOcrAdapter()
        adapter._render_pdf = lambda p: [b"png1", b"png2"]
        adapter._input_queue = MagicMock()
        adapter._output_queue = MagicMock()
        adapter._output_queue.get.return_value = "# md"

        result = adapter.ocr("whatever.pdf")
        assert result == "# md"
        sent = adapter._input_queue.put.call_args[0][0]
        assert sent["images"] == [b"png1", b"png2"]


def test_tile_image_splits_wide_images():
    from PIL import Image

    from scan2text.adapters.vlm_ocr import _tile_image

    wide = Image.new("RGB", (2300, 1000), "white")
    assert len(_tile_image(wide)) == 2


def test_tile_image_keeps_portrait_single():
    from PIL import Image

    from scan2text.adapters.vlm_ocr import _tile_image

    tall = Image.new("RGB", (1000, 1400), "white")
    assert len(_tile_image(tall)) == 1


def test_worker_is_daemon_so_parent_can_exit():
    from unittest.mock import MagicMock, patch

    from scan2text.models.settings import AppSettings

    with patch("scan2text.adapters.vlm_ocr.SettingsService") as MockSS, \
         patch("scan2text.adapters.vlm_ocr.Process") as MockProc, \
         patch("scan2text.adapters.vlm_ocr.psutil") as mock_psutil:
        mock_psutil.BELOW_NORMAL_PRIORITY_CLASS = 64
        mock_svc = MagicMock()
        mock_svc.load.return_value = AppSettings()
        MockSS.return_value = mock_svc
        mock_proc = MagicMock()
        MockProc.return_value = mock_proc

        from scan2text.adapters.vlm_ocr import VlmOcrAdapter

        VlmOcrAdapter()
        assert mock_proc.daemon is True
        mock_proc.start.assert_called_once()
