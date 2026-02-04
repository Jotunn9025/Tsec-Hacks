from pydantic import BaseModel
from typing import List, Optional

class Rating(BaseModel):
    score: float
    username: str
    coursename: str
    lecture_name: str
    is_flagged: bool = False
    reason: Optional[str] = None  # The qualitative text, if available

class User(BaseModel):
    username: str
    account_age_days: int
    total_reviews_count: int

class Course(BaseModel):
    coursename: str
    lecture_name: str
    transcript_summary: str
    behavior_summary: str

class ReviewRequest(BaseModel):
    username: str
    coursename: str
    lecture_name: str
    score: float
    reason: str
