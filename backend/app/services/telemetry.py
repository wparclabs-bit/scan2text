"""Real system telemetry for GET /health. CPU-only, offline, no document data."""
from pathlib import Path

import psutil

from app.models.contracts import HealthResponse, ModelTelemetry, RamTelemetry

BACKEND_VERSION = "0.1.0"
MODEL_NAME = "GLM-OCR 0.9B"

# parents: [0] services, [1] app, [2] backend, [3] repo root
REPO_ROOT = Path(__file__).resolve().parents[3]

_worker_state = "idle"


def set_worker_state(state: str) -> None:
    """Future OCR slices flip this to 'busy' while a job runs."""
    global _worker_state
    _worker_state = state if state in ("idle", "busy") else "idle"


def _ram() -> RamTelemetry:
    vm = psutil.virtual_memory()
    return RamTelemetry(
        total_mb=int(vm.total // (1024 * 1024)),
        used_mb=int(vm.used // (1024 * 1024)),
        percent=float(vm.percent),
    )


def _model() -> ModelTelemetry:
    models_dir = REPO_ROOT / "models"
    files_present = (models_dir / "vlm.gguf").is_file() and (models_dir / "mmproj.gguf").is_file()
    return ModelTelemetry(name=MODEL_NAME, loaded=False, files_present=files_present)


def get_health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        worker=_worker_state,
        ram=_ram(),
        model=_model(),
        version=BACKEND_VERSION,
    )
