"""S11-FIX48: Noise filter — drop runs of 4+ consecutive bare-integer lines.

The OCR engine sometimes emits a vertical list of page numbers or indices
(e.g. "1\n2\n3\n…\n16") that adds no semantic value. This filter removes
maximal runs of consecutive bare-integer lines while preserving everything
else: mixed text, non-consecutive numbers, short runs, and product codes.
"""

from __future__ import annotations

import pytest

from scan2text.services.postprocess_service import filter_noise_lines


class TestFilterNoiseLines:
    """Seam: filter_noise_lines(lines) → list[str]."""

    def test_keeps_non_integer_line(self):
        """A product code like 'GA-2100-1A1DR' must survive."""
        lines = ["GA-2100-1A1DR", "1", "2", "3", "4", "5"]
        result = filter_noise_lines(lines)
        assert "GA-2100-1A1DR" in result
        # The consecutive run 1..5 (5 lines >= 4) should be dropped
        assert "1" not in result
        assert "5" not in result

    def test_drops_consecutive_run_of_4(self):
        """Exactly 4 consecutive bare integers → dropped."""
        lines = ["before", "10", "11", "12", "13", "after"]
        result = filter_noise_lines(lines)
        assert result == ["before", "after"]

    def test_drops_consecutive_run_of_16(self):
        """16 consecutive bare integers → dropped."""
        lines = ["header"] + [str(i) for i in range(1, 17)] + ["footer"]
        result = filter_noise_lines(lines)
        assert result == ["header", "footer"]

    def test_keeps_non_consecutive_numbers(self):
        """[10, 20, 30] — not consecutive → kept."""
        lines = ["10", "20", "30"]
        result = filter_noise_lines(lines)
        assert result == ["10", "20", "30"]

    def test_keeps_numbered_list(self):
        """['1. Hello', '2. World'] — not bare integers → kept."""
        lines = ["1. Hello", "2. World"]
        result = filter_noise_lines(lines)
        assert result == ["1. Hello", "2. World"]

    def test_keeps_normal_paragraph(self):
        """Normal prose is untouched."""
        lines = ["Hello world", "This is a test.", "Done."]
        result = filter_noise_lines(lines)
        assert result == lines

    def test_keeps_run_of_3(self):
        """Only 3 consecutive integers — below threshold → kept."""
        lines = ["1", "2", "3"]
        result = filter_noise_lines(lines)
        assert result == ["1", "2", "3"]

    def test_keeps_run_of_4_with_leading_non_int(self):
        """Run starts after a non-int; the int run is still dropped."""
        lines = ["title", "1", "2", "3", "4", "content"]
        result = filter_noise_lines(lines)
        assert result == ["title", "content"]

    def test_multiple_runs_dropped_independently(self):
        """Two separate runs of 4+ consecutive ints, both dropped."""
        lines = ["a", "1", "2", "3", "4", "b", "10", "11", "12", "13", "c"]
        result = filter_noise_lines(lines)
        assert result == ["a", "b", "c"]

    def test_empty_input(self):
        assert filter_noise_lines([]) == []

    def test_all_noise(self):
        lines = ["1", "2", "3", "4", "5"]
        result = filter_noise_lines(lines)
        assert result == []

    def test_mixed_bare_int_and_text_in_run(self):
        """A run broken by a non-int line resets the consecutive counter."""
        lines = ["1", "2", "3", "4", "STOP", "5", "6", "7", "8"]
        result = filter_noise_lines(lines)
        # First run: 1,2,3,4 → dropped (4 consecutive)
        # Second run: 5,6,7,8 → dropped (4 consecutive)
        assert result == ["STOP"]

    def test_bare_integer_with_whitespace(self):
        """Lines that are digits with surrounding whitespace are still bare ints."""
        lines = ["  1  ", "  2  ", "  3  ", "  4  "]
        result = filter_noise_lines(lines)
        assert result == []

    def test_negative_numbers_not_bare_int(self):
        """'-1' contains a dash → not a bare integer → kept."""
        lines = ["-1", "-2", "-3", "-4"]
        result = filter_noise_lines(lines)
        assert result == ["-1", "-2", "-3", "-4"]

    def test_float_numbers_not_bare_int(self):
        """'1.5' contains a dot → not a bare integer → kept."""
        lines = ["1.5", "2.5", "3.5", "4.5"]
        result = filter_noise_lines(lines)
        assert result == ["1.5", "2.5", "3.5", "4.5"]
