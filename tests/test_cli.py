"""Tests for cli.py — production entry point with multiprocessing bootstrap."""

from __future__ import annotations

import inspect
from pathlib import Path


class TestCliFreezeSupport:
    def test_freeze_support_import_exists(self):
        """The cli module must import multiprocessing (not just use it implicitly)."""
        import scan2text.cli as cli_module
        assert hasattr(cli_module, "multiprocessing")

    def test_freeze_support_called_in_main_block(self):
        """multiprocessing.freeze_support() must be called in the __main__ block
        to prevent deadlocks in PyInstaller frozen builds on Windows.

        Verified by reading the compiled source AST for the __main__ guard.
        """
        cli_path = Path(__file__).parent.parent / "src" / "scan2text" / "cli.py"
        source = cli_path.read_text(encoding="utf-8")

        # Must contain the import
        assert "import multiprocessing" in source

        # Must call freeze_support() inside the __main__ block, before main()
        lines = source.splitlines()
        main_block_started = False
        freeze_support_seen = False
        main_seen = False

        for line in lines:
            stripped = line.strip()
            if stripped.startswith('if __name__ == "__main__"'):
                main_block_started = True
                continue
            if main_block_started:
                if stripped.startswith("multiprocessing.freeze_support()"):
                    freeze_support_seen = True
                    continue
                if stripped.startswith("main()"):
                    main_seen = True
                    continue
                # Once we've seen main(), stop
                if main_seen:
                    break
                # Any other statement before freeze_support or main breaks ordering
                if freeze_support_seen and main_seen:
                    break

        assert freeze_support_seen, "multiprocessing.freeze_support() not found in __main__ block"
        assert main_seen, "main() not found in __main__ block"
        # freeze_support must appear before main()
        assert lines.index(
            next(l for l in lines if "multiprocessing.freeze_support()" in l)
        ) < lines.index(
            next(l for l in lines if l.strip() == "main()")
        ), "freeze_support() must be called before main()"
