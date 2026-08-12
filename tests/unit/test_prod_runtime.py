"""Unit tests for production runtime helper."""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import patch

import pytest


class TestIsFrozen:
    def test_false_in_normal_python(self):
        from scan2text.utils.prod_runtime import is_frozen
        # In normal pytest runs, sys.frozen is not set
        assert is_frozen() is False

    def test_true_when_sys_frozen_is_set(self):
        from scan2text.utils.prod_runtime import is_frozen
        with patch.object(sys, "frozen", True, create=True):
            assert is_frozen() is True


class TestFrozenExeDir:
    def test_returns_exe_parent_when_frozen(self):
        from scan2text.utils.prod_runtime import frozen_exe_dir
        fake_exe = Path("C:/apps/scan2text-backend/scan2text-backend.exe")
        with patch.object(sys, "frozen", True, create=True), \
             patch.object(sys, "executable", str(fake_exe), create=True):
            result = frozen_exe_dir()
            assert result == Path("C:/apps/scan2text-backend")

    def test_raises_when_not_frozen(self):
        from scan2text.utils.prod_runtime import frozen_exe_dir
        with patch.object(sys, "frozen", False, create=True):
            with pytest.raises(RuntimeError, match="requires a frozen executable"):
                frozen_exe_dir()


class TestGetPort:
    def test_frozen_port_is_47351(self):
        from scan2text.utils.prod_runtime import get_port
        with patch.object(sys, "frozen", True, create=True):
            assert get_port() == 47351

    def test_non_frozen_port_is_8000(self):
        from scan2text.utils.prod_runtime import get_port
        with patch.object(sys, "frozen", False, create=True):
            assert get_port() == 8000


class TestGetHost:
    def test_always_127_0_0_1(self):
        from scan2text.utils.prod_runtime import get_host
        assert get_host() == "127.0.0.1"
