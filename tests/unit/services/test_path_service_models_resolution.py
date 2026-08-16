"""RED regression tests — PathService models_dir priority resolution.

These tests verify every branch of the locked priority:
  1. env SCAN2TEXT_MODELS_DIR if set+valid
  2. env SCAN2TEXT_MODELS_DIR if set+invalid (raises RuntimeError)
  3. frozen: exe_dir TWO levels up when models/ exists (grandparent)
  4. frozen: exe_dir parent when models/ exists (parent)
  5. frozen: exe-adjacent fallback when no grandparent/parent models
  6. dev layout: cwd (non-frozen)
  7. missing-models error lists probed paths

TDD RED phase — these tests confirm the existing implementation.
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

from scan2text.services.path_service import PathService


class TestModelsDirEnvVarValid:
    """Priority 1: SCAN2TEXT_MODELS_DIR env var (set + valid directory)."""

    def test_env_valid_returns_env_path(self, tmp_path):
        """Env var pointing to existing dir should be returned as-is."""
        models_dir = tmp_path / "custom_models"
        models_dir.mkdir()
        original = os.environ.get("SCAN2TEXT_MODELS_DIR")
        try:
            os.environ["SCAN2TEXT_MODELS_DIR"] = str(models_dir)
            svc = PathService()
            assert svc.models_dir == models_dir.resolve()
        finally:
            if original is None:
                os.environ.pop("SCAN2TEXT_MODELS_DIR", None)
            else:
                os.environ["SCAN2TEXT_MODELS_DIR"] = original


class TestModelsDirEnvVarInvalid:
    """Priority 1 edge: SCAN2TEXT_MODELS_DIR set but non-existent."""

    def test_env_nonexistent_raises_runtime_error(self):
        """Invalid env path must raise RuntimeError listing probed locations."""
        fake_path = "/definitely/not/a/real/path/models"
        with patch.object(sys, "frozen", False, create=True):
            os.environ["SCAN2TEXT_MODELS_DIR"] = fake_path
            try:
                with pytest.raises(RuntimeError) as exc_info:
                    svc = PathService()
                    _ = svc.models_dir
                err_msg = str(exc_info.value)
                assert fake_path in err_msg
                # Must list fallback locations for troubleshooting
                assert "SCAN2TEXT_MODELS_DIR=" in err_msg
                assert "dev root=" in err_msg
            finally:
                os.environ.pop("SCAN2TEXT_MODELS_DIR", None)

    def test_env_nonexistent_includes_frozen_paths_when_frozen(self):
        """When frozen + invalid env, error lists frozen paths too."""
        fake_path = "/bad/env/path"
        with patch.object(sys, "frozen", True, create=True):
            with patch.object(sys, "executable", "/tmp/app.exe", create=True):
                os.environ["SCAN2TEXT_MODELS_DIR"] = fake_path
                try:
                    with pytest.raises(RuntimeError) as exc_info:
                        svc = PathService()
                        _ = svc.models_dir
                    err_msg = str(exc_info.value)
                    assert fake_path in err_msg
                    assert "frozen grandparent=" in err_msg
                    assert "frozen parent=" in err_msg
                finally:
                    os.environ.pop("SCAN2TEXT_MODELS_DIR", None)


class TestModelsDirFrozenGrandparent:
    """Priority 2: frozen exe_dir.parent.parent (TWO levels up) when models/ exists."""

    def test_grandparent_has_models_is_chosen(self, tmp_path):
        """Grandparent contains models/ — should be selected over parent."""
        # tmp_path/models exists, tmp_path/exe/ has no models
        (tmp_path / "models").mkdir()
        exe_dir = tmp_path / "exe"
        exe_dir.mkdir()
        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(exe_dir / "app.exe"), create=True):
            svc = PathService()
            assert svc.models_dir == tmp_path / "models"

    def test_grandparent_no_models_parent_has_models(self, tmp_path):
        """Grandparent lacks models/ — falls to parent if parent has it."""
        exe_dir = tmp_path / "exe"
        exe_dir.mkdir()
        (exe_dir / "models").mkdir()
        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(exe_dir / "app.exe"), create=True):
            svc = PathService()
            assert svc.models_dir == exe_dir / "models"


class TestModelsDirFrozenExeAdjacent:
    """Priority 3: exe-adjacent models/ when grandparent+parent both lack."""

    def test_only_exe_has_models(self, tmp_path):
        """Only exe-adjacent has models/ — should be returned."""
        exe_dir = tmp_path
        (exe_dir / "models").mkdir()
        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(exe_dir / "app.exe"), create=True):
            svc = PathService()
            assert svc.models_dir == exe_dir / "models"

    def test_no_models_anywhere_creates_under_exe(self, tmp_path):
        """No models/ found anywhere — falls to exe_dir/models (auto-create)."""
        exe_dir = tmp_path / "exe"
        exe_dir.mkdir()
        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(exe_dir / "app.exe"), create=True):
            svc = PathService()
            assert svc.models_dir == exe_dir / "models"


class TestModelsDirDevRoot:
    """Priority 4: dev layout — cwd when not frozen."""

    def test_non_frozen_returns_cwd(self, tmp_path):
        """Non-frozen mode uses cwd as models base."""
        original_cwd = os.getcwd()
        try:
            os.chdir(tmp_path)
            with patch.object(sys, "frozen", False, create=True):
                svc = PathService()
                assert svc.models_dir == tmp_path / "models"
        finally:
            os.chdir(original_cwd)

    def test_non_frozen_env_overrides_cwd(self, tmp_path):
        """Env var overrides dev cwd even when not frozen."""
        custom = tmp_path / "env_models"
        custom.mkdir()
        original = os.environ.get("SCAN2TEXT_MODELS_DIR")
        original_cwd = os.getcwd()
        try:
            os.chdir(tmp_path)
            os.environ["SCAN2TEXT_MODELS_DIR"] = str(custom)
            with patch.object(sys, "frozen", False, create=True):
                svc = PathService()
                assert svc.models_dir == custom.resolve()
        finally:
            os.environ.pop("SCAN2TEXT_MODELS_DIR", None)
            os.chdir(original_cwd)


class TestModelsDirMissingErrorProbedPaths:
    """Error path: missing models lists ALL probed locations."""

    def test_env_missing_error_lists_all_paths(self):
        """RuntimeError must enumerate every path that was probed."""
        with patch.object(sys, "frozen", False, create=True):
            os.environ["SCAN2TEXT_MODELS_DIR"] = "/no/such/path"
            try:
                with pytest.raises(RuntimeError) as exc_info:
                    svc = PathService()
                    _ = svc.models_dir
                err_msg = str(exc_info.value)
                # Should list env var path
                assert "/no/such/path" in err_msg
                # Should list fallback paths for debugging
                assert "dev root=" in err_msg
            finally:
                os.environ.pop("SCAN2TEXT_MODELS_DIR", None)

    def test_frozen_env_missing_lists_frozen_paths(self):
        """Frozen + invalid env: error lists frozen grandparent + parent."""
        # Use a Windows-style path to avoid forward-slash normalization quirks
        fake_exe = "C:/apps/scan2text/scan2text-backend.exe"
        with patch.object(sys, "frozen", True, create=True):
            with patch.object(sys, "executable", fake_exe, create=True):
                os.environ["SCAN2TEXT_MODELS_DIR"] = "/bad/path"
                try:
                    with pytest.raises(RuntimeError) as exc_info:
                        svc = PathService()
                        _ = svc.models_dir
                    err_msg = str(exc_info.value)
                    assert "/bad/path" in err_msg
                    # grandparent = C:/apps, parent = C:/apps/scan2text
                    assert "frozen grandparent=" in err_msg
                    assert "frozen parent=" in err_msg
                    # Use re.search to handle forward/backslash path normalization on Windows
                    assert re.search(r"apps[/\\]models", err_msg)
                    assert re.search(r"apps[/\\]scan2text[/\\]models", err_msg)
                finally:
                    os.environ.pop("SCAN2TEXT_MODELS_DIR", None)


class TestModelsDirInjectedAppRoot:
    """Injected app_root bypasses priority resolution."""

    def test_injected_app_root_models(self, tmp_path):
        """When app_root injected, models_dir = app_root/models."""
        svc = PathService(base_dir=str(tmp_path / "base"), app_root=str(tmp_path / "custom"))
        assert svc.models_dir == tmp_path / "custom" / "models"

    def test_base_dir_only_app_root_from_base(self, tmp_path):
        """When only base_dir set, app_root = base_dir, models = base_dir/models."""
        svc = PathService(base_dir=str(tmp_path))
        assert svc.models_dir == tmp_path / "models"
