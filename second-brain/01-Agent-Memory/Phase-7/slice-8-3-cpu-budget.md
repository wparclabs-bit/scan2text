# Slice 8.3 — CPU Budget Auto-Calculation

Date: 2026-08-11
Phase: Phase 7
Status: COMPLETE

## What Changed

- Added `src/scan2text/utils/cpu_budget.py` with `calculate_auto_threads(cpu_threads: int) -> int`
- Integrated into `src/scan2text/adapters/vlm_ocr.py` — `VlmOcrAdapter.__init__()` now calls `calculate_auto_threads(settings.n_threads or settings.cpu_threads)` and logs the result
- Added 7 unit tests in `tests/unit/utils/test_cpu_budget.py`
- Added 2 integration tests in `tests/test_vlm_ocr.py`

## Key Decisions

- CEO approved `math.floor()` rounding DOWN (never `ceil`) — ADR-007 Decision 2
- Minimum 1 thread even on single-core systems (`max(1, ...)`)
- Only applies when `cpu_threads == 0`; explicit values (> 0) override auto-calc
- Applied to both `n_threads` and `cpu_threads` settings fields (OR'd together before passing to calculator)
- Logging added: `"Auto-calculated {n} threads for {cores} logical cores"`

## Test Coverage

- `test_explicit_threads_override`: cpu_threads=4 returns 4
- `test_auto_8_cores`: mock os.cpu_count()=8, cpu_threads=0 returns 4
- `test_auto_6_cores`: mock os.cpu_count()=6, cpu_threads=0 returns 3
- `test_auto_4_cores`: mock os.cpu_count()=4, cpu_threads=0 returns 2
- `test_auto_2_cores`: mock os.cpu_count()=2, cpu_threads=0 returns 1
- `test_auto_1_core`: mock os.cpu_count()=1, cpu_threads=0 returns 1
- `test_auto_none_cores`: mock os.cpu_count()=None, cpu_threads=0 returns 1
- `test_auto_calculation_when_cpu_threads_zero`: verifies calculate_auto_threads called with 0
- `test_explicit_threads_used_when_cpu_threads_positive`: verifies calculate_auto_threads called with explicit value

Test count: 146 → 155 (+9)

## Open Questions

None.
