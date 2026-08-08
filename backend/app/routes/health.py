"""Health route: real telemetry for the BottomBar."""
from fastapi import APIRouter

from app.services.telemetry import get_health

router = APIRouter()


@router.get("/health")
def health():
    return get_health()
