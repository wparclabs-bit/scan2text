"""Feedback API routes — offline feedback queue."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from scan2text.services.feedback_service import FeedbackService

router = APIRouter()


class FeedbackPayload(BaseModel):
    message: str
    contact: Optional[str] = None


class MarkSentPayload(BaseModel):
    filename: str


@router.post("/api/feedback")
def submit_feedback(payload: FeedbackPayload) -> dict:
    """Save feedback to feedback/pending/ and return the filename."""
    svc = FeedbackService()
    filename = svc.save_pending_feedback(payload.message, payload.contact)
    return {"filename": filename}


@router.get("/api/feedback/pending-count")
def get_pending_count() -> dict:
    """Return the number of pending feedback files."""
    svc = FeedbackService()
    count = svc.get_pending_count()
    return {"count": count}


@router.post("/api/feedback/mark-sent")
def mark_sent(payload: MarkSentPayload) -> dict:
    """Move a pending feedback file to feedback/sent/."""
    svc = FeedbackService()
    moved = svc.move_pending_to_sent(payload.filename)
    return {"moved": moved}
