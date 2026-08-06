# Slice 6.5 — Persistent Worker & Auto-Docs

**Date:** 2026-08-04  
**Slice:** 6.5  
**Status:** ✅ Complete  

---

## Summary

Refactored `VlmOcrAdapter` from a **thread/process-per-image** model to a **persistent single-worker** architecture using multiprocessing queues and `psutil` process priority management.

---

## The Persistent Worker Pattern

### Before (Slice 6.x)
Each call to `.ocr(image_path)` spawned a brand-new `multiprocessing.Process`, loaded the GGUF model into memory, ran inference, then terminated the process. This meant:
- Model reload on every image
- High CPU/memory overhead
- No reuse of the loaded VLM context

### After (Slice 6.5)
A single worker process is spawned **once** during `VlmOcrAdapter.__init__()`. It runs an infinite `while True` loop, pulling tasks from an `input_queue` and pushing results to an `output_queue`:

```python
def _vlm_worker(model_path: str, input_queue: Queue, output_queue: Queue) -> None:
    from llama_cpp import Llama
    llm = Llama(model_path=model_path, n_ctx=4096, verbose=False)
    while True:
        task = input_queue.get()
        if task.get("action") == "ocr":
            # ... run inference ...
            output_queue.put(text)
```

The adapter stores `_input_queue` and `_output_queue` as instance attributes. Every subsequent `.ocr()` call simply puts a dict into the input queue and blocks on `output_queue.get(timeout=180)`.

---

## psutil Process Priority

On Windows, the worker process is throttled so it doesn't starve the UI thread:

```python
import psutil
psutil.Process(self._worker_process.pid).nice(psutil.BELOW_NORMAL_PRIORITY_CLASS)
```

This sets the worker's CPU priority to `BELOW_NORMAL`, ensuring background OCR work doesn't interfere with foreground interaction.

---

## 180-Second Timeout Handling

The `.ocr()` method uses `queue.Empty` exception handling — **not** process termination:

```python
try:
    return self._output_queue.get(timeout=_OCR_TIMEOUT_SECONDS)
except queue.Empty:
    logger.warning("OCR_TIMEOUT: ...")
    return {"error": "OCR_TIMEOUT", "message": "...", "image_path": image_path}
```

Key difference from the old approach:
- **Old:** `process.join(timeout=180)` → if alive, `process.terminate()` → kills the worker
- **New:** `queue.Empty` caught → error dict returned → **worker stays alive** for the next call

This means a slow/hung worker still serves future requests; only the individual timed-out request returns an error.

---

## Transition Summary

| Aspect | Before (Slice 6.x) | After (Slice 6.5) |
|---|---|---|
| Worker lifecycle | Spawned per-image | Spawned once at init |
| Model loading | Every call | Once at worker start |
| Concurrency | Sequential (one process at a time) | Queued sequential (single worker) |
| Timeout behavior | Terminates worker process | Returns error dict, worker lives on |
| CPU priority | Default | `BELOW_NORMAL` via psutil |
| Queue mechanism | Single result queue | Dedicated input + output queues |

---

## Passing Tests

All 85 tests pass (`python -m pytest -q`). New tests added in this slice:

1. **`TestVlmOcrPersistentWorkerSpawn::test_spawns_worker_once_and_sets_priority`**  
   Verifies that `VlmOcrAdapter.__init__()` spawns the worker process exactly once and calls `psutil.Process(pid).nice(BELOW_NORMAL_PRIORITY_CLASS)`.

2. **`TestVlmOcrPersistentWorkerQueues::test_multiple_ocr_calls_use_same_worker_queues`**  
   Verifies that two consecutive `.ocr()` calls reuse the same `_input_queue` and `_output_queue` without spawning additional processes.

3. **`TestVlmOcrTimeoutHandling::test_timeout_returns_error_dict_without_killing_worker`**  
   Verifies that when `output_queue.get(timeout=180)` raises `queue.Empty`, the adapter returns an `OCR_TIMEOUT` error dict and does **not** call `terminate()` or `join()` on the worker process.

---

## New Tech Stack

- **`llama-cpp-python>=0.3.7,<0.4`** — Local VLM inference engine (already present, now used by persistent worker)
- **`psutil>=6.0`** — Cross-platform process and system monitoring utility (new dependency for CPU priority management)

---

## Files Changed

| File | Change |
|---|---|
| `pyproject.toml` | Added `psutil>=6.0` to dependencies |
| `src/scan2text/adapters/vlm_ocr.py` | Refactored to persistent worker pattern with queues + psutil |
| `tests/test_vlm_ocr.py` | Rewrote tests for persistent worker, queue-based communication, and non-lethal timeout |
