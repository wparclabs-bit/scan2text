from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    QUEUED = "queued"
    LOADING_MODEL = "loading_model"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"
    SKIPPED = "skipped"
    WAITING = "waiting"


class TaskStatus(str, Enum):
    """The status set exposed by the task store and ``GET /status``.

    This is the canonical set shared with the frontend ``TASK_STATUSES``
    constant (D-34). The previous ``skipped`` mismatch is gone: both sides
    carry the same six values.
    """

    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    WAITING = "waiting"
    SKIPPED = "skipped"


class OCRJob(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    file_name: str
    file_path: str
    status: JobStatus = JobStatus.QUEUED
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    output_path: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
