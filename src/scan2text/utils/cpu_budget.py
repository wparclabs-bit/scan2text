"""CPU budget auto-calculation utility (ADR-007 Decision 2).

When cpu_threads=0 in settings, calculate floor(logical_cores * 0.6) with a
minimum of 1 thread. Explicit values (> 0) are returned unchanged.
"""

from __future__ import annotations

import math
import os


def calculate_auto_threads(cpu_threads: int) -> int:
    """Return the thread count to use for the OCR worker.

    - cpu_threads > 0: explicit override, returned as-is.
    - cpu_threads == 0: auto-calculate floor(os.cpu_count() * 0.6), minimum 1.
    - os.cpu_count() returns None: default to 1.
    """
    if cpu_threads > 0:
        return cpu_threads
    cores = os.cpu_count() or 1
    return max(1, math.floor(cores * 0.6))
