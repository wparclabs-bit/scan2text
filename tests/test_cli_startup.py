"""Tests for cli.py startup sequence — setup_logging and ensure_runtime_dirs must run before uvicorn."""

from __future__ import annotations

from unittest.mock import MagicMock, patch


class TestCliStartupSequence:
    """Verify that cli.main() initializes logging and runtime dirs before starting the server."""

    def test_main_calls_setup_logging_once(self):
        """cli.main() must invoke setup_logging() exactly once before boot."""
        # Import boot_guard module first so it is loadable in the namespace package.
        import scan2text.boot_guard  # noqa: F401

        mock_setup_logging = MagicMock(return_value=MagicMock())
        mock_get_paths = MagicMock()
        mock_get_paths_instance = MagicMock()
        mock_get_paths_instance.ensure_runtime_dirs = MagicMock()
        mock_get_paths.return_value = mock_get_paths_instance
        mock_get_host = MagicMock(return_value="127.0.0.1")
        mock_get_port = MagicMock(return_value=47351)
        mock_boot_guard = MagicMock()
        mock_uvicorn = MagicMock()

        with patch("scan2text.cli.setup_logging", mock_setup_logging), \
             patch("scan2text.cli.get_paths", mock_get_paths), \
             patch("scan2text.cli.get_host", mock_get_host), \
             patch("scan2text.cli.get_port", mock_get_port), \
             patch.object(scan2text.boot_guard, "boot_guard", mock_boot_guard), \
             patch("scan2text.cli.uvicorn", mock_uvicorn):
            from scan2text.cli import main
            main()

        mock_setup_logging.assert_called_once_with()
        mock_get_paths_instance.ensure_runtime_dirs.assert_called_once_with()
        # uvicorn.run must still be called (after setup)
        mock_uvicorn.run.assert_called_once()

    def test_main_calls_ensure_runtime_dirs_once(self):
        """cli.main() must invoke ensure_runtime_dirs() exactly once."""
        import scan2text.boot_guard  # noqa: F401

        mock_setup_logging = MagicMock(return_value=MagicMock())
        mock_get_paths = MagicMock()
        mock_get_paths_instance = MagicMock()
        mock_get_paths_instance.ensure_runtime_dirs = MagicMock()
        mock_get_paths.return_value = mock_get_paths_instance
        mock_get_host = MagicMock(return_value="127.0.0.1")
        mock_get_port = MagicMock(return_value=47351)
        mock_boot_guard = MagicMock()
        mock_uvicorn = MagicMock()

        with patch("scan2text.cli.setup_logging", mock_setup_logging), \
             patch("scan2text.cli.get_paths", mock_get_paths), \
             patch("scan2text.cli.get_host", mock_get_host), \
             patch("scan2text.cli.get_port", mock_get_port), \
             patch.object(scan2text.boot_guard, "boot_guard", mock_boot_guard), \
             patch("scan2text.cli.uvicorn", mock_uvicorn):
            from scan2text.cli import main
            main()

        mock_get_paths_instance.ensure_runtime_dirs.assert_called_once_with()
        # setup_logging must also have been called
        mock_setup_logging.assert_called_once_with()
