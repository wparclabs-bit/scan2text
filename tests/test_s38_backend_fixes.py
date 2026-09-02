"""S38 Backend Fixes — Behavior tests for I1, I2, I3, I5.

These tests verify the four diagnosed backend issues are fixed.
Run with: $env:PYTHONPATH="src"; py -3.12 -m pytest tests/test_s38_backend_fixes.py -q --tb=line
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

# Ensure src is on path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from scan2text.services.path_service import PathService
from scan2text.services.settings_service import SettingsService, AppSettings
from scan2text.api.main import app, _task_store, _run_processing
from fastapi.testclient import TestClient


# =============================================================================
# I1: Error-code preservation — task-level error_code must surface through status
# =============================================================================

class TestI1ErrorCodePreservation:
    """I1: A task with task-level error_code FILE_TOO_COMPLEX must surface
    FILE_TOO_COMPLEX through the status response, NOT OCR_FAILED."""

    def test_task_error_code_file_too_complex_surfaces_in_status(self):
        """When a task has error_code=FILE_TOO_COMPLEX, status endpoint returns it."""
        client = TestClient(app)
        
        # Create a task with a specific error_code
        task_id = "test-task-file-too-complex"
        _task_store[task_id] = {
            "status": "failed",
            "processed": 0,
            "total": 1,
            "error_code": "FILE_TOO_COMPLEX",
            "result_markdown": None,
        }
        
        try:
            response = client.get(f"/status/{task_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["task_id"] == task_id
            assert data["status"] == "failed"
            # I1 FIX: Must preserve FILE_TOO_COMPLEX, NOT collapse to OCR_FAILED
            assert data["error_code"] == "FILE_TOO_COMPLEX", (
                f"Expected FILE_TOO_COMPLEX, got {data.get('error_code')}"
            )
        finally:
            _task_store.pop(task_id, None)

    def test_task_error_code_partial_failure_preserved(self):
        """When a task has error_code=PARTIAL_FAILURE, status endpoint returns it."""
        client = TestClient(app)
        
        task_id = "test-task-partial-failure"
        _task_store[task_id] = {
            "status": "completed",
            "processed": 1,
            "total": 2,
            "error_code": "PARTIAL_FAILURE",
            "result_markdown": "some content",
        }
        
        try:
            response = client.get(f"/status/{task_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["error_code"] == "PARTIAL_FAILURE"
        finally:
            _task_store.pop(task_id, None)

    def test_task_error_code_unknown_error_preserved(self):
        """When a task has error_code=UNKNOWN_ERROR, status endpoint returns it."""
        client = TestClient(app)
        
        task_id = "test-task-unknown-error"
        _task_store[task_id] = {
            "status": "failed",
            "processed": 0,
            "total": 1,
            "error_code": "UNKNOWN_ERROR",
            "result_markdown": None,
        }
        
        try:
            response = client.get(f"/status/{task_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["error_code"] == "UNKNOWN_ERROR"
        finally:
            _task_store.pop(task_id, None)


# =============================================================================
# I2: Portable-root split-brain — unified resolver must pick correct root
# =============================================================================

class TestI2PortableRootResolution:
    """I2: Portable root resolution must be unified and correct.
    
    Scenario: Frozen executable at root/backend/scan2text-backend.exe
    Stray directories: root/backend/models/, root/backend/logs/
    Correct root: root/ (contains models/, settings/, output/, logs/)
    """

    def test_frozen_portable_root_is_parent_of_backend_exe_folder(self, tmp_path):
        """Frozen: portable root = parent of backend executable folder."""
        root = tmp_path / "Scan2Text"
        backend_dir = root / "backend"
        backend_dir.mkdir(parents=True)
        (root / "models").mkdir()
        (root / "settings").mkdir()
        (root / "output").mkdir()
        (root / "logs").mkdir()

        exe_path = backend_dir / "scan2text-backend.exe"
        exe_path.touch()

        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(exe_path), create=True):
            ps = PathService()

            # S63a: portable root = parent of backend exe folder
            assert ps.base_dir == root
            assert ps.app_root == root
            assert ps.models_dir == root / "models"
            assert ps.settings_path == root / "settings" / "settings.json"

    def test_frozen_models_dir_uses_home(self, tmp_path):
        """Frozen: models_dir = home/models (parent of backend exe)."""
        root = tmp_path / "Scan2Text"
        backend_dir = root / "backend"
        backend_dir.mkdir(parents=True)
        (root / "models").mkdir()

        exe_path = backend_dir / "scan2text-backend.exe"
        exe_path.touch()

        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(exe_path), create=True):
            ps = PathService()
            assert ps.models_dir == root / "models"

    def test_dev_mode_uses_repo_scan2text(self, tmp_path):
        """In dev mode (not frozen), paths resolve to repo-root .scan2text, NOT cwd."""
        original_cwd = Path.cwd()
        original_home = os.environ.get("SCAN2TEXT_HOME")
        try:
            os.environ.pop("SCAN2TEXT_HOME", None)
            os.chdir(tmp_path)

            with patch.object(sys, "frozen", False, create=True):
                ps = PathService()

                # S63a: dev fallback = repo-root .scan2text, NOT cwd
                repo_root = Path(__file__).resolve().parents[1]
                expected_home = repo_root / ".scan2text"
                assert ps.base_dir == expected_home.resolve()
                assert ps.app_root == expected_home.resolve()
                assert ps.models_dir == expected_home.resolve() / "models"
                assert ps.settings_path == expected_home.resolve() / "settings" / "settings.json"
        finally:
            os.chdir(original_cwd)
            if original_home is None:
                os.environ.pop("SCAN2TEXT_HOME", None)
            else:
                os.environ["SCAN2TEXT_HOME"] = original_home


# =============================================================================
# I3: Settings default persistence — first access creates file, second reads it
# =============================================================================

class TestI3SettingsDefaultPersistence:
    """I3: First access with no settings file persists defaults to disk;
    second access reads from disk without re-entering creation path."""

    def test_first_load_creates_defaults_file(self, tmp_path, caplog):
        """First load when file missing creates defaults at settings/settings.json."""
        settings_dir = tmp_path / "settings"
        settings_dir.mkdir()
        settings_file = settings_dir / "settings.json"
        
        # Ensure file doesn't exist
        assert not settings_file.exists()
        
        # Create PathService pointing to our temp dir
        ps = PathService(base_dir=str(tmp_path))
        
        # Create SettingsService with our PathService
        svc = SettingsService(path_service=ps)
        
        # First load - should create defaults
        with caplog.at_level("INFO"):
            settings = svc.load()
        
        # File should now exist
        assert settings_file.exists(), "Settings file should be created on first load"
        
        # Should be valid JSON with defaults
        with open(settings_file) as f:
            data = json.load(f)
        assert "hide_welcome_notice" in data
        assert data["hide_welcome_notice"] is False  # default
        
        # Log should contain creation message
        creation_logs = [r for r in caplog.records if "creating defaults" in r.message.lower()]
        assert len(creation_logs) == 1, "Should log creation exactly once"

    def test_second_load_reads_from_disk_not_creation_path(self, tmp_path, caplog):
        """Second load reads from existing file, doesn't re-enter creation path."""
        settings_dir = tmp_path / "settings"
        settings_dir.mkdir()
        settings_file = settings_dir / "settings.json"
        
        # Pre-create a settings file with non-default value
        custom_settings = {"hide_welcome_notice": True}
        settings_file.write_text(json.dumps(custom_settings))
        
        ps = PathService(base_dir=str(tmp_path))
        svc = SettingsService(path_service=ps)
        
        # First load - reads from file
        with caplog.at_level("INFO"):
            settings1 = svc.load()
        
        assert settings1.hide_welcome_notice is True
        
        # Second load - should NOT log "creating defaults"
        caplog.clear()
        with caplog.at_level("INFO"):
            settings2 = svc.load()
        
        assert settings2.hide_welcome_notice is True
        
        # No creation log on second load
        creation_logs = [r for r in caplog.records if "creating defaults" in r.message.lower()]
        assert len(creation_logs) == 0, "Second load should not log creation"


if __name__ == "__main__":
    # Allow running directly for quick debugging
    pytest.main([__file__, "-v", "--tb=short"])