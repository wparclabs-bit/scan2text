"""Unit tests for PathService."""

from __future__ import annotations

import os
import tempfile
from datetime import datetime
from pathlib import Path

import pytest

from scan2text.services.path_service import PathService


class TestPathServiceBaseDir:
    def test_injected_base_dir(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            svc = PathService(base_dir=tmpdir)
            assert svc.base_dir == Path(tmpdir).resolve()

    def test_default_base_dir_is_under_cwd(self):
        svc = PathService()
        assert ".scan2text" in str(svc.base_dir)

    def test_scan2text_home_override(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            original = os.environ.get("SCAN2TEXT_HOME")
            try:
                os.environ["SCAN2TEXT_HOME"] = tmpdir
                svc = PathService()
                assert svc.base_dir == Path(tmpdir).resolve()
            finally:
                if original is None:
                    os.environ.pop("SCAN2TEXT_HOME", None)
                else:
                    os.environ["SCAN2TEXT_HOME"] = original


class TestPathServiceDirectories:
    def test_ensure_runtime_dirs_creates_expected(self, tmp_path):
        svc = PathService(base_dir=str(tmp_path))
        svc.ensure_runtime_dirs()
        for sub in ("settings", "output", "logs", "models"):
            assert (tmp_path / sub).is_dir()
        # assets_dir lives under app_root, not base_dir; not auto-created here
        assert not (tmp_path / "assets").is_dir()

    def test_settings_path(self, tmp_path):
        svc = PathService(base_dir=str(tmp_path))
        assert svc.settings_path.name == "settings.json"
        assert svc.settings_path.parent.name == "settings"

    def test_output_dir(self, tmp_path):
        svc = PathService(base_dir=str(tmp_path))
        assert svc.output_dir.name == "output"

    def test_logs_dir(self, tmp_path):
        svc = PathService(base_dir=str(tmp_path))
        assert svc.logs_dir.name == "logs"


class TestPathServiceSanitizeFilename:
    def test_removes_invalid_windows_chars(self):
        result = PathService.sanitize_filename('file <name> : "test"')
        assert "<" not in result
        assert ">" not in result
        assert ":" not in result
        assert '"' not in result

    def test_replaces_spaces_with_underscore(self):
        result = PathService.sanitize_filename("my file name")
        assert "my_file_name" == result

    def test_empty_becomes_unknown(self):
        result = PathService.sanitize_filename("")
        assert result == "unknown"

    def test_reserved_names_handled(self):
        for reserved in ("CON", "PRN", "AUX", "NUL", "COM1", "LPT1"):
            result = PathService.sanitize_filename(reserved)
            # Should not be exactly the reserved name
            assert result != reserved.upper()

    def test_control_characters_removed(self):
        result = PathService.sanitize_filename("hello\x00world")
        assert "\x00" not in result


class TestPathServiceOutputNaming:
    def test_standard_format(self, tmp_path):
        svc = PathService(base_dir=str(tmp_path))
        src = tmp_path / "doc.pdf"
        src.touch()
        path = svc.resolve_output_path(src)
        now = datetime.now()
        expected_stem = f"doc_{now.strftime('%H%M')}_{now.strftime('%Y%m%d')}"
        assert path.name == f"{expected_stem}.md"

    def test_collision_appends_2(self, tmp_path):
        svc = PathService(base_dir=str(tmp_path))
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)
        src = tmp_path / "doc.pdf"
        src.touch()
        # Pre-create the target file to force collision
        now = datetime.now()
        target_name = f"doc_{now.strftime('%H%M')}_{now.strftime('%Y%m%d')}.md"
        (tmp_path / "output" / target_name).touch()
        path = svc.resolve_output_path(src)
        assert path.name == f"doc_{now.strftime('%H%M')}_{now.strftime('%Y%m%d')}_2.md"

    def test_collision_appends_3(self, tmp_path):
        svc = PathService(base_dir=str(tmp_path))
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)
        src = tmp_path / "doc.pdf"
        src.touch()
        now = datetime.now()
        ts = f"{now.strftime('%H%M')}_{now.strftime('%Y%m%d')}"
        # Pre-create both _1 and _2 targets
        (tmp_path / "output" / f"doc_{ts}.md").touch()
        (tmp_path / "output" / f"doc_{ts}_2.md").touch()
        path = svc.resolve_output_path(src)
        assert path.name == f"doc_{ts}_3.md"

    def test_no_overwrite(self, tmp_path):
        svc = PathService(base_dir=str(tmp_path))
        (tmp_path / "output").mkdir(parents=True, exist_ok=True)
        src = tmp_path / "doc.pdf"
        src.touch()
        now = datetime.now()
        target_name = f"doc_{now.strftime('%H%M')}_{now.strftime('%Y%m%d')}.md"
        existing = tmp_path / "output" / target_name
        existing.write_text("original content", encoding="utf-8")
        path = svc.resolve_output_path(src)
        # Should have gotten the collision path, not overwritten
        assert path != existing
        assert existing.read_text(encoding="utf-8") == "original content"

    def test_empty_stem_becomes_unknown(self, tmp_path):
        svc = PathService(base_dir=str(tmp_path))
        src = tmp_path / "..."  # empty stem after sanitize
        src.touch()
        path = svc.resolve_output_path(src)
        assert path.stem.startswith("unknown_")

    def test_custom_desired_stem(self, tmp_path):
        svc = PathService(base_dir=str(tmp_path))
        src = tmp_path / "anything.png"
        src.touch()
        path = svc.resolve_output_path(src, desired_stem="my_report")
        now = datetime.now()
        expected_stem = f"my_report_{now.strftime('%H%M')}_{now.strftime('%Y%m%d')}"
        assert path.name == f"{expected_stem}.md"
