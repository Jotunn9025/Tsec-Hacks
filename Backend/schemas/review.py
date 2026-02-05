from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    review: Optional[str] = None

class ReviewOut(BaseModel):
    id: int
    student_id: int
    lecture_id: int
    rating: int
    review: Optional[str]
    hidden: bool
    created_at: datetime

    class Config:
        from_attributes = True
