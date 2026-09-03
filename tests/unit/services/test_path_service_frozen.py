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
            assert svc.app_root == Path("C:/apps")

    def test_frozen_app_root_resolves_to_portable_root_without_models_dir(self, tmp_path):
        """Frozen: app_root must be portable root (exe_dir.parent) even when models/ is absent.

        The locked layout guarantees Scan2Text.exe and backend/ sit side-by-side.
        PathService._resolve_portable_root() anchors on models/ presence; without it,
        the fallback to exe_dir causes version.json lookups to fail.

        Layout:
          tmp_path/backend/scan2text-backend.exe   (exe)
          (NO models/ directory — first-run or Delta QA 1.3 scenario)

        Expected fix: app_root = tmp_path (parent of backend/), NOT tmp_path/backend.
        """
        from scan2text.services.path_service import PathService

        exe_dir = tmp_path / "backend"
        exe_dir.mkdir()
        fake_exe = exe_dir / "scan2text-backend.exe"

        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(fake_exe), create=True):
            svc = PathService()
            # app_root must be the portable root (tmp_path), NOT exe_dir
            assert svc.app_root == tmp_path

    def test_frozen_base_dir_is_portable_root(self):
        """S63a: frozen base_dir = portable root (parent of backend exe folder)."""
        from scan2text.services.path_service import PathService
        fake_exe = Path("C:/apps/scan2text-backend/scan2text-backend.exe")
        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(fake_exe), create=True):
            svc = PathService()
            assert svc.base_dir == Path("C:/apps")

    def test_non_frozen_behavior_uses_repo_root(self):
        """S63-FIX: dev mode uses repo root, NOT .scan2text subdir."""
        from scan2text.services.path_service import PathService
        with patch.object(sys, "frozen", False, create=True):
            svc = PathService()
            repo_root = Path(__file__).resolve().parents[3]
            expected_home = repo_root.resolve()
            assert svc.base_dir == expected_home
            # Dev mode: base_dir = app_root = repo root
            assert svc.app_root == expected_home

    def test_frozen_models_dir_under_portable_root(self):
        """S63a: frozen models_dir = portable root/models."""
        from scan2text.services.path_service import PathService
        fake_exe = Path("C:/apps/scan2text-backend/scan2text-backend.exe")
        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(fake_exe), create=True):
            svc = PathService()
            assert svc.models_dir == Path("C:/apps/models")

    def test_frozen_settings_path_at_portable_root(self):
        """S63a: frozen settings_path at portable root, NOT under backend/."""
        from scan2text.services.path_service import PathService
        fake_exe = Path("C:/apps/scan2text-backend/scan2text-backend.exe")
        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(fake_exe), create=True):
            svc = PathService()
            assert svc.settings_path == Path("C:/apps/settings/settings.json")

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
            # app_root = portable root (first ancestor with models/) = tmp_path/dist
            assert svc.app_root == tmp_path / "dist"

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

    def test_frozen_models_dir_uses_home(self, tmp_path):
        """S63a: frozen models_dir = home/models (parent of backend exe)."""
        from scan2text.services.path_service import PathService

        portable_root = tmp_path / "Scan2Text"
        backend_dir = portable_root / "backend"
        backend_dir.mkdir(parents=True)
        (portable_root / "models").mkdir()
        (portable_root / "models" / "vlm.gguf").write_bytes(b"model")
        (portable_root / "models" / "mmproj.gguf").write_bytes(b"mmproj")

        fake_exe = backend_dir / "scan2text-backend.exe"

        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(fake_exe), create=True):
            svc = PathService()
            # S63a: home = portable root (parent of backend exe)
            assert svc.base_dir == portable_root
            assert svc.models_dir == portable_root / "models"
            # Both model files must be found
            assert svc.resolve_model_path("vlm.gguf") == portable_root / "models" / "vlm.gguf"
            assert svc.resolve_model_path("mmproj.gguf") == portable_root / "models" / "mmproj.gguf"

    def test_frozen_output_dir_at_portable_root(self, tmp_path):
        """S63a: frozen output_dir = home/output."""
        from scan2text.services.path_service import PathService

        portable_root = tmp_path / "Scan2Text"
        backend_dir = portable_root / "backend"
        backend_dir.mkdir(parents=True)
        (portable_root / "models").mkdir()

        fake_exe = backend_dir / "scan2text-backend.exe"

        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(fake_exe), create=True):
            svc = PathService()
            assert svc.output_dir == portable_root / "output"

    def test_frozen_settings_and_logs_at_portable_root(self, tmp_path):
        """S63a: frozen settings_path, logs_dir at portable root."""
        from scan2text.services.path_service import PathService

        portable_root = tmp_path / "Scan2Text"
        backend_dir = portable_root / "backend"
        backend_dir.mkdir(parents=True)
        (portable_root / "models").mkdir()

        fake_exe = backend_dir / "scan2text-backend.exe"

        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(fake_exe), create=True):
            svc = PathService()
            assert svc.settings_path == portable_root / "settings" / "settings.json"
            assert svc.logs_dir == portable_root / "logs"

    def test_frozen_feedback_dir_at_portable_root(self, tmp_path):
        """S63a: frozen feedback_dir = home/feedback."""
        from scan2text.services.path_service import PathService

        portable_root = tmp_path / "Scan2Text"
        backend_dir = portable_root / "backend"
        backend_dir.mkdir(parents=True)
        (portable_root / "models").mkdir()

        fake_exe = backend_dir / "scan2text-backend.exe"

        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(fake_exe), create=True):
            svc = PathService()
            assert svc.feedback_dir == portable_root / "feedback"

    def test_frozen_app_root_resolves_to_portable_root(self, tmp_path):
        """Frozen: app_root must return the portable root (first ancestor with models/).

        Layout:
          tmp_path/models/                      (portable root — has models)
          tmp_path/backend/app.exe              (exe)

        Current bug: app_root = exe_dir = tmp_path/backend.
        Expected fix: app_root = tmp_path (where models/ lives).
        """
        from scan2text.services.path_service import PathService

        # Portable root with models/
        (tmp_path / "models").mkdir()
        (tmp_path / "models" / "vlm.gguf").write_bytes(b"model")

        # Exe inside backend/ subdirectory
        exe_dir = tmp_path / "backend"
        exe_dir.mkdir()
        fake_exe = exe_dir / "scan2text-backend.exe"

        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(fake_exe), create=True):
            svc = PathService()
            # app_root must be the portable root (tmp_path), NOT exe_dir
            assert svc.app_root == tmp_path
