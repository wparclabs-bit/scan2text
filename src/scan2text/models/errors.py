from __future__ import annotations

from enum import Enum
from typing import Any, Dict

from pydantic import BaseModel


class ErrorCode(str, Enum):
    MODEL_NOT_FOUND = "MODEL_NOT_FOUND"
    MODEL_LOAD_FAILED = "MODEL_LOAD_FAILED"
    UNSUPPORTED_FILE = "UNSUPPORTED_FILE"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    FILE_TOO_COMPLEX = "FILE_TOO_COMPLEX"
    PDF_TOO_COMPLEX = "PDF_TOO_COMPLEX"
    OCR_FAILED = "OCR_FAILED"
    OUTPUT_DIR_NOT_WRITABLE = "OUTPUT_DIR_NOT_WRITABLE"
    SETTINGS_INVALID = "SETTINGS_INVALID"
    PARTIAL_FAILURE = "PARTIAL_FAILURE"
    UPDATE_CHECK_FAILED = "UPDATE_CHECK_FAILED"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"


class ErrorDetail(BaseModel):
    code: ErrorCode
    message: str
    details: Dict[str, Any] = {}


class ErrorEnvelope(BaseModel):
    error: ErrorDetail
