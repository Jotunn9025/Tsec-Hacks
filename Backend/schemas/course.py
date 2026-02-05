from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime

# Shared attributes for Course schemas
class CourseBase(BaseModel):
    title: str
    description: str
    category: str
    image_url: Optional[str] = None

# Schema for creating a new course
class CourseCreate(CourseBase):
    pass

# Schema for updating an existing course (all fields are optional)
class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None

# Schema for returning course data (response)
class CourseOut(CourseBase):
    id: int
    instructor_profile_id: int
    average_rating: float = 0.0
    review_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
