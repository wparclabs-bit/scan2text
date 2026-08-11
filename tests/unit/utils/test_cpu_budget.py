"""Tests for CPU budget auto-calculation (ADR-007 Decision 2)."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from scan2text.utils.cpu_budget import calculate_auto_threads


class TestCalculateAutoThreads:
    def test_explicit_threads_override(self):
        """Explicit cpu_threads > 0 is returned unchanged."""
        assert calculate_auto_threads(4) == 4
        assert calculate_auto_threads(8) == 8
        assert calculate_auto_threads(1) == 1

    @patch("scan2text.utils.cpu_budget.os.cpu_count", return_value=8)
    def test_auto_8_cores(self, mock_cpu_count):
        """8 logical cores -> floor(8 * 0.6) = 4 threads."""
        assert calculate_auto_threads(0) == 4

    @patch("scan2text.utils.cpu_budget.os.cpu_count", return_value=6)
    def test_auto_6_cores(self, mock_cpu_count):
        """6 logical cores -> floor(6 * 0.6) = 3 threads."""
        assert calculate_auto_threads(0) == 3

    @patch("scan2text.utils.cpu_budget.os.cpu_count", return_value=4)
    def test_auto_4_cores(self, mock_cpu_count):
        """4 logical cores -> floor(4 * 0.6) = 2 threads."""
        assert calculate_auto_threads(0) == 2

    @patch("scan2text.utils.cpu_budget.os.cpu_count", return_value=2)
    def test_auto_2_cores(self, mock_cpu_count):
        """2 logical cores -> floor(2 * 0.6) = 1 thread (min 1)."""
        assert calculate_auto_threads(0) == 1

    @patch("scan2text.utils.cpu_budget.os.cpu_count", return_value=1)
    def test_auto_1_core(self, mock_cpu_count):
        """1 logical core -> floor(1 * 0.6) = 0 -> clamped to 1."""
        assert calculate_auto_threads(0) == 1

    @patch("scan2text.utils.cpu_budget.os.cpu_count", return_value=None)
    def test_auto_none_cores(self, mock_cpu_count):
        """os.cpu_count() returns None -> default to 1."""
        assert calculate_auto_threads(0) == 1
