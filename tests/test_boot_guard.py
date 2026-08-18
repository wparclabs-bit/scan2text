"""Boot guard tests — port ownership check before Uvicorn bind.

Scenario matrix for boot_guard(port):
  1. Port free → proceed (return None)
  2. Port held by scan2text-backend.exe → kill it, proceed (return None)
  3. Port held by foreign exe → SystemExit(non-zero)
"""

from __future__ import annotations

import sys
from unittest.mock import MagicMock, patch

import pytest


def _make_proc(exe_name: str, pid: int = 1234) -> MagicMock:
    p = MagicMock()
    p.pid = pid
    p.exe.return_value = exe_name
    p.name.return_value = exe_name
    p.status.return_value = "running"
    return p


FAKE_BACKEND_EXE = r"C:\Scan2Text\backend\scan2text-backend.exe"
FAKE_FOREIGN_EXE = r"C:\Windows\System32\notepad.exe"


class TestBootGuard:
    """Pure function boot_guard(port) using mocked psutil."""

    @patch("scan2text.boot_guard.psutil")
    def test_port_free_proceeds(self, mock_psutil):
        """Case 1: nobody holds the port → proceed."""
        mock_psutil.process_iter.return_value = []
        mock_psutil.net_connections.return_value = []
        from scan2text.boot_guard import boot_guard

        result = boot_guard(47351)
        assert result is None

    @patch("scan2text.boot_guard.psutil")
    def test_port_held_by_self_kills_and_proceeds(self, mock_psutil):
        """Case 2: stale scan2text-backend.exe holds the port → kill it, proceed."""
        zombie = _make_proc(FAKE_BACKEND_EXE, pid=9999)
        mock_psutil.process_iter.return_value = [zombie]
        mock_psutil.net_connections.return_value = []
        # The kill loop calls psutil.Process(pid) — make it return the same mock.
        mock_psutil.Process.return_value = zombie

        from scan2text.boot_guard import boot_guard

        result = boot_guard(47351)
        assert result is None
        zombie.kill.assert_called_once()
        zombie.wait.assert_called_once()

    @patch("scan2text.boot_guard.psutil")
    def test_port_held_by_foreign_exe_exits_nonzero(self, mock_psutil):
        """Case 3: foreign process holds the port → loud error + SystemExit."""
        foreign = _make_proc(FAKE_FOREIGN_EXE, pid=7777)
        mock_psutil.process_iter.return_value = [foreign]

        # Simulate net_connections showing foreign process listening on port.
        conn = MagicMock()
        conn.laddr.port = 47351
        conn.status = "LISTEN"
        conn.pid = 7777
        mock_psutil.net_connections.return_value = [conn]

        from scan2text.boot_guard import boot_guard

        with pytest.raises(SystemExit) as exc_info:
            boot_guard(47351)
        assert exc_info.value.code != 0
        foreign.kill.assert_not_called()

    @patch("scan2text.boot_guard.psutil")
    def test_port_held_by_self_then_kill_fails_still_proceeds(self, mock_psutil):
        """Edge case: kill raises — should still proceed (port will be reclaimed)."""
        zombie = _make_proc(FAKE_BACKEND_EXE, pid=9998)
        zombie.kill.side_effect = Exception("permission denied")
        mock_psutil.process_iter.return_value = [zombie]
        mock_psutil.net_connections.return_value = []

        from scan2text.boot_guard import boot_guard

        # Should not raise — proceeds even if kill fails
        result = boot_guard(47351)
        assert result is None
