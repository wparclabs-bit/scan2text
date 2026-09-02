"""Unit tests for PathService models_dir resolution priority.

Priority:
  1. env SCAN2TEXT_MODELS_DIR if set and exists
  2. frozen: exe_dir.parent.parent when models/ exists there
  3. frozen: exe-adjacent (parent) when models/ exists
  4. dev root unchanged
  Error: lists probed paths when models dir missing.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

from scan2text.services.path_service import PathService


class TestModelsDirPriority:
    """Priority 1: SCAN2TEXT_MODELS_DIR env var."""

    def test_env_scan2text_models_dir_takes_priority(self, tmp_path):
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

    def test_env_scan2text_models_dir_over_frozen(self, tmp_path):
        """SCAN2TEXT_MODELS_DIR takes priority even in frozen mode."""
        models_dir = tmp_path / "env_models"
        models_dir.mkdir()
        # Create frozen dir structure
        frozen_parent = tmp_path / "frozen_exe"
        frozen_parent.mkdir()
        (frozen_parent / "models").mkdir()
        original_env = os.environ.get("SCAN2TEXT_MODELS_DIR")
        try:
            os.environ["SCAN2TEXT_MODELS_DIR"] = str(models_dir)
            with patch.object(sys, "frozen", True, create=True), \
                 patch.object(sys, "executable", str(frozen_parent / "app.exe"), create=True):
                svc = PathService()
                assert svc.models_dir == models_dir.resolve()
        finally:
            if original_env is None:
                os.environ.pop("SCAN2TEXT_MODELS_DIR", None)
            else:
                os.environ["SCAN2TEXT_MODELS_DIR"] = original_env


class TestModelsDirFrozenGrandparent:
    """Priority 2: frozen home = parent of backend exe folder."""

    def test_frozen_grandparent_has_models(self, tmp_path):
        # Structure: tmp_path/models, tmp_path/exe/app.exe
        # S63a: frozen home = parent of backend exe = tmp_path
        (tmp_path / "models").mkdir()
        exe_dir = tmp_path / "exe"
        exe_dir.mkdir()
        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(exe_dir / "app.exe"), create=True):
            svc = PathService()
            # Home = tmp_path (parent of exe_dir), models_dir = tmp_path/models
            assert svc.models_dir == tmp_path / "models"

    def test_frozen_grandparent_no_models_parent_has_models(self, tmp_path):
        # Structure: tmp_path (no models), tmp_path/exe/models, tmp_path/exe/app.exe
        # S63a: frozen home = parent of backend exe = tmp_path (regardless of models location)
        exe_dir = tmp_path / "exe"
        exe_dir.mkdir()
        (exe_dir / "models").mkdir()
        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(exe_dir / "app.exe"), create=True):
            svc = PathService()
            # Home = tmp_path (parent of exe_dir), models_dir = tmp_path/models
            assert svc.models_dir == tmp_path / "models"

    def test_frozen_grandparent_no_models_no_parent(self, tmp_path):
        # Structure: tmp_path (no models), tmp_path/exe (no models), tmp_path/exe/app.exe
        # S63a: frozen home = parent of backend exe = tmp_path
        exe_dir = tmp_path / "exe"
        exe_dir.mkdir()
        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(exe_dir / "app.exe"), create=True):
            svc = PathService()
            # Home = tmp_path (parent of exe_dir), models_dir = tmp_path/models
            assert svc.models_dir == tmp_path / "models"


class TestModelsDirExeAdjacent:
    """Priority 3: frozen home = parent of backend exe folder."""

    def test_frozen_exe_adjacent_models_only(self, tmp_path):
        # exe at tmp_path/exe/app.exe, home = tmp_path (parent of exe_dir)
        exe_dir = tmp_path / "exe"
        exe_dir.mkdir()
        (tmp_path / "models").mkdir()
        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(exe_dir / "app.exe"), create=True):
            svc = PathService()
            # Home = tmp_path (parent of exe_dir), models_dir = tmp_path/models
            assert svc.models_dir == tmp_path / "models"


class TestModelsDirDevRoot:
    """Priority 4: dev fallback = repo-root .scan2text."""

    def test_non_frozen_models_is_repo_scan2text(self):
        with patch.object(sys, "frozen", False, create=True):
            svc = PathService()
            # S63a: dev fallback = repo-root .scan2text, NOT cwd
            repo_root = Path(__file__).resolve().parents[3]
            expected_home = repo_root / ".scan2text"
            assert svc.models_dir == expected_home.resolve() / "models"


class TestModelsDirMissingError:
    """Error: lists probed paths when models dir missing."""

    def test_env_scan2text_models_dir_missing_lists_paths(self):
        with patch.object(sys, "frozen", False, create=True):
            os.environ["SCAN2TEXT_MODELS_DIR"] = "/nonexistent/models"
            try:
                with pytest.raises(RuntimeError) as exc_info:
                    svc = PathService()
                    _ = svc.models_dir
                err_msg = str(exc_info.value)
                assert "/nonexistent/models" in err_msg
                # S63a: error lists home/models, not dev root
                assert "home/models=" in err_msg
            finally:
                os.environ.pop("SCAN2TEXT_MODELS_DIR", None)
