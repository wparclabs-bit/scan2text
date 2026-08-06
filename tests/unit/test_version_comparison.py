from __future__ import annotations

import pytest


class TestVersionComparison:
    """Verify MVP version comparison logic."""

    def test_newer(self):
        from scan2text.services.update_service import UpdateService
        assert UpdateService._newer("0.2.0", "0.1.0") is True

    def test_same_version(self):
        from scan2text.services.update_service import UpdateService
        assert UpdateService._newer("0.1.0", "0.1.0") is False

    def test_older(self):
        from scan2text.services.update_service import UpdateService
        assert UpdateService._newer("0.0.9", "0.1.0") is False
