"""The consent-gated Cloud conversion route.

``POST /api/cloud/convert`` converts one over-threshold PDF through the Cloud
engine. The route refuses before any provider call when consent was not granted.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from scan2text.cloud.conversion import (
    CloudConsentRequiredError,
    CloudConversionService,
    CloudFileTooLargeError,
)
from scan2text.cloud.provider import OpenAICompatibleProviderClient


class CloudConvertRequest(BaseModel):
    """One absolute file path and the caller's explicit consent decision."""

    file_path: str = Field(min_length=1, max_length=4096)
    consent_granted: bool = False


def build_production_conversion_service(app) -> CloudConversionService:
    """Wire the conversion service from the same dependencies as the Cloud service."""
    profile_service = getattr(app.state, "cloud_profile_service", None)
    credentials = getattr(app.state, "cloud_credential_store", None)
    path_service = getattr(app.state, "path_service", None)
    if profile_service is None or path_service is None:
        raise HTTPException(status_code=503, detail="CLOUD_SERVICE_UNAVAILABLE")

    def client_factory(profile, secret):
        return OpenAICompatibleProviderClient(
            base_url=profile.base_url,
            model_id=profile.model_id,
            api_key=secret,
            recipe=profile.recipe,
        )

    return CloudConversionService(
        profile_loader=profile_service.load,
        client_factory=client_factory,
        credential_reader=(credentials.read if credentials is not None else (lambda: None)),
        path_service=path_service,
    )


def get_conversion_service(request: Request) -> CloudConversionService:
    """Resolve the service: the registered conversion service first, else T03's.

    ``app.state.cloud_service`` is the T03 CloudService. When a deployment has
    already wired it as a conversion service (tests, or a future composition
    root) it is reused instead of building a second, network-bound client.
    """
    for attribute in ("cloud_conversion_service", "cloud_service"):
        candidate = getattr(request.app.state, attribute, None)
        if isinstance(candidate, CloudConversionService):
            return candidate
    return build_production_conversion_service(request.app)


def build_convert_router() -> APIRouter:
    """Build the conversion router. The queue and the app mount the same paths."""
    router = APIRouter()

    @router.post("/api/cloud/convert")
    def convert_file(payload: CloudConvertRequest, request: Request) -> dict:
        if not payload.consent_granted:
            # D-12/T03: the gate governs the send; nothing leaves the machine.
            raise HTTPException(status_code=409, detail="CLOUD_CONSENT_REQUIRED")
        service = get_conversion_service(request)
        try:
            result = service.convert(
                Path(payload.file_path), consent_granted=payload.consent_granted
            )
        except CloudConsentRequiredError as exc:
            raise HTTPException(status_code=409, detail="CLOUD_CONSENT_REQUIRED") from exc
        except CloudFileTooLargeError as exc:
            raise HTTPException(status_code=413, detail=str(exc)) from exc
        except FileNotFoundError as exc:
            raise HTTPException(status_code=422, detail="FILE_NOT_FOUND") from exc
        except Exception as exc:  # noqa: BLE001 - the route owns the HTTP mapping
            raise HTTPException(status_code=502, detail="CLOUD_CONVERSION_FAILED") from exc
        metadata = result.metadata
        return {
            "output_path": str(result.output_path) if result.output_path else None,
            "engine": metadata.get("engine"),
            "model": metadata.get("model"),
            "prompt_version": metadata.get("prompt_version"),
            "pages": metadata.get("pages"),
            "generated_at": metadata.get("generated_at"),
            "awaiting_geometry": list(result.awaiting_geometry),
        }

    return router


router = build_convert_router()
