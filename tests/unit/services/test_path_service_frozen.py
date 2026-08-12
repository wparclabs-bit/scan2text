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

    def test_frozen_settings_path_under_exe_parent(self):
        from scan2text.services.path_service import PathService
        fake_exe = Path("C:/apps/scan2text-backend/scan2text-backend.exe")
        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(fake_exe), create=True):
            svc = PathService()
            assert svc.settings_path == Path("C:/apps/scan2text-backend/settings/settings.json")
