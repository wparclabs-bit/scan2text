"""Unit tests for PathService frozen behavior."""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import patch

import pytest


class TestPathServiceFrozen:
    def test_frozen_app_root_is_exe_parent(self):
        from scan2text.services.path_service import PathService
        fake_exe = Path("C:/apps/scan2text-backend/scan2text-backend.exe")
        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(fake_exe), create=True):
            svc = PathService()
            assert svc.app_root == Path("C:/apps/scan2text-backend")

    def test_frozen_base_dir_is_exe_parent(self):
        from scan2text.services.path_service import PathService
        fake_exe = Path("C:/apps/scan2text-backend/scan2text-backend.exe")
        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(fake_exe), create=True):
            svc = PathService()
            assert svc.base_dir == Path("C:/apps/scan2text-backend")

    def test_non_frozen_behavior_unchanged(self):
        from scan2text.services.path_service import PathService
        with patch.object(sys, "frozen", False, create=True):
            svc = PathService()
            assert ".scan2text" in str(svc.base_dir)
            # In non-frozen mode, app_root defaults to cwd, base_dir to cwd/.scan2text
            assert svc.app_root == Path.cwd()
            assert svc.base_dir == Path.cwd() / ".scan2text"

    def test_frozen_models_dir_under_exe_parent(self):
        from scan2text.services.path_service import PathService
        fake_exe = Path("C:/apps/scan2text-backend/scan2text-backend.exe")
        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(fake_exe), create=True):
            svc = PathService()
            assert svc.models_dir == Path("C:/apps/scan2text-backend/models")

    def test_frozen_settings_path_under_exe_parent_when_no_models_above(self):
        """When no models/ exists above exe_dir, falls back to exe_parent (legacy behavior)."""
        from scan2text.services.path_service import PathService
        fake_exe = Path("C:/apps/scan2text-backend/scan2text-backend.exe")
        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(fake_exe), create=True):
            svc = PathService()
            # No models/ ancestor — _resolve_portable_root falls back to exe_dir
            assert svc.settings_path == Path("C:/apps/scan2text-backend/settings/settings.json")

    def test_resolve_model_path_frozen_uses_models_dir(self, tmp_path):
        """Frozen: resolve_model_path must resolve relative to models_dir, not app_root.

        The current bug: resolve_model_path returns self.app_root / relative
        but models live in models_dir (which may differ from app_root in frozen builds).

        Layout: tmp_path/dist/models/   (code's "grandparent" = exe_dir.parent)
                tmp_path/dist/backend/app.exe
        """
        from scan2text.services.path_service import PathService

        # Place models at code's "grandparent" level: exe_dir.parent
        models_dir = tmp_path / "dist" / "models"
        models_dir.mkdir(parents=True)
        (models_dir / "vlm.gguf").write_text("dummy")

        exe_dir = tmp_path / "dist" / "backend"
        exe_dir.mkdir(parents=True)

        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(exe_dir / "app.exe"), create=True):
            svc = PathService()

            # models_dir resolves to code's grandparent = tmp_path/dist/models
            assert svc.models_dir == tmp_path / "dist" / "models"
            # app_root = exe dir (NOT where models live)
            assert svc.app_root == exe_dir

            # The fix: resolve_model_path should use models_dir, not app_root
            result = svc.resolve_model_path("vlm.gguf")
            assert result == tmp_path / "dist" / "models" / "vlm.gguf"

    def test_resolve_model_path_frozen_with_subdir(self, tmp_path):
        """Frozen: resolve_model_path('models/vlm.gguf') -> <models_dir>/vlm.gguf."""
        from scan2text.services.path_service import PathService

        models_dir = tmp_path / "dist" / "models"
        models_dir.mkdir(parents=True)
        (models_dir / "vlm.gguf").write_text("dummy")

        exe_dir = tmp_path / "dist" / "backend"
        exe_dir.mkdir(parents=True)

        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(exe_dir / "app.exe"), create=True):
            svc = PathService()

            # Path with subdir prefix — should extract filename, resolve under models_dir
            result = svc.resolve_model_path("models/vlm.gguf")
            assert result == tmp_path / "dist" / "models" / "vlm.gguf"

    def test_resolve_model_path_absolute_passthrough(self):
        """Absolute paths must be returned as-is regardless of frozen state."""
        from scan2text.services.path_service import PathService
        fake_exe = Path("C:/apps/scan2text-backend/scan2text-backend.exe")
        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(fake_exe), create=True):
            svc = PathService()
            # Use UNC-style absolute path to avoid Windows normalization
            result = svc.resolve_model_path(r"\\server\models\model.gguf")
            assert result == Path(r"\\server\models\model.gguf")

    def test_frozen_models_dir_grandparent_when_dist_layout(self, tmp_path):
        """Frozen: models at project-root (exe_dir.parent.parent) not exe_dir.parent.

        Layout:
          tmp_path/dist/scan2text-backend/scan2text-backend.exe   (exe)
          tmp_path/models/                                        (models — TRUE grandparent)

        Current bug: _resolve_models_dir uses exe_dir.parent (= tmp_path/dist)
        instead of exe_dir.parent.parent (= tmp_path), so files_present stays false.
        """
        from scan2text.services.path_service import PathService

        # Models live at project root (grandparent of exe)
        models_dir = tmp_path / "models"
        models_dir.mkdir()
        (models_dir / "vlm.gguf").write_bytes(b"model")
        (models_dir / "mmproj.gguf").write_bytes(b"mmproj")

        # Exe is nested one level deeper: dist/scan2text-backend/
        exe_dir = tmp_path / "dist" / "scan2text-backend"
        exe_dir.mkdir(parents=True)

        fake_exe = exe_dir / "scan2text-backend.exe"

        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(fake_exe), create=True):
            svc = PathService()
            # The fix: models_dir must resolve to tmp_path/models (grandparent),
            # NOT tmp_path/dist/models (parent — the current bug).
            assert svc.models_dir == models_dir
            # Both model files must be found
            assert svc.resolve_model_path("vlm.gguf") == models_dir / "vlm.gguf"
            assert svc.resolve_model_path("mmproj.gguf") == models_dir / "mmproj.gguf"

    def test_frozen_output_dir_resolves_to_portable_root(self, tmp_path):
        """Frozen: output_dir must land at portable root (first ancestor with models/).

        Layout:
          tmp_path/models/                    (portable root — has models)
          tmp_path/dist/scan2text-backend/app.exe  (exe)

        Current bug: output_dir = exe_dir / "output" = tmp_path/dist/scan2text-backend/output.
        Expected fix: output_dir = tmp_path/output.
        """
        from scan2text.services.path_service import PathService

        # Portable root with models/
        models_dir = tmp_path / "models"
        models_dir.mkdir()
        (models_dir / "vlm.gguf").write_bytes(b"model")

        # Exe nested two levels deep
        exe_dir = tmp_path / "dist" / "scan2text-backend"
        exe_dir.mkdir(parents=True)
        fake_exe = exe_dir / "scan2text-backend.exe"

        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(fake_exe), create=True):
            svc = PathService()
            # models_dir resolves to portable root (grandparent of exe)
            assert svc.models_dir == tmp_path / "models"
            # output_dir must be at portable root, NOT inside dist/
            assert svc.output_dir == tmp_path / "output"

    def test_frozen_settings_and_logs_resolve_to_portable_root(self, tmp_path):
        """Frozen: settings_path, logs_dir must land at portable root.

        Layout:
          tmp_path/models/                      (portable root — has models)
          tmp_path/dist/scan2text-backend/app.exe  (exe)

        Current bug: settings_path = exe_dir/settings/settings.json,
        logs_dir = exe_dir/logs — both inside dist/, not at portable root.
        Expected fix: both under tmp_path/.
        """
        from scan2text.services.path_service import PathService

        # Portable root with models/
        models_dir = tmp_path / "models"
        models_dir.mkdir()
        (models_dir / "vlm.gguf").write_bytes(b"model")

        # Exe nested two levels deep
        exe_dir = tmp_path / "dist" / "scan2text-backend"
        exe_dir.mkdir(parents=True)
        fake_exe = exe_dir / "scan2text-backend.exe"

        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(fake_exe), create=True):
            svc = PathService()
            # settings_path must be at portable root, NOT inside dist/
            assert svc.settings_path == tmp_path / "settings" / "settings.json"
            # logs_dir must be at portable root, NOT inside dist/
            assert svc.logs_dir == tmp_path / "logs"

    def test_frozen_feedback_dir_resolves_to_portable_root(self, tmp_path):
        """Frozen: feedback_dir must land at portable root.

        Layout:
          tmp_path/models/                      (portable root — has models)
          tmp_path/dist/scan2text-backend/app.exe  (exe)
        """
        from scan2text.services.path_service import PathService

        models_dir = tmp_path / "models"
        models_dir.mkdir()
        (models_dir / "vlm.gguf").write_bytes(b"model")

        exe_dir = tmp_path / "dist" / "scan2text-backend"
        exe_dir.mkdir(parents=True)
        fake_exe = exe_dir / "scan2text-backend.exe"

        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(fake_exe), create=True):
            svc = PathService()
            # feedback_dir must be at portable root, NOT inside dist/
            assert svc.feedback_dir == tmp_path / "feedback"
