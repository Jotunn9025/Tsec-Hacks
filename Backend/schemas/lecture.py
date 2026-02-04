from pydantic import BaseModel
from typing import Optional

# Shared attributes for Lecture schemas
class LectureBase(BaseModel):
    title: str
    description: Optional[str] = None
    video_url: str
    price_per_10_mins: Optional[float] = 0.0
    duration: Optional[int] = 0

# Schema for creating a new lecture
class LectureCreate(LectureBase):
    pass

# Schema for updating an existing lecture
class LectureUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    video_url: Optional[str] = None
    price_per_10_mins: Optional[float] = None
    duration: Optional[int] = None

# Schema for returning lecture data (response)
class LectureOut(LectureBase):
    id: int
    course_id: int
    view_count: int

    class Config:
        from_attributes = True
