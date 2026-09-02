"""RED regression tests — PathService portable home contract (S63a).

Verifies the explicit portable home escort contract:
  1. SCAN2TEXT_HOME env var wins.
  2. Frozen: portable root = parent of backend executable folder.
  3. Dev fallback: repo-root .scan2text (NOT cwd-based).

Rules:
  - Always absolute paths.
  - Never use cwd as portable home.
  - Never create settings inside backend/.
  - All core paths derive from a single resolve_home().
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

from scan2text.services.path_service import PathService


class TestEnvHomeWins:
    """Priority 1: SCAN2TEXT_HOME environment variable wins."""

    def test_env_home_wins_settings_path(self, tmp_path):
        """When SCAN2TEXT_HOME points to a temp directory,
        settings_path is temp/settings/settings.json."""
        original = os.environ.get("SCAN2TEXT_HOME")
        try:
            os.environ["SCAN2TEXT_HOME"] = str(tmp_path)
            svc = PathService()
            assert svc.settings_path == tmp_path / "settings" / "settings.json"
        finally:
            if original is None:
                os.environ.pop("SCAN2TEXT_HOME", None)
            else:
                os.environ["SCAN2TEXT_HOME"] = original

    def test_env_home_wins_logs_path(self, tmp_path):
        """When SCAN2TEXT_HOME is set, logs_path resolves under it."""
        original = os.environ.get("SCAN2TEXT_HOME")
        try:
            os.environ["SCAN2TEXT_HOME"] = str(tmp_path)
            svc = PathService()
            assert svc.logs_path == tmp_path / "logs"
        finally:
            if original is None:
                os.environ.pop("SCAN2TEXT_HOME", None)
            else:
                os.environ["SCAN2TEXT_HOME"] = original

    def test_env_home_wins_output_path(self, tmp_path):
        """When SCAN2TEXT_HOME is set, output_path resolves under it."""
        original = os.environ.get("SCAN2TEXT_HOME")
        try:
            os.environ["SCAN2TEXT_HOME"] = str(tmp_path)
            svc = PathService()
            assert svc.output_path == tmp_path / "output"
        finally:
            if original is None:
                os.environ.pop("SCAN2TEXT_HOME", None)
            else:
                os.environ["SCAN2TEXT_HOME"] = original

    def test_env_home_wins_models_path(self, tmp_path):
        """When SCAN2TEXT_HOME is set, models_path resolves under it."""
        original = os.environ.get("SCAN2TEXT_HOME")
        try:
            os.environ["SCAN2TEXT_HOME"] = str(tmp_path)
            svc = PathService()
            assert svc.models_path == tmp_path / "models"
        finally:
            if original is None:
                os.environ.pop("SCAN2TEXT_HOME", None)
            else:
                os.environ["SCAN2TEXT_HOME"] = original

    def test_env_home_wins_feedback_path(self, tmp_path):
        """When SCAN2TEXT_HOME is set, feedback_path resolves under it."""
        original = os.environ.get("SCAN2TEXT_HOME")
        try:
            os.environ["SCAN2TEXT_HOME"] = str(tmp_path)
            svc = PathService()
            assert svc.feedback_path == tmp_path / "feedback"
        finally:
            if original is None:
                os.environ.pop("SCAN2TEXT_HOME", None)
            else:
                os.environ["SCAN2TEXT_HOME"] = original


class TestAllCorePathsUnderHome:
    """All core paths must resolve under the same portable home."""

    def test_all_core_paths_under_same_home(self, tmp_path):
        """logs, output, models, feedback all resolve under the same home."""
        home = tmp_path / "portable_home"
        home.mkdir()
        original = os.environ.get("SCAN2TEXT_HOME")
        try:
            os.environ["SCAN2TEXT_HOME"] = str(home)
            svc = PathService()
            assert svc.logs_path.parent == home
            assert svc.output_path.parent == home
            assert svc.models_path.parent == home
            assert svc.feedback_path.parent == home
            assert svc.settings_path.parent.parent == home
        finally:
            if original is None:
                os.environ.pop("SCAN2TEXT_HOME", None)
            else:
                os.environ["SCAN2TEXT_HOME"] = original


class TestSettingsNeverUnderBackendFolder:
    """settings_path must never contain a backend/settings segment."""

    def test_settings_not_under_backend_folder_frozen(self, tmp_path):
        """Frozen mode: settings_path must not be under backend/settings."""
        backend_dir = tmp_path / "backend"
        backend_dir.mkdir()
        fake_exe = backend_dir / "scan2text-backend.exe"
        original = os.environ.get("SCAN2TEXT_HOME")
        try:
            os.environ.pop("SCAN2TEXT_HOME", None)
            with patch.object(sys, "frozen", True, create=True), \
                 patch.object(sys, "executable", str(fake_exe), create=True):
                svc = PathService()
                # settings_path must be at portable root, not inside backend/
                assert svc.settings_path != backend_dir / "settings" / "settings.json"
                # The parent of settings.json should not be under backend/
                settings_parent = svc.settings_path.parent
                assert backend_dir not in settings_parent.resolve().parents
        finally:
            if original is None:
                os.environ.pop("SCAN2TEXT_HOME", None)
            else:
                os.environ["SCAN2TEXT_HOME"] = original

    def test_settings_not_under_backend_folder_dev(self, tmp_path):
        """Dev mode: settings_path must not be under a 'backend' segment."""
        original = os.environ.get("SCAN2TEXT_HOME")
        try:
            os.environ.pop("SCAN2TEXT_HOME", None)
            with patch.object(sys, "frozen", False, create=True):
                svc = PathService()
                settings_str = str(svc.settings_path)
                parts = settings_str.replace("\\", "/").split("/")
                # Find 'settings' in the path
                for i, part in enumerate(parts):
                    if part == "settings":
                        # The part before 'settings' should not be 'backend'
                        if i > 0 and parts[i - 1] == "backend":
                            pytest.fail(f"settings_path contains backend/settings: {settings_str}")
                        break
        finally:
            if original is None:
                os.environ.pop("SCAN2TEXT_HOME", None)
            else:
                os.environ["SCAN2TEXT_HOME"] = original


class TestPathsAreAbsolute:
    """All resolved paths must be absolute, not relative."""

    def test_settings_path_is_absolute(self, tmp_path):
        """settings_path must be absolute."""
        svc = PathService(base_dir=str(tmp_path))
        assert svc.settings_path.is_absolute()

    def test_logs_path_is_absolute(self, tmp_path):
        """logs_path must be absolute."""
        svc = PathService(base_dir=str(tmp_path))
        assert svc.logs_path.is_absolute()

    def test_output_path_is_absolute(self, tmp_path):
        """output_path must be absolute."""
        svc = PathService(base_dir=str(tmp_path))
        assert svc.output_path.is_absolute()

    def test_models_path_is_absolute(self, tmp_path):
        """models_path must be absolute."""
        svc = PathService(base_dir=str(tmp_path))
        assert svc.models_path.is_absolute()

    def test_feedback_path_is_absolute(self, tmp_path):
        """feedback_path must be absolute."""
        svc = PathService(base_dir=str(tmp_path))
        assert svc.feedback_path.is_absolute()

    def test_env_home_paths_are_absolute(self, tmp_path):
        """When SCAN2TEXT_HOME is set, all paths are absolute."""
        original = os.environ.get("SCAN2TEXT_HOME")
        try:
            os.environ["SCAN2TEXT_HOME"] = str(tmp_path)
            svc = PathService()
            assert svc.settings_path.is_absolute()
            assert svc.logs_path.is_absolute()
            assert svc.output_path.is_absolute()
            assert svc.models_path.is_absolute()
            assert svc.feedback_path.is_absolute()
        finally:
            if original is None:
                os.environ.pop("SCAN2TEXT_HOME", None)
            else:
                os.environ["SCAN2TEXT_HOME"] = original


class TestDevFallbackUsesDotScan2text:
    """Dev fallback: when no explicit home and not frozen,
    home falls back to repo .scan2text (NOT cwd-based)."""

    def test_dev_fallback_uses_repo_scan2text_not_cwd(self, tmp_path):
        """Dev mode without SCAN2TEXT_HOME must use repo .scan2text, not cwd."""
        original = os.environ.get("SCAN2TEXT_HOME")
        original_cwd = os.getcwd()
        try:
            os.environ.pop("SCAN2TEXT_HOME", None)
            with patch.object(sys, "frozen", False, create=True):
                # Change to a different directory
                os.chdir(tmp_path)
                svc = PathService()
                # The home should be based on repo root, NOT tmp_path (cwd)
                # Repo root is the parent of src/ (parents[3] from test file)
                repo_root = Path(__file__).resolve().parents[3]
                expected_home = repo_root / ".scan2text"
                assert svc.base_dir == expected_home.resolve(), (
                    f"Expected {expected_home}, got {svc.base_dir}. "
                    "Dev fallback must use repo .scan2text, not cwd."
                )
        finally:
            os.chdir(original_cwd)
            if original is None:
                os.environ.pop("SCAN2TEXT_HOME", None)
            else:
                os.environ["SCAN2TEXT_HOME"] = original


class TestFrozenFallbackUsesPortableRoot:
    """Frozen fallback: when frozen and no explicit home,
    home is the parent of the backend executable folder."""

    def test_frozen_home_is_parent_of_backend_exe_folder(self, tmp_path):
        """Frozen mode: home = parent of backend exe folder."""
        portable_root = tmp_path / "Scan2Text"
        backend_dir = portable_root / "backend"
        backend_dir.mkdir(parents=True)
        fake_exe = backend_dir / "scan2text-backend.exe"
        original = os.environ.get("SCAN2TEXT_HOME")
        try:
            os.environ.pop("SCAN2TEXT_HOME", None)
            with patch.object(sys, "frozen", True, create=True), \
                 patch.object(sys, "executable", str(fake_exe), create=True):
                svc = PathService()
                assert svc.base_dir == portable_root
                assert svc.settings_path == portable_root / "settings" / "settings.json"
                assert svc.logs_path == portable_root / "logs"
                assert svc.output_path == portable_root / "output"
                assert svc.models_path == portable_root / "models"
                assert svc.feedback_path == portable_root / "feedback"
        finally:
            if original is None:
                os.environ.pop("SCAN2TEXT_HOME", None)
            else:
                os.environ["SCAN2TEXT_HOME"] = original

    def test_frozen_settings_not_under_backend(self, tmp_path):
        """Frozen: settings_path must be at portable root, not inside backend/."""
        portable_root = tmp_path / "Scan2Text"
        backend_dir = portable_root / "backend"
        backend_dir.mkdir(parents=True)
        fake_exe = backend_dir / "scan2text-backend.exe"
        original = os.environ.get("SCAN2TEXT_HOME")
        try:
            os.environ.pop("SCAN2TEXT_HOME", None)
            with patch.object(sys, "frozen", True, create=True), \
                 patch.object(sys, "executable", str(fake_exe), create=True):
                svc = PathService()
                # settings_path must be at portable root
                assert svc.settings_path == portable_root / "settings" / "settings.json"
                # Must NOT be under backend/
                assert backend_dir not in svc.settings_path.resolve().parents
        finally:
            if original is None:
                os.environ.pop("SCAN2TEXT_HOME", None)
            else:
                os.environ["SCAN2TEXT_HOME"] = original


class TestFrozenModelsMissing:
    """Bug-target tests: frozen mode without models/ directory.

    The known bug: app_root may resolve to exe_dir instead of portable root
    when models/ is absent. These tests must fail RED if the bug exists.
    """

    def test_frozen_home_resolves_portable_root_when_models_present(self, tmp_path):
        """Frozen: home = portable root when models/ is present."""
        portable_root = tmp_path / "Scan2Text"
        backend_dir = portable_root / "backend"
        backend_dir.mkdir(parents=True)
        (portable_root / "models").mkdir()
        (portable_root / "models" / "vlm.gguf").write_bytes(b"model")

        fake_exe = backend_dir / "scan2text-backend.exe"
        original = os.environ.get("SCAN2TEXT_HOME")
        try:
            os.environ.pop("SCAN2TEXT_HOME", None)
            with patch.object(sys, "frozen", True, create=True), \
                 patch.object(sys, "executable", str(fake_exe), create=True):
                svc = PathService()
                assert svc.base_dir == portable_root
                assert svc.app_root == portable_root
                assert svc.models_path == portable_root / "models"
        finally:
            if original is None:
                os.environ.pop("SCAN2TEXT_HOME", None)
            else:
                os.environ["SCAN2TEXT_HOME"] = original

    def test_frozen_home_resolves_portable_root_when_models_missing(self, tmp_path):
        """Frozen: home = portable root even when models/ is absent.

        BUG TARGET: When models/ is missing, app_root may incorrectly
        resolve to exe_dir instead of portable root.
        """
        portable_root = tmp_path / "Scan2Text"
        backend_dir = portable_root / "backend"
        backend_dir.mkdir(parents=True)
        # Intentionally NO models/ directory

        fake_exe = backend_dir / "scan2text-backend.exe"
        original = os.environ.get("SCAN2TEXT_HOME")
        try:
            os.environ.pop("SCAN2TEXT_HOME", None)
            with patch.object(sys, "frozen", True, create=True), \
                 patch.object(sys, "executable", str(fake_exe), create=True):
                svc = PathService()
                # BUG TARGET: app_root must be portable root, NOT exe_dir
                assert svc.app_root == portable_root, (
                    f"app_root = {svc.app_root}, expected {portable_root}"
                )
                assert svc.base_dir == portable_root
        finally:
            if original is None:
                os.environ.pop("SCAN2TEXT_HOME", None)
            else:
                os.environ["SCAN2TEXT_HOME"] = original

    def test_frozen_app_root_is_portable_root_when_models_missing(self, tmp_path):
        """Frozen: app_root specifically must be portable root without models/.

        Separate test to isolate the app_root bug.
        This test MUST fail RED if the known bug exists.
        """
        portable_root = tmp_path / "PortableApp"
        backend_dir = portable_root / "backend"
        backend_dir.mkdir(parents=True)
        # Intentionally NO models/

        fake_exe = backend_dir / "scan2text-backend.exe"
        original = os.environ.get("SCAN2TEXT_HOME")
        try:
            os.environ.pop("SCAN2TEXT_HOME", None)
            with patch.object(sys, "frozen", True, create=True), \
                 patch.object(sys, "executable", str(fake_exe), create=True):
                svc = PathService()
                # This test MUST fail RED if the known bug exists
                assert svc.app_root == portable_root, (
                    f"KNOWN BUG: app_root = {svc.app_root} (exe_dir), "
                    f"expected {portable_root} (portable root)"
                )
        finally:
            if original is None:
                os.environ.pop("SCAN2TEXT_HOME", None)
            else:
                os.environ["SCAN2TEXT_HOME"] = original
