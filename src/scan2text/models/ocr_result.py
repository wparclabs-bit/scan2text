from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class OCRPage(BaseModel):
    page_number: int
    text: str


class OCRResult(BaseModel):
    job_id: str
    source_file: str
    output_path: Optional[str] = None
    pages: List[OCRPage] = []
    full_text: str = ""
    completed_at: datetime = datetime.now()
