from __future__ import annotations

from pydantic import BaseModel, Field


class AppSettings(BaseModel):
    # Core (PRD 15)
    output_dir: str = ""
    max_pdf_pages: int = Field(default=20, ge=1)
    cpu_threads: int = Field(default=0, ge=0)
    check_updates_on_startup: bool = True
    language: str = "auto"
    theme: str = "dark"

    # Engine (JSON-only advanced knobs, ADR-005; no UI in MVP)
    model_path: str = ""
    mmproj_path: str = ""
    n_ctx: int = Field(default=8192, ge=256)
    n_threads: int = Field(default=0, ge=0)
    ocr_timeout_seconds: int = Field(default=600, ge=10)
    worker_priority: str = "below_normal"
