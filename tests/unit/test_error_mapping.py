from __future__ import annotations

import pytest
from scan2text.models.errors import ErrorCode, ErrorDetail, ErrorEnvelope


class TestErrorMapping:
    def test_error_envelope_serialisation(self):
        env = ErrorEnvelope(
            error=ErrorDetail(code=ErrorCode.MODEL_NOT_FOUND, message="Model not found.", details={})
        )
        data = env.model_dump()
        assert data["error"]["code"] == "MODEL_NOT_FOUND"
        assert isinstance(data["error"]["message"], str)

    def test_all_enum_values_present(self):
        expected = {
            "MODEL_NOT_FOUND",
            "MODEL_LOAD_FAILED",
            "UNSUPPORTED_FILE",
            "FILE_TOO_LARGE",
            "FILE_TOO_COMPLEX",
            "PDF_TOO_COMPLEX",
            "OCR_FAILED",
            "OUTPUT_DIR_NOT_WRITABLE",
            "SETTINGS_INVALID",
            "PARTIAL_FAILURE",
            "UPDATE_CHECK_FAILED",
            # T05 — provider failure taxonomy (D-20, D-34).
            "PROVIDER_UNAUTHORIZED",
            "PROVIDER_FORBIDDEN",
            "PROVIDER_QUOTA_EXHAUSTED",
            "RATE_LIMITED",
            "PROVIDER_SERVER_ERROR",
            "PROVIDER_TIMEOUT",
            "NETWORK_UNAVAILABLE",
            "DOCUMENT_TIMEOUT",
            "UNKNOWN_ERROR",
        }
        actual = {e.value for e in ErrorCode}
        assert expected == actual
