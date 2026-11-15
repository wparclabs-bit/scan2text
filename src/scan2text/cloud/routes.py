"""Local API for Cloud Profiles, credential actions, and capability tests."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, SecretStr

from scan2text.cloud.models import CloudProfile
from scan2text.cloud.route_decision import CEILING_BYTES, LOCAL_THRESHOLD_BYTES  # noqa: F401
from scan2text.cloud.provider import (
    ProviderAuthenticationError,
    ProviderError,
    ProviderTimeout,
)
from scan2text.cloud.service import (
    CloudKeyRequiredError,
    CloudProfileError,
    CloudService,
)


router = APIRouter()


class CloudProfileUpdate(BaseModel):
    base_url: str = Field(min_length=1, max_length=2048)
    model_id: str = Field(min_length=1, max_length=512)
    enabled: bool = False
    api_key: SecretStr | None = None


def get_cloud_service(request: Request) -> CloudService:
    return request.app.state.cloud_service


@router.get("/api/cloud/profile", response_model=CloudProfile)
def get_profile(request: Request) -> CloudProfile:
    service = get_cloud_service(request)
    try:
        return service.get_profile()
    except CloudProfileError as exc:
        raise HTTPException(status_code=500, detail="CLOUD_PROFILE_INVALID") from exc


@router.put("/api/cloud/profile", response_model=CloudProfile)
def save_profile(payload: CloudProfileUpdate, request: Request) -> CloudProfile:
    service = get_cloud_service(request)
    api_key = payload.api_key.get_secret_value() if payload.api_key else None
    try:
        return service.save_profile(
            base_url=payload.base_url,
            model_id=payload.model_id,
            enabled=payload.enabled,
            api_key=api_key,
        )
    except CloudProfileError as exc:
        raise HTTPException(status_code=500, detail="CLOUD_PROFILE_INVALID") from exc


@router.delete("/api/cloud/key", response_model=CloudProfile)
def delete_key(request: Request) -> CloudProfile:
    service = get_cloud_service(request)
    try:
        return service.delete_key()
    except CloudProfileError as exc:
        raise HTTPException(status_code=500, detail="CLOUD_PROFILE_INVALID") from exc


@router.post("/api/cloud/test-connection")
def test_connection(request: Request) -> dict:
    service = get_cloud_service(request)
    try:
        result = service.test_connection()
    except CloudKeyRequiredError as exc:
        raise HTTPException(status_code=409, detail="CLOUD_KEY_REQUIRED") from exc
    except ProviderAuthenticationError as exc:
        raise HTTPException(status_code=401, detail="CLOUD_KEY_REJECTED") from exc
    except ProviderTimeout as exc:
        raise HTTPException(status_code=408, detail="CLOUD_PROVIDER_TIMEOUT") from exc
    except ProviderError as exc:
        raise HTTPException(status_code=502, detail="CLOUD_PROVIDER_UNAVAILABLE") from exc
    return {
        "model_id": result.model_id,
        "can_read_images": result.can_read_images,
        "latency_ms": result.latency_ms,
        "estimated_cost_usd": result.estimated_cost_usd,
    }
